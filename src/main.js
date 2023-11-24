// @flow

import { renderer } from "@b9g/crank/dom";
import { html, closestSide, hasTagName } from "./utils.js";
import { Vector2 } from "./math/vector2.js";
import { Box2 } from "./math/box2.js";
import {
  spiralRadius,
  spiralInitial,
  spiralAddend,
  rainbowBorderThickness,
} from "./constants.js";
import { makeGraph } from "./models/graph.js";
import { setShapeValues } from "./models/shape.js";
import { setNodeValues } from "./models/node.js";
import { getColorFromWorldCoord, getColorFromScreenCoord } from "./color.js";
import { makeDraggable } from "./drag.js";
import { shapesMapToComponents } from "./shapes/index.js";
import { styles } from "./styles.js";
import { tapAnimationMs } from "./shapes/tap.js";
import { RainbowBorder, getRainbowFocus } from "./rainbow-border.js";

/*::
import type { Node, NodeInitial } from "./models/node";
import type { Shape, ShapeInitial } from "./models/shape";
*/

function* Svg(
  /*:: this:  any, */
  {
    nodes: initNodes = [],
    shapes: initShapes = [],
  } /*: { nodes: NodeInitial[], shapes: ShapeInitial[] } */
) {
  let graph = makeGraph({ nodes: initNodes, shapes: initShapes });
  window.graph = graph;

  let mostRecentlyActiveNodeId;

  const winSize = new Vector2(window.innerWidth, window.innerHeight);
  const zoom = {
    scale: 1.0,
    world: new Box2(new Vector2(0, 0), new Vector2().copy(winSize)),
    view: new Box2(new Vector2(0, 0), new Vector2().copy(winSize)),
  };

  let controlledNodeId;
  let selectedLineShapeId;

  let rainbowFocus;

  const getScrollSize = () => {
    const scrollWidth = document.documentElement?.scrollWidth ?? 0;
    const scrollHeight = document.documentElement?.scrollHeight ?? 0;
    return new Vector2(scrollWidth, scrollHeight);
  };

  const resizeWithoutRefresh = () => {
    winSize.set(window.innerWidth, window.innerHeight);
  };
  resizeWithoutRefresh();

  const resize = () => {
    resizeWithoutRefresh();
    this.refresh();
  };

  /** Event Listeners */

  window.addEventListener("resize", resize);

  window.addEventListener("mouseout", () => {
    rainbowFocus = undefined;
    this.refresh();
  });

  this.addEventListener("controllingNode", ({ detail: { nodeId } }) => {
    controlledNodeId = nodeId;
    unselectSelectedLine();
    this.refresh();
  });

  this.addEventListener("nodeActive", ({ detail: { nodeId } }) => {
    mostRecentlyActiveNodeId = nodeId;
  });

  this.addEventListener("nodeMoved", ({ detail: { nodeId, x, y } }) => {
    const node = graph.getNode(nodeId);
    node.x = x;
    node.y = y;
    this.refresh();
  });

  this.addEventListener("destroyNode", ({ detail: { nodeId } }) => {
    if (graph.removeNodeWithDependents(nodeId)) {
      this.refresh();
    }
  });

  this.addEventListener("destroyShape", ({ detail: { shapeId } }) => {
    const shape = graph.getShape(shapeId);
    if (shape.type === "circle") {
      graph.removeNodeWithDependents(shape.controlsNodeId);
      this.refresh();
    } else if (graph.removeShape(shapeId)) {
      this.refresh();
    }
  });

  this.addEventListener("selectLine", ({ detail: { shapeId } }) => {
    unselectSelectedLine();
    selectLine(shapeId);
    this.refresh();
  });

  this.addEventListener("deleteLine", ({ detail: { shapeId } }) => {
    unselectSelectedLine();
    graph.setLineType(shapeId, "deleted");
    this.refresh();
  });

  this.addEventListener("bump", ({ detail: { shapeId, lineType } }) => {
    if (!controlledNodeId) {
      console.error("bump without controlledNodeId");
      return;
    }
    const shape = graph.setLineType(shapeId, lineType);
    if (shape) {
      const connectedShapes = graph.getShapesConnectedToLineShapeId(shapeId);
      connectedShapes.forEach((s) => {
        if (s.type === "circle") {
          s.shake = true;
        }
      });

      // Once we convert to strong lines via bump, delete all short lines
      const node = graph.getNode(controlledNodeId);
      if (node) {
        node.dependents.forEach((attrs, depShapeId) => {
          const depShape = graph.getShape(depShapeId);
          if (
            depShape &&
            depShape.type === "line" &&
            depShape.lineType === "short"
          ) {
            depShape.lineType = "deleted";
          }
        });
      }

      setTimeout(() => {
        connectedShapes.forEach((s) => {
          if (s.type === "circle") {
            s.shake = false;
          }
        });
      }, 1000);
    }
  });

  this.addEventListener(
    "setShapeValues",
    ({ detail: { shapeId, ...values } }) => {
      const shape = graph.getShape(shapeId);
      setShapeValues(shape, values);
    }
  );

  this.addEventListener("createNode", ({ detail: { nodeId } }) => {
    createNodeAroundNode(graph.getNode(nodeId));
  });

  const onKeyDown = (event /*: KeyboardEvent */) => {
    if (!hasTagName(event.target, "body")) return;

    if (event.key === "Enter") {
      if (graph.hasNode(mostRecentlyActiveNodeId))
        createNodeAroundNode(graph.getNode(mostRecentlyActiveNodeId));
      else createCircleUI(window.innerWidth, window.innerHeight);
    } else if (event.key === "Backspace" || event.key === "Delete") {
      if (selectedLineShapeId) {
        const lineShape = graph.getShape(selectedLineShapeId);
        if (lineShape.type === "line") {
          unselectSelectedLine();
          lineShape.lineType = "deleted";
          this.refresh();
        }
      } else {
        console.log("No line selected to delete");
      }
    }
  };

  window.addEventListener("pointermove", (event) => {
    const pos = new Vector2(event.clientX, event.clientY);

    rainbowFocus = getRainbowFocus(pos, winSize, rainbowBorderThickness);

    this.refresh();
  });

  document.body?.addEventListener("keydown", onKeyDown);

  let tapShapeId /*: string | void */;
  let singleClickTimeout /*: TimeoutID | void */;
  let singleTapPos /*: Vector2 | void */;
  let dragColor /*: string | void */;

  const doubleTapMs = 500;
  let isDoubleTap = false;

  const removeTap = async (animate /*: boolean */ = false) => {
    if (!tapShapeId) return;

    if (animate) {
      const shape = graph.getShape(tapShapeId);
      setShapeValues(shape, { tapState: "destroying" });
      this.refresh();
    }

    const tapShapeIdToRemove = tapShapeId;

    // This Tap is done, no one can access it from here on
    tapShapeId = undefined;

    await new Promise((resolve) => setTimeout(resolve, tapAnimationMs));

    if (tapShapeIdToRemove) {
      graph.removeShape(tapShapeIdToRemove);
    }

    this.refresh();
  };

  const { start, end, move, touchStart } = makeDraggable(
    { x: 0, y: 0 },
    {
      onStart: ({ x, y }) => {
        unselectSelectedLine();

        const side = closestSide(new Vector2(x, y), winSize);
        if (side.distance < 40) {
          dragColor = getColorFromScreenCoord(new Vector2(x, y), winSize);

          tapShapeId = graph.createShape({
            type: "tap",
            tapState: "color",
            color: dragColor,
            x,
            y,
          }).shapeId;
          return;
        }

        const doubleTapDistance = singleTapPos
          ? singleTapPos.distanceTo(new Vector2(x, y))
          : 0;

        if (singleClickTimeout && !isDoubleTap && doubleTapDistance < 5) {
          if (!tapShapeId) return;

          isDoubleTap = true;

          clearTimeout(singleClickTimeout);
          singleClickTimeout = undefined;

          if (!tapShapeId) return;

          const shape = graph.getShape(tapShapeId);
          setShapeValues(shape, { x, y, tapState: "creating" });

          setTimeout(() => {
            removeTap(false).then(() => {
              createCircleUI(x, y);
            });
          }, tapAnimationMs - 50);

          this.refresh();
        } else {
          const createNewTap = () => {
            tapShapeId = graph.createShape({
              type: "tap",
              tapState: "create",
              x,
              y,
            }).shapeId;
          };
          if (tapShapeId) {
            removeTap(false).then(createNewTap);
          } else {
            createNewTap();
          }
        }

        this.refresh();
      },
      onEnd: ({ x, y }) => {
        if (dragColor) {
          const circleColor = dragColor;
          removeTap(false).then(() => {
            const node = graph.findNodeAtPosition(new Vector2(x, y));
            if (node) {
              node.color = circleColor;
            } else {
              createCircleUI(x, y, circleColor);
            }
            this.refresh();
          });
          dragColor = undefined;
        }

        if (isDoubleTap) {
          isDoubleTap = false;
          singleTapPos = undefined;
          return;
        }

        singleTapPos = new Vector2(x, y);

        // Clean up Tap shape if needed
        singleClickTimeout = setTimeout(() => {
          removeTap(true);
          singleClickTimeout = undefined;
        }, doubleTapMs);

        this.refresh();
      },
      onMove: ({ x, y }) => {
        clearTimeout(singleClickTimeout);

        if (tapShapeId) {
          const shape = graph.getShape(tapShapeId);

          if (shape.tapState === "color") {
            setShapeValues(shape, { x, y });
          } else {
            setShapeValues(shape, { x, y, tapState: "select" });
          }
          this.refresh();
        }

        this.refresh();
      },
    }
  );

  /** Helper Functions */

  const unselectSelectedLine = () => {
    if (selectedLineShapeId) {
      const shape = graph.getShape(selectedLineShapeId);
      if (!shape || shape.type !== "line")
        throw new Error("can't unselect shape");
      shape.selected = false;
      selectedLineShapeId = null;
    }
  };

  const selectLine = (shapeId /*: string */) => {
    unselectSelectedLine();
    selectedLineShapeId = shapeId;
    const shape = graph.getShape(selectedLineShapeId);
    if (!shape || shape.type !== "line") throw new Error("can't select shape");
    shape.selected = true;
  };

  const getColorFromNearestNode = (p /*: Vector2 */) /*: string | void */ => {
    const sorted = [...graph.nodes.values()].sort(
      (a, b) =>
        p.distanceTo(new Vector2(a.x, a.y)) -
        p.distanceTo(new Vector2(b.x, b.y))
    );
    const node = sorted[0];
    if (node) return node.color;

    // if no nodes, return undefined
  };

  const createCircleUI = (
    x /*: number */,
    y /*: number */,
    colorOverride /*: string | void */
  ) => {
    const p = new Vector2(x, y);
    const color =
      colorOverride || getColorFromNearestNode(p) || getColorFromWorldCoord(p);
    const { nodeId, shapeId } = graph.createCircleControllingNode(p, color);

    this.refresh();

    return { nodeId, shapeId };
  };

  // Approximate Archimedean Spiral
  const createNodeAroundNode = (node /*: Node */) => {
    const { x: cx, y: cy } = node;
    if (node.spiral === undefined) node.spiral = spiralInitial;

    const r = Math.SQRT2 * Math.sqrt(node.spiral);
    const x = cx + Math.cos(r) * spiralRadius;
    const y = cy + Math.sin(r) * spiralRadius;

    const { nodeId } = createCircleUI(x, y);
    const createdNode = graph.getNode(nodeId);
    // Pass the spirality on to the next node
    setNodeValues(createdNode, { spiral: node.spiral + spiralAddend });

    // When revisiting this node, set the spiral to start in a new direction
    setNodeValues(node, { spiral: node.spiral + spiralAddend + 5 });
  };

  try {
    while (true) {
      graph.applyNodesToShapes();
      const { svgShapes, htmlShapes } = shapesMapToComponents(graph.shapes);

      const { width: w, height: h } = winSize;
      yield html`<!-- begin -->
        <svg
          viewBox="0 0 ${w} ${h}"
          style="width: ${w}px; height: ${h}px;"
          xmlns="http://www.w3.org/2000/svg"
          onpointerdown=${start}
          onpointerup=${end}
          onpointercancel=${end}
          onpointermove=${move}
          ontouchstart=${touchStart}
        >
          ${svgShapes}
        </svg>
        <${RainbowBorder}
          size=${winSize}
          borderThickness=${rainbowBorderThickness}
          focus=${rainbowFocus}
        />
        ${htmlShapes}
        <!-- end -->`;
    }
  } finally {
    document.body?.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("resize", resize);
  }
}

renderer.render(html`<${Svg} />`, document.body);

renderer.render(html`${[...styles]}`, document.getElementById("styles"));
