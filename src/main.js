import { renderer } from "@b9g/crank/dom";
import {
  html,
  doesLineIntersectLine,
  doesLineIntersectCircle,
} from "./utils.js";
import {
  globalIsDragging,
  scrollbarThickness,
  orbSize,
  spiralRadius,
  spiralInitial,
  spiralAddend,
} from "./constants.js";
import { ColorWheel, getColorFromWorldCoord } from "./colorwheel.js";
import { applyNodeToShapes, makeShapesMap } from "./shape.js";
import { makeNodesMap, getNode, hasNode, setNode } from "./node.js";
import {
  startAnimation as startAnimationUnbound,
  stopAnimation,
} from "./animation.js";
import { Transition } from "./transition.js";
import { makeDraggable } from "./drag.js";
import { FirstTime } from "./firsttime.js";
import { Orb } from "./orb.js";
import { Line, demoteLineType } from "./line.js";
import { Cone } from "./cone.js";
import { Pop } from "./pop.js";

function* Svg({ nodes: initNodes = [], shapes: initShapes = [] }) {
  let { nodes, maxNodeId } = makeNodesMap(initNodes);
  let { shapes, maxShapeId } = makeShapesMap(initShapes);

  let showColorWheel = false;
  let mostRecentlyActiveNodeId;

  let coneCutPath /*: Point[] */ = [];
  let coneCutTheta /*: number */ = 0;
  let coneCutMode = false;

  let winW, winH, docW, docH;
  let minDocH = window.innerHeight * 2;
  let minDocW = window.innerWidth * 2;

  const startAnimation = (name /*: string */) =>
    startAnimationUnbound(name, () => this.refresh());

  // Scroll to center of area after first render
  window.addEventListener("load", () => {
    document.documentElement.scrollLeft = window.innerWidth / 2;
    document.documentElement.scrollTop = window.innerHeight / 2;
  });

  const matchWorkAreaSizesWithoutRefresh = () => {
    winW = window.innerWidth;
    winH = window.innerHeight;
    if (minDocW < document.documentElement.scrollWidth) {
      minDocW = document.documentElement.scrollWidth;
    }
    docW = Math.max(minDocW, document.documentElement.scrollWidth);
    if (minDocH < document.documentElement.scrollHeight) {
      minDocH = document.documentElement.scrollHeight;
    }
    docH = Math.max(minDocH, document.documentElement.scrollHeight);
  };
  matchWorkAreaSizesWithoutRefresh();

  const matchWorkAreaSizes = () => {
    matchWorkAreaSizesWithoutRefresh();
    this.refresh();
  };

  /** Event Listeners */

  window.addEventListener("resize", matchWorkAreaSizes);

  this.addEventListener("setCutMode", ({ detail: { mode } }) => {
    coneCutMode = mode;
    enableDisableConeLines();
    if (coneCutMode) {
      showColorWheel = false;
    } else if (!coneCutMode && coneNodeId) {
      showColorWheel = true;
    }
    // no need to refresh because we're animating "cone"
  });

  this.addEventListener("setCutPath", ({ detail: { path, theta } }) => {
    coneCutTheta = theta;
    coneCutPath = path;
  });

  this.addEventListener("startAnimation", ({ detail: { name } }) => {
    startAnimation(name);
  });

  this.addEventListener("stopAnimation", ({ detail: { name } }) => {
    stopAnimation(name);
  });

  this.addEventListener("nodeActive", ({ detail: { nodeId } }) => {
    mostRecentlyActiveNodeId = nodeId;
  });

  this.addEventListener("nodeMoved", ({ detail: { nodeId, x, y } }) => {
    const node = getNode(nodeId, nodes);
    node.x = x;
    node.y = y;
    this.refresh();
  });

  this.addEventListener("removeNode", ({ detail: { nodeId } }) => {
    if (removeNode(nodeId)) {
      this.refresh();
    }
  });

  this.addEventListener("removeShape", ({ detail: { shapeId } }) => {
    if (removeShape(shapeId)) {
      this.refresh();
    }
  });

  this.addEventListener(
    "setLineType",
    ({ detail: { shapeId, lineType, bump } }) => {
      const shape = setLineType(shapeId, lineType);
      if (shape && bump) {
        const connectedShapes = getShapesConnectedToLineShapeId(shapeId);
        connectedShapes.forEach((s) => {
          if (s.type === "circle") s.shake = true;
        });
        setTimeout(() => {
          connectedShapes.forEach((s) => (s.shake = false));
        }, 1000);
      }
    }
  );

  this.addEventListener("createNode", ({ detail: { nodeId } }) => {
    createNodeAroundNode(getNode(nodeId, nodes));
  });

  const onKeyDown = (event) => {
    if (event.key === "Enter" && event.target.tagName === "BODY") {
      if (hasNode(mostRecentlyActiveNodeId, nodes))
        createNodeAroundNode(getNode(mostRecentlyActiveNodeId, nodes));
      else createNode(window.innerWidth, window.innerHeight);
    }
  };

  document.body.addEventListener("keydown", onKeyDown);

  let coneNodeId;
  let coneShapeId;
  let coneShapeDepShapeIds = [];
  const shapeIdsCutThisMotion = new Set();
  const conePos = { x: 0, y: 0 };

  const enableDisableConeLines = () => {
    if (coneCutMode) {
      // Disable lines from Cone when in "cutter" mode
      for (const depShape of coneShapeDepShapeIds) {
        if (depShape.type === "line" && depShape.lineType !== "disabled") {
          depShape.lineType = "disabled";
        }
      }
    } else {
      // Enable lines to Cone when in "create" mode
      for (const depShape of coneShapeDepShapeIds) {
        if (depShape.type === "line" && depShape.lineType === "disabled") {
          depShape.lineType = "short";
        }
      }
    }
  };

  const { start, end, move, touchStart } = makeDraggable(conePos, {
    onStart: ({ x, y }) => {
      startAnimation("cone");
      const { nodeId, shapeId } = createNode(x, y, "cone");
      showColorWheel = true;
      coneNodeId = nodeId;
      coneShapeId = shapeId;
      coneShapeDepShapeIds = getDependentShapesOfControllerShape(coneShapeId);
      this.refresh();
    },
    onEnd: ({ x, y }) => {
      stopAnimation("cone");
      if (coneCutMode) {
        removeNode(coneNodeId);
      } else {
        // convert the Cone to an Orb
        const shape = shapes.get(coneShapeId);
        if (shape) {
          shape.type = "circle";
        } else {
          throw new Error("can't find coneShapeId");
        }
      }
      showColorWheel = false;
      coneNodeId = undefined;
      coneShapeId = undefined;
      shapeIdsCutThisMotion.clear();
      coneCutMode = false;
      this.refresh();
    },
    onMove: ({ x, y }) => {
      enableDisableConeLines();
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
                  if (removeNode(shape.controlsNodeId)) {
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

      const node = getNode(coneNodeId, nodes);
      node.x = x;
      node.y = y;
      node.color = getColorFromWorldCoord(x, y);

      this.refresh();
    },
  });

  /** Create Functions */

  const createLine = (nodeDependents1, nodeDependents2) => {
    const lineShapeId = ++maxShapeId;
    const lineShape = { type: "line", lineType: "short" };

    shapes.set(lineShapeId, lineShape);
    nodeDependents1.push({ shapeId: lineShapeId, attrs: { x: "x2", y: "y2" } });
    nodeDependents2.push({ shapeId: lineShapeId, attrs: { x: "x1", y: "y1" } });

    return { shape: lineShape, shapeId: lineShapeId };
  };

  const createPop = (x, y, theta, color) => {
    const popShapeId = ++maxShapeId;
    shapes.set(popShapeId, {
      type: "pop",
      color,
      x,
      y,
      theta,
    });
  };

  const removeShape = (shapeId) => {
    if (shapes.has(shapeId)) {
      shapes.delete(shapeId);
      return true;
    }
    return false;
  };

  const setLineType = (shapeId, lineType) => {
    const shape = shapes.get(shapeId);
    if (shape) {
      shape.lineType = lineType;
      return shape;
    } else {
      console.warn(`can't set line type, line not found: ${shapeId}`);
    }
  };

  const createNode = (
    x,
    y,
    controllerShapeType /*: "circle" | "cone" */ = "circle"
  ) => {
    if (globalIsDragging) return;

    const nodeId = ++maxNodeId;
    const shapeId = ++maxShapeId;

    const color = getColorFromWorldCoord(x, y);

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
    for (let otherNode of nodes.values()) {
      createLine(dependents, otherNode.dependents);
    }

    // Create the new node that all shapes depend on for position updates
    const node = {
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
    };
    nodes.set(nodeId, node);

    this.refresh();

    return { nodeId, shapeId };
  };

  const removeNode = (nodeId /*: number */) => {
    if (hasNode(nodeId, nodes)) {
      const node = getNode(nodeId, nodes);
      node.dependents.forEach((d) => {
        shapes.delete(d.shapeId);
      });
      nodes.delete(nodeId);
      return true;
    } else {
      console.warn("can't set node movement", nodeId);
      return false;
    }
  };

  const getDependentShapesOfControllerShape = (shapeId /*: number */) => {
    const shape = shapes.get(shapeId);
    if (shape) {
      const node = getNode(shape.controlsNodeId, nodes);
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

  const getShapesConnectedToLineShapeId = (shapeId /*: number */) => {
    const connectedShapes = [];
    for (let node of nodes.values()) {
      const hasDeps =
        node.dependents.filter((dep) => dep.shapeId === shapeId).length > 0;

      if (!hasDeps) continue;

      for (let dep of node.dependents) {
        if (dep.shapeId !== shapeId) {
          const shape = shapes.get(dep.shapeId);
          if (shape && shape.type === "circle") {
            connectedShapes.push(shape);
          }
        }
      }
    }
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
    const createdNode = getNode(nodeId, nodes);
    // Pass the spirality on to the next node
    setNode(createdNode, { spiral: node.spiral + spiralAddend });

    // When revisiting this node, set the spiral to start in a new direction
    setNode(node, { spiral: node.spiral + spiralAddend + 5 });
  };

  let svgShapes = [],
    htmlShapes = [];

  try {
    while (true) {
      for (let node of nodes.values()) {
        applyNodeToShapes(node, shapes);
      }

      svgShapes.length = 0;
      htmlShapes.length = 0;
      for (let [shapeId, shape] of shapes.entries()) {
        if (shape.type === "line") {
          svgShapes.unshift([shapeId, shape]);
        }
        if (shape.type === "cone" || shape.type === "pop") {
          svgShapes.push([shapeId, shape]);
        }
        if (shape.type === "circle") {
          htmlShapes.push([shapeId, shape]);
        }
      }

      yield html`<!-- -->
        <svg
          viewBox="0 0 ${docW} ${docH - scrollbarThickness}"
          style="width: ${docW}px; height: ${docH - scrollbarThickness}px;"
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
                  x1=${shape.x1}
                  y1=${shape.y1}
                  x2=${shape.x2}
                  y2=${shape.y2}
                  type=${shape.lineType}
                />`;
              case "cone":
                return html`
                  <${Cone}
                    $key=${shapeId}
                    x=${shape.cx}
                    y=${shape.cy}
                    color=${shape.color}
                    forceCutMode=${shape.forceCutMode}
                  />
                `;
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
        <!-- -->
        <${Transition}
          active=${showColorWheel}
          in=${{ delay: 1000, ms: 1000 }}
          out=${{ delay: 1000, ms: 1000 }}
        >
          <${ColorWheel} w=${winW} h=${winH} />
        </${Transition}>
        <!-- -->
        ${htmlShapes.map(([shapeId, shape]) => {
          switch (shape.type) {
            case "circle":
              return html`
                <${Orb}
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

renderer.render(html`<${Svg} /><${FirstTime} />`, document.body);
