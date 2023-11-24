import { renderer } from "@b9g/crank/dom";
import { html, closestSide } from "./utils.js";
import { Vector2 } from "./math/vector2.js";
import {
  scrollbarThickness,
  spiralRadius,
  spiralInitial,
  spiralAddend,
  rainbowBorderThickness,
} from "./constants.js";
import { makeGraph, getShapesConnectedToLineShapeId } from "./models/graph.js";
import { setShapeValues } from "./models/shape.js";
import { setNodeValues } from "./models/node.js";
import { getColorFromWorldCoord, getColorFromScreenCoord } from "./color.js";
import { makeDraggable } from "./drag.js";
import { shapesMapToComponents } from "./shapes/index.js";
import { styles } from "./styles.js";
import { tapAnimationMs } from "./shapes/tap.js";
import { RainbowBorder, getRainbowFocus } from "./rainbow-border.js";

function* Svg({ nodes: initNodes = [], shapes: initShapes = [] }) {
  let graph = makeGraph({ nodes: initNodes, shapes: initShapes });

  let mostRecentlyActiveNodeId;

  const winSize = new Vector2();
  const docSize = new Vector2();
  let minDocH = window.innerHeight * 2;
  let minDocW = window.innerWidth * 2;

  let controlledNodeId;
  let selectedLineShapeId;

  let rainbowFocus;

  const matchWorkAreaSizesWithoutRefresh = () => {
    winSize.set(window.innerWidth, window.innerHeight);
    if (minDocW < document.documentElement.scrollWidth) {
      minDocW = document.documentElement.scrollWidth;
    }
    docSize.width = Math.max(minDocW, document.documentElement.scrollWidth);
    if (minDocH < document.documentElement.scrollHeight) {
      minDocH = document.documentElement.scrollHeight;
    }
    docSize.height = Math.max(minDocH, document.documentElement.scrollHeight);
  };
  matchWorkAreaSizesWithoutRefresh();

  const matchWorkAreaSizes = () => {
    matchWorkAreaSizesWithoutRefresh();
    this.refresh();
  };

  /** Event Listeners */

  window.addEventListener("load", () => {
    // Scroll to center of area after first render
    // document.documentElement.scrollLeft = window.innerWidth / 2;
    // document.documentElement.scrollTop = window.innerHeight / 2;
  });

  window.addEventListener("resize", matchWorkAreaSizes);

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
      const connectedShapes = getShapesConnectedToLineShapeId(graph)(shapeId);
      connectedShapes.forEach((s) => {
        if (s.type === "circle") {
          s.shake = true;
        }
      });

      // Once we convert to strong lines via bump, delete all short lines
      const node = graph.getNode(controlledNodeId);
      if (node) {
        node.dependents.forEach((dependent) => {
          const depShape = graph.getShape(dependent.shapeId);
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
        connectedShapes.forEach((s) => (s.shake = false));
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

  const onKeyDown = (event) => {
    if (event.target.tagName !== "BODY") return;

    if (event.key === "Enter") {
      if (graph.hasNode(mostRecentlyActiveNodeId))
        createNodeAroundNode(graph.getNode(mostRecentlyActiveNodeId));
      else createCircleUI(window.innerWidth, window.innerHeight);
    } else if (event.key === "Backspace" || event.key === "Delete") {
      if (selectedLineShapeId) {
        const lineShape = graph.getShape(selectedLineShapeId);
        unselectSelectedLine();
        lineShape.lineType = "deleted";
        this.refresh();
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

  document.body.addEventListener("keydown", onKeyDown);

  let tapShapeId;
  let singleClickTimeout;
  let singleTapPos /*: Vector2 | undefined */;
  let dragColor /*: string | undefined */;

  const doubleTapMs = 500;
  let isDoubleTap = false;

  const removeTap = async (animate = false) => {
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

    graph.removeShape(tapShapeIdToRemove);

    this.refresh();
  };

  const { start, end, move, touchStart } = makeDraggable(
    { x: 0, y: 0 },
    {
      onStart: ({ x, y }) => {
        unselectSelectedLine();

        const side = closestSide({ x, y }, winSize);
        if (side.distance < 40) {
          dragColor = getColorFromScreenCoord({ x, y }, winSize);

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
          ? singleTapPos.distanceTo({ x, y })
          : 0;

        if (singleClickTimeout && !isDoubleTap && doubleTapDistance < 5) {
          if (!tapShapeId) return;

          isDoubleTap = true;

          clearTimeout(singleClickTimeout);
          singleClickTimeout = undefined;

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

  /** Create Functions */

  const unselectSelectedLine = () => {
    if (selectedLineShapeId) {
      const shape = graph.getShape(selectedLineShapeId);
      if (shape) shape.selected = false;
      selectedLineShapeId = null;
    }
  };

  const selectLine = (shapeId /*: string */) => {
    unselectSelectedLine();
    selectedLineShapeId = shapeId;
    const shape = graph.getShape(selectedLineShapeId);
    if (shape) shape.selected = true;
  };

  const getColorFromNearestNode = (p /*: Vector2 */) /*: string */ => {
    const sorted = [...graph.nodes.values()].sort(
      (a, b) => p.distanceTo(a) - p.distanceTo(b)
    );
    const node = sorted[0];
    if (node) return node.color;

    // if no nodes, return undefined
  };

  const createCircleUI = (x, y, colorOverride /*: string | void */) => {
    const p = new Vector2(x, y);
    const color =
      colorOverride || getColorFromNearestNode(p) || getColorFromWorldCoord(p);
    const { nodeId, shapeId } = graph.createCircleControllingNode(p, color);

    this.refresh();

    return { nodeId, shapeId };
  };

  // Approximate Archimedean Spiral
  const createNodeAroundNode = (node) => {
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

      yield html`<!-- begin -->
        <svg
          viewBox="0 0 ${docSize.width} ${docSize.height - scrollbarThickness}"
          style="width: ${docSize.width}px; height: ${docSize.height -
          scrollbarThickness}px;"
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
    document.body.removeEventListener("keydown", onKeyDown);
  }
}

renderer.render(html`<${Svg} />`, document.body);

renderer.render(html`${[...styles]}`, document.getElementById("styles"));
