// @flow

import { renderer } from "@b9g/crank/dom";
import { html, closestSide, hasTagName, nonNull } from "./utils.js";
import { Vector2 } from "./math/vector2.js";
import { Box2 } from "./math/box2.js";
import {
  spiralRadius,
  spiralInitial,
  spiralAddend,
  rainbowBorderThickness,
} from "./constants.js";
import { makeGraph } from "./models/graph.js";
import { getColorFromWorldCoord, getColorFromScreenCoord } from "./color.js";
import { makeDraggable } from "./drag.js";
import { figuresMapToComponents } from "./figures/index.js";
import { styles } from "./styles.js";
import { tapAnimationMs } from "./figures/tap.js";
import { RainbowBorder, getRainbowFocus } from "./rainbow-border.js";

/*::
import type { Node, NodeConstructor } from "./models/node";
import type { Figure, FigureConstructor } from "./models/figure";
*/

function* Svg(
  /*:: this:  any, */
  {
    nodes: initNodes = [],
    figures: initFigures = [],
  } /*: { nodes: NodeConstructor[], figures: FigureConstructor[] } */
) {
  let graph = makeGraph({ nodes: initNodes, figures: initFigures });
  window.graph = graph;

  let mostRecentlyActiveNodeId;

  const winSize = new Vector2(window.innerWidth, window.innerHeight);
  const zoom = {
    scale: 1.0,
    world: new Box2(new Vector2(0, 0), new Vector2().copy(winSize)),
    view: new Box2(new Vector2(0, 0), new Vector2().copy(winSize)),
  };

  let controlledNodeId;
  let selectedLineFigureId;

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
    if (graph.deleteNodeWithDependents(nodeId)) {
      this.refresh();
    }
  });

  this.addEventListener("destroyFigure", ({ detail: { figureId } }) => {
    const figure = graph.getFigure(figureId);
    if (figure.type === "jot") {
      graph.deleteNodeWithDependents(figure.controlsNodeId);
      this.refresh();
    } else if (graph.deleteFigure(figureId)) {
      this.refresh();
    }
  });

  this.addEventListener("selectLine", ({ detail: { figureId } }) => {
    unselectSelectedLine();
    selectLine(figureId);
    this.refresh();
  });

  this.addEventListener("deleteLine", ({ detail: { figureId } }) => {
    unselectSelectedLine();
    graph.updateLine(figureId, { lineType: "deleted" });
    this.refresh();
  });

  this.addEventListener("setJotShape", ({ detail: { figureId, shape } }) => {
    graph.updateJot(figureId, { shape });
    this.refresh();
  });

  this.addEventListener("bump", ({ detail: { figureId, lineType } }) => {
    if (!controlledNodeId) {
      console.error("bump without controlledNodeId");
      return;
    }
    const figure = graph.updateLine(figureId, { lineType });
    if (figure) {
      const connectedFigures =
        graph.getFiguresConnectedToLineFigureId(figureId);
      connectedFigures.forEach((s) => {
        if (s.type === "jot") {
          s.shake = true;
        }
      });

      // Once we convert to strong lines via bump, delete all short lines
      const node = graph.getNode(controlledNodeId);

      node.dependents.forEach((attrs, depFigureId) => {
        const depFigure = graph.getFigure(depFigureId);
        if (depFigure.type === "line" && depFigure.lineType === "short") {
          depFigure.lineType = "deleted";
        }
      });

      setTimeout(() => {
        connectedFigures.forEach((s) => {
          if (s.type === "jot") {
            s.shake = false;
          }
        });
      }, 1000);
    }
  });

  this.addEventListener("createNode", ({ detail: { nodeId } }) => {
    createNodeAroundNode(nodeId);
  });

  const onKeyDown = (event /*: KeyboardEvent */) => {
    if (!hasTagName(event.target, "body")) return;

    if (event.key === "Enter") {
      if (graph.hasNode(mostRecentlyActiveNodeId)) {
        createNodeAroundNode(mostRecentlyActiveNodeId);
      } else {
        createCircleUI(window.innerWidth, window.innerHeight);
      }
    } else if (event.key === "Backspace" || event.key === "Delete") {
      if (selectedLineFigureId) {
        const lineFigure = graph.getFigure(selectedLineFigureId);
        if (lineFigure.type === "line") {
          unselectSelectedLine();
          lineFigure.lineType = "deleted";
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

  let tapFigureId /*: ?string */;
  let singleClickTimeout /*: ?TimeoutID */;
  let singleTapPos /*: ?Vector2 */;
  let dragColor /*: ?string */;

  const doubleTapMs = 500;
  let isDoubleTap = false;

  const removeTap = async (animate /*: boolean */ = false) => {
    if (!tapFigureId) return;

    if (animate) {
      graph.updateTap(tapFigureId, { tapState: "destroying" });
      this.refresh();
    }

    const tapFigureIdToRemove = tapFigureId;

    // This Tap is done, no one can access it from here on
    tapFigureId = undefined;

    await new Promise((resolve) => setTimeout(resolve, tapAnimationMs));

    if (tapFigureIdToRemove) {
      graph.deleteFigure(tapFigureIdToRemove);
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

          tapFigureId = graph.createFigure({
            type: "tap",
            tapState: "color",
            color: dragColor,
            x,
            y,
          }).figureId;
          return;
        }

        const doubleTapDistance = singleTapPos
          ? singleTapPos.distanceTo(new Vector2(x, y))
          : 0;

        if (singleClickTimeout && !isDoubleTap && doubleTapDistance < 5) {
          if (!tapFigureId) return;

          isDoubleTap = true;

          clearTimeout(singleClickTimeout);
          singleClickTimeout = undefined;

          if (!tapFigureId) return;

          graph.updateTap(tapFigureId, { x, y, tapState: "creating" });

          setTimeout(() => {
            removeTap(false).then(() => {
              createCircleUI(x, y);
            });
          }, tapAnimationMs - 50);

          this.refresh();
        } else {
          const createNewTap = () => {
            tapFigureId = graph.createFigure({
              type: "tap",
              tapState: "create",
              x,
              y,
            }).figureId;
          };
          if (tapFigureId) {
            removeTap(false).then(createNewTap);
          } else {
            createNewTap();
          }
        }

        this.refresh();
      },
      onEnd: ({ x, y }) => {
        if (dragColor) {
          const jotColor = dragColor;
          removeTap(false).then(() => {
            const jotFigureIds = graph.findJotsAtPosition(new Vector2(x, y));
            if (jotFigureIds.length === 0) {
              createCircleUI(x, y, jotColor);
            } else {
              for (let figureId of jotFigureIds) {
                const jot = graph.getJot(figureId);
                const node = graph.getNode(jot.controlsNodeId);
                node.color = jotColor;
              }
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

        // Clean up Tap figure if needed
        singleClickTimeout = setTimeout(() => {
          removeTap(true);
          singleClickTimeout = undefined;
        }, doubleTapMs);

        this.refresh();
      },
      onMove: ({ x, y }) => {
        clearTimeout(singleClickTimeout);

        if (tapFigureId) {
          const figureId = nonNull(tapFigureId, "figureId is null");
          const figure = graph.getFigure(figureId);

          if (figure.tapState === "color") {
            graph.updateTap(figureId, { x, y });
          } else {
            graph.updateTap(figureId, { x, y, tapState: "select" });
          }
          this.refresh();
        }

        this.refresh();
      },
    }
  );

  /** Helper Functions */

  const unselectSelectedLine = () => {
    if (selectedLineFigureId) {
      const figure = graph.getFigure(selectedLineFigureId);
      if (figure.type !== "line") throw new Error("can't unselect figure");
      figure.selected = false;
      selectedLineFigureId = null;
    }
  };

  const selectLine = (figureId /*: string */) => {
    unselectSelectedLine();
    selectedLineFigureId = figureId;
    const figure = graph.getFigure(selectedLineFigureId);
    if (figure.type !== "line") throw new Error("can't select figure");
    figure.selected = true;
  };

  const getColorFromNearestNode = (p /*: Vector2 */) /*: ?string */ => {
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
    colorOverride /*: ?string */
  ) => {
    const p = new Vector2(x, y);
    const color =
      colorOverride || getColorFromNearestNode(p) || getColorFromWorldCoord(p);
    const { nodeId, figureId } = graph.createCircleControllingNode(p, color);

    this.refresh();

    return { nodeId, figureId };
  };

  // Approximate Archimedean Spiral
  const createNodeAroundNode = (nodeId /*: string */) => {
    const node = graph.getNode(nodeId);
    const { x: cx, y: cy } = node;
    if (node.spiral === undefined) node.spiral = spiralInitial;

    const r = Math.SQRT2 * Math.sqrt(node.spiral);
    const x = cx + Math.cos(r) * spiralRadius;
    const y = cy + Math.sin(r) * spiralRadius;

    const { nodeId: createdNodeId } = createCircleUI(x, y);

    // Pass the spirality on to the next node
    graph.updateNode(createdNodeId, { spiral: node.spiral + spiralAddend });

    // When revisiting this node, set the spiral to start in a new direction
    graph.updateNode(nodeId, { spiral: node.spiral + spiralAddend + 5 });
  };

  try {
    while (true) {
      graph.applyNodesToFigures();
      const { svgFigures, htmlFigures } = figuresMapToComponents(graph.figures);

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
          ${svgFigures}
        </svg>
        <${RainbowBorder}
          size=${winSize}
          borderThickness=${rainbowBorderThickness}
          focus=${rainbowFocus}
        />
        ${htmlFigures}
        <!-- end -->`;
    }
  } finally {
    document.body?.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("resize", resize);
  }
}

renderer.render(html`<${Svg} />`, document.body);

renderer.render(html`${[...styles]}`, document.getElementById("styles"));
