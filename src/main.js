import { renderer } from "@b9g/crank/dom";
import { nanoid } from "nanoid";
import { html } from "./utils.js";
import { doesLineIntersectLine, doesLineIntersectCircle } from "./trig.js";
import { Vector2 } from "./math/vector2.js";
import {
  scrollbarThickness,
  orbSize,
  spiralRadius,
  spiralInitial,
  spiralAddend,
} from "./constants.js";
import { getColorFromWorldCoord } from "./color.js";
import { makeDraggable } from "./drag.js";
import {
  applyNodeToShapes,
  removeShape,
  setShapeValues,
  makeShapesMap,
  getShape,
  setShape,
} from "./shape.js";
import {
  makeNodesMap,
  getNode,
  setNode,
  hasNode,
  removeNode,
  setNodeValues,
  forEachNode,
} from "./node.js";
import { RainbowBorder, getRainbowFocus } from "./rainbow-border.js";
import { Circle } from "./shapes/circle.js";
import { Line, demoteLineType } from "./shapes/line.js";
import { Pop } from "./shapes/pop.js";

function* Svg({ nodes: initNodes = [], shapes: initShapes = [] }) {
  let nodes = makeNodesMap(initNodes);
  let shapes = makeShapesMap(initShapes);

  let mostRecentlyActiveNodeId;

  let coneCutPath /*: Point[] */ = [];
  let coneCutTheta /*: number */ = 0;
  let coneCutMode = false;

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
    document.documentElement.scrollLeft = window.innerWidth / 2;
    document.documentElement.scrollTop = window.innerHeight / 2;
  });

  window.addEventListener("resize", matchWorkAreaSizes);

  this.addEventListener("setCutMode", ({ detail: { mode } }) => {
    coneCutMode = mode;
    enableDisableConeLines();
    // no need to refresh because we're animating "cone"
  });

  this.addEventListener("setCutPath", ({ detail: { path, theta } }) => {
    coneCutTheta = theta;
    coneCutPath = path;
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
    const node = getNode(nodes, nodeId);
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
      const node = getNode(nodes, controlledNodeId);
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
    createNodeAroundNode(getNode(nodes, nodeId));
  });

  const onKeyDown = (event) => {
    if (event.target.tagName !== "BODY") return;

    if (event.key === "Enter") {
      if (hasNode(nodes, mostRecentlyActiveNodeId))
        createNodeAroundNode(getNode(nodes, mostRecentlyActiveNodeId));
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

    rainbowFocus = getRainbowFocus(pos, winSize);

    this.refresh();
  });

  document.body.addEventListener("keydown", onKeyDown);

  let coneNodeId;
  let coneShapeId;
  let coneShapeDepShapeIds = [];
  const conePos = { x: 0, y: 0 };
  const shapeIdsCutThisMotion = new Set();

  const { start, end, move, touchStart } = makeDraggable(conePos, {
    onStart: ({ x, y }) => {
      unselectSelectedLine();
      this.refresh();
    },
    onEnd: () => {
      if (coneCutMode) {
        console.log("remove cone node", coneNodeId);
        destroyNode(coneNodeId);
      }
      this.refresh();
    },
    onMove: ({ x, y }) => {
      if (coneCutMode) {
        // Delete lines and orbs when in "cutter" mode
        for (let [shapeId, shape] of shapes.entries()) {
          // Skip self-cutting Cone
          if (
            shapeId === coneShapeId ||
            (shape.type === "line" && shape.lineType === "disabled")
          ) {
            continue;
          }

          // Skip shapes we've already deleted during this "cutter" session
          if (shapeIdsCutThisMotion.has(shapeId)) {
            continue;
          }

          if (shape.type === "circle") {
            const c = { x: shape.cx, y: shape.cy };
            coneCutPath.slice(1).forEach((p, i) => {
              const q = coneCutPath[i];
              if (doesLineIntersectCircle(q, p, c, orbSize / 2 - 1)) {
                if (!shapeIdsCutThisMotion.has(shapeId)) {
                  if (destroyNode(shape.controlsNodeId)) {
                    shapeIdsCutThisMotion.add(shapeId);
                    createPop(
                      shape.cx,
                      shape.cy,
                      coneCutTheta + Math.PI,
                      shape.color
                    );
                    return;
                  }
                }
              }
            });
          } else if (shape.type === "line") {
            const p1 = { x: shape.x1, y: shape.y1 };
            const p2 = { x: shape.x2, y: shape.y2 };
            coneCutPath.slice(1).forEach((p, i) => {
              const q = coneCutPath[i];
              // (q, p) is this part of the cut path segment
              // (p1, p2) is the line we are currently testing
              if (doesLineIntersectLine(q, p, p1, p2)) {
                shapeIdsCutThisMotion.add(shapeId);
                const demoted = demoteLineType(shape.lineType);
                setLineType(shapeId, demoted);
                return;
              }
            });
          }
        }
      }

      const node = getNode(nodes, coneNodeId);
      node.x = x;
      node.y = y;

      this.refresh();
    },
  });

  /** Create Functions */

  const createLine = (nodeDependents1, nodeDependents2) => {
    const lineShapeId = nanoid(12);
    const lineShape = { type: "line", lineType: "short" };

    setShape(shapes, lineShapeId, lineShape);
    nodeDependents1.push({ shapeId: lineShapeId, attrs: { x: "x2", y: "y2" } });
    nodeDependents2.push({ shapeId: lineShapeId, attrs: { x: "x1", y: "y1" } });

    return { shape: lineShape, shapeId: lineShapeId };
  };

  const createPop = (x, y, theta, color) => {
    const popShapeId = nanoid(12);
    shapes.set(popShapeId, {
      type: "pop",
      color,
      x,
      y,
      theta,
    });
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

  const createNode = (
    x,
    y,
    controllerShapeType /*: "circle" | "cone" */ = "circle"
  ) => {
    const nodeId = nanoid(12);
    const shapeId = nanoid(12);

    const p = new Vector2(x, y);
    const color = getColorFromWorldCoord(p);

    // Create a circle or cone that controls the node
    const controllerShape = {
      type: controllerShapeType,
      cx: x,
      cy: y,
      controlsNodeId: nodeId,
    };
    shapes.set(shapeId, controllerShape);

    const dependents = [];
    // Create lines from this node to all other nodes
    forEachNode(nodes, (otherNode) => {
      createLine(dependents, otherNode.dependents);
    });

    // Create the new node that all shapes depend on for position updates
    setNode(nodes, nodeId, {
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
    if (hasNode(nodes, nodeId)) {
      const node = getNode(nodes, nodeId);
      node.dependents.forEach((d) => {
        shapes.delete(d.shapeId);
      });
      return removeNode(nodes, nodeId);
    } else {
      console.warn("can't set node movement", nodeId);
      return false;
    }
  };

  const getDependentShapesOfControllerShape = (shapeId /*: string */) => {
    const shape = shapes.get(shapeId);
    if (shape) {
      const node = getNode(nodes, shape.controlsNodeId);
      const shapeIds = [];
      if (node) {
        for (let dep of node.dependents) {
          const depShape = shapes.get(dep.shapeId);
          if (depShape) {
            shapeIds.push(depShape);
          }
        }
      }
      return shapeIds;
    } else {
      throw new Error(`can't find shape: ${shapeId}`);
    }
  };

  const getShapesConnectedToLineShapeId = (shapeId /*: string */) => {
    const connectedShapes = [];
    forEachNode(nodes, (node) => {
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
    const createdNode = getNode(nodes, nodeId);
    // Pass the spirality on to the next node
    setNodeValues(createdNode, { spiral: node.spiral + spiralAddend });

    // When revisiting this node, set the spiral to start in a new direction
    setNodeValues(node, { spiral: node.spiral + spiralAddend + 5 });
  };

  let svgShapes = [],
    htmlShapes = [];

  try {
    while (true) {
      forEachNode(nodes, (node) => {
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
        if (shape.type === "circle") {
          htmlShapes.push([shapeId, shape]);
        }
      }

      yield html`<!-- -->
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
          borderThickness=${5}
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
            default:
              throw new Error(`unknown html shape type: ${shape.type}`);
          }
        })}`;
    }
  } finally {
    document.body.removeEventListener("keydown", onKeyDown);
  }
}

renderer.render(html`<${Svg} />`, document.body);
