import { renderer } from "@b9g/crank/dom";
import { nanoid } from "nanoid";
import { html, closestSide } from "./utils.js";
import { Vector2 } from "./math/vector2.js";
import {
  scrollbarThickness,
  spiralRadius,
  spiralInitial,
  spiralAddend,
  rainbowBorderThickness,
} from "./constants.js";
import { getColorFromWorldCoord, getColorFromScreenCoord } from "./color.js";
import { makeDraggable } from "./drag.js";
import {
  applyNodeToShapes,
  removeShape,
  setShapeValues,
  getShape,
  createShape,
} from "./models/shape.js";
import { styles } from "./styles.js";
import { RainbowBorder, getRainbowFocus } from "./rainbow-border.js";
import { Circle } from "./shapes/circle.js";
import { Line } from "./shapes/line.js";
import { Pop } from "./shapes/pop.js";
import { Tap, tapAnimationMs } from "./shapes/tap.js";
import { makeGraph } from "./models/graph.js";

function* Svg({ nodes: initNodes = [], shapes: initShapes = [] }) {
  let graph = makeGraph({ nodes: initNodes, shapes: initShapes });
  let shapes = graph.shapes;

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
    if (destroyNode(nodeId)) {
      this.refresh();
    }
  });

  this.addEventListener("destroyShape", ({ detail: { shapeId } }) => {
    if (removeShape(shapes, shapeId)) {
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
    setLineType(shapeId, "deleted");
    this.refresh();
  });

  this.addEventListener("bump", ({ detail: { shapeId, lineType } }) => {
    const shape = setLineType(shapeId, lineType);
    if (shape) {
      const connectedShapes = getShapesConnectedToLineShapeId(shapeId);
      connectedShapes.forEach((s) => {
        if (s.type === "circle") {
          s.shake = true;
        }
      });

      // Once we convert to strong lines via bump, delete all short lines
      const node = graph.getNode(controlledNodeId);
      if (node) {
        node.dependents.forEach((dependent) => {
          const depShape = getShape(shapes, dependent.shapeId);
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
      const shape = getShape(shapes, shapeId);
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
      else createNode(window.innerWidth, window.innerHeight);
    } else if (event.key === "Backspace" || event.key === "Delete") {
      if (selectedLineShapeId) {
        const lineShape = getShape(shapes, selectedLineShapeId);
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
      const shape = getShape(shapes, tapShapeId);
      setShapeValues(shape, { tapState: "destroying" });
      this.refresh();
    }

    const tapShapeIdToRemove = tapShapeId;

    // This Tap is done, no one can access it from here on
    tapShapeId = undefined;

    await new Promise((resolve) => setTimeout(resolve, tapAnimationMs));

    removeShape(shapes, tapShapeIdToRemove);

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

          console.log("create color");
          tapShapeId = createShape(shapes, {
            type: "tap",
            tapState: "color",
            color: dragColor,
            x,
            y,
          });
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

          const shape = getShape(shapes, tapShapeId);
          setShapeValues(shape, { x, y, tapState: "creating" });

          setTimeout(() => {
            removeTap(false).then(() => {
              createNode(x, y);
            });
          }, tapAnimationMs - 50);

          this.refresh();
        } else {
          const createNewTap = () => {
            tapShapeId = createShape(shapes, {
              type: "tap",
              tapState: "create",
              x,
              y,
            });
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
              createNode(x, y, circleColor);
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
          const shape = getShape(shapes, tapShapeId);

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

  const createLine = (nodeDependents1, nodeDependents2) => {
    const lineShape = { type: "line", lineType: "short", selected: false };
    const lineShapeId = createShape(shapes, lineShape);

    nodeDependents1.push({ shapeId: lineShapeId, attrs: { x: "x2", y: "y2" } });
    nodeDependents2.push({ shapeId: lineShapeId, attrs: { x: "x1", y: "y1" } });

    return { shape: lineShape, shapeId: lineShapeId };
  };

  const setLineType = (shapeId, lineType) => {
    const shape = getShape(shapes, shapeId);
    return setShapeValues(shape, { lineType });
  };

  const unselectSelectedLine = () => {
    if (selectedLineShapeId) {
      const shape = shapes.get(selectedLineShapeId);
      if (shape) shape.selected = false;
      selectedLineShapeId = null;
    }
  };

  const selectLine = (shapeId /*: string */) => {
    unselectSelectedLine();
    selectedLineShapeId = shapeId;
    const shape = shapes.get(selectedLineShapeId);
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

  const createNode = (x, y, colorOverride /*: string | void */) => {
    const nodeId = nanoid(12);

    const p = new Vector2(x, y);
    const color =
      colorOverride || getColorFromNearestNode(p) || getColorFromWorldCoord(p);

    // Create a circle that controls the node
    const controllerShape = {
      type: "circle",
      cx: x,
      cy: y,
      controlsNodeId: nodeId,
    };
    const shapeId = createShape(shapes, controllerShape);

    const dependents = [];
    // Create lines from this node to all other nodes
    graph.forEachNode((otherNode) => {
      createLine(dependents, otherNode.dependents);
    });

    // Create the new node that all shapes depend on for position updates
    graph.setNode(nodeId, {
      x,
      y,
      color,
      text: `n${nodeId}`,
      dependents: [
        {
          shapeId,
          attrs: {
            x: "cx",
            y: "cy",
            color: "color",
          },
        },
        ...dependents,
      ],
    });

    this.refresh();

    return { nodeId, shapeId };
  };

  // Remove node and its dependents
  const destroyNode = (nodeId /*: string */) => {
    if (graph.hasNode(nodeId)) {
      const node = graph.getNode(nodeId);
      node.dependents.forEach((d) => {
        shapes.delete(d.shapeId);
      });
      return graph.removeNode(nodeId);
    } else {
      console.warn("can't set node movement", nodeId);
      return false;
    }
  };

  const getShapesConnectedToLineShapeId = (shapeId /*: string */) => {
    const connectedShapes = [];
    graph.forEachNode((node) => {
      const hasDeps =
        node.dependents.filter((dep) => dep.shapeId === shapeId).length > 0;

      if (!hasDeps) return;

      for (let dep of node.dependents) {
        if (dep.shapeId !== shapeId) {
          const shape = shapes.get(dep.shapeId);
          if (shape && shape.type === "circle") {
            connectedShapes.push(shape);
          }
        }
      }
    });
    return connectedShapes;
  };

  // Approximate Archimedean Spiral
  const createNodeAroundNode = (node) => {
    const { x: cx, y: cy } = node;
    if (node.spiral === undefined) node.spiral = spiralInitial;

    const r = Math.SQRT2 * Math.sqrt(node.spiral);
    const x = cx + Math.cos(r) * spiralRadius;
    const y = cy + Math.sin(r) * spiralRadius;

    const { nodeId } = createNode(x, y);
    const createdNode = graph.getNode(nodeId);
    // Pass the spirality on to the next node
    graph.setNodeValues(createdNode, { spiral: node.spiral + spiralAddend });

    // When revisiting this node, set the spiral to start in a new direction
    graph.setNodeValues(node, { spiral: node.spiral + spiralAddend + 5 });
  };

  let svgShapes = [],
    htmlShapes = [];

  try {
    while (true) {
      graph.forEachNode((node) => {
        applyNodeToShapes(node, shapes);
      });

      svgShapes.length = 0;
      htmlShapes.length = 0;
      for (let [shapeId, shape] of shapes.entries()) {
        if (shape.type === "line") {
          svgShapes.unshift([shapeId, shape]);
        }
        if (shape.type === "pop") {
          svgShapes.push([shapeId, shape]);
        }
        if (shape.type === "circle" || shape.type === "tap") {
          htmlShapes.push([shapeId, shape]);
        }
      }

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
          ${svgShapes.map(([shapeId, shape]) => {
            switch (shape.type) {
              case "line":
                return html`<${Line}
                  $key=${shapeId}
                  shapeId=${shapeId}
                  selected=${shape.selected}
                  x1=${shape.x1}
                  y1=${shape.y1}
                  x2=${shape.x2}
                  y2=${shape.y2}
                  type=${shape.lineType}
                />`;
              case "pop":
                return html`
                  <${Pop}
                    $key=${shapeId}
                    shapeId=${shapeId}
                    x=${shape.x}
                    y=${shape.y}
                    theta=${shape.theta}
                    color=${shape.color}
                  />
                `;
              default:
                throw new Error(`unknown svg shape type: ${shape.type}`);
            }
          })}
        </svg>
        <${RainbowBorder}
          size=${winSize}
          borderThickness=${rainbowBorderThickness}
          focus=${rainbowFocus}
        />
        ${htmlShapes.map(([shapeId, shape]) => {
          switch (shape.type) {
            case "circle":
              return html`
                <${Circle}
                  $key=${shapeId}
                  nodeId=${shape.controlsNodeId}
                  x=${shape.cx}
                  y=${shape.cy}
                  color=${shape.color}
                  shake=${shape.shake}
                />
              `;
            case "tap":
              return html`
                <${Tap}
                  $key=${shapeId}
                  x=${shape.x}
                  y=${shape.y}
                  tapState=${shape.tapState}
                  color=${shape.color}
                />
              `;
            default:
              throw new Error(`unknown html shape type: ${shape.type}`);
          }
        })}
        <!-- end -->`;
    }
  } finally {
    document.body.removeEventListener("keydown", onKeyDown);
  }
}

renderer.render(html`<${Svg} />`, document.body);

renderer.render(html`${[...styles]}`, document.getElementById("styles"));
