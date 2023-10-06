import { renderer } from "@b9g/crank/dom";
import { calcDistance, html } from "./utils.js";
import {
  globalIsDragging,
  scrollbarThickness,
  orbSize,
  orbRectWidth,
  orbRectHeight,
} from "./constants.js";
import { ColorWheel, getColorFromWorldCoord } from "./colorwheel.js";
import { applyNodeToShapes, makeNodesMap, makeShapesMap } from "./shape.js";
import {
  startAnimation as startAnimationUnbound,
  stopAnimation,
} from "./animation.js";
import { isIntersecting } from "./utils.js";
import { makeDraggable } from "./drag.js";
import { FirstTime } from "./firsttime.js";
import { Orb } from "./orb.js";
import { Line } from "./line.js";
import { Cone } from "./cone.js";

function* Svg({ nodes: initNodes = [], shapes: initShapes = [] }) {
  let { nodes, maxNodeId } = makeNodesMap(initNodes);
  let { shapes, maxShapeId } = makeShapesMap(initShapes);

  let showColorGuide = false;
  let mostRecentlyActiveNodeId;

  let coneX /*: number */;
  let coneY /*: number */;
  let coneCutPath /*: Point[] */ = [];
  let coneCutMode = false;

  let winW, winH, docW, docH;
  let minDocH = window.innerHeight * 2;
  let minDocW = window.innerWidth * 2;

  const startAnimation = (name /*: string */) =>
    startAnimationUnbound(name, () => this.refresh());

  // Scroll to center of area after first render
  setTimeout(() => {
    document.documentElement.scrollLeft = window.innerWidth / 2;
    document.documentElement.scrollTop = window.innerHeight / 2;
  }, 100);

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
  });

  this.addEventListener("setCutPath", ({ detail: { path } }) => {
    coneCutPath = path;
  });

  this.addEventListener("startAnimation", ({ detail: { name } }) => {
    startAnimation(name);
  });

  this.addEventListener("stopAnimation", ({ detail: { name } }) => {
    stopAnimation(name);
  });

  this.addEventListener("coneMoved", ({ detail: { x, y } }) => {
    coneX = x;
    coneY = y;
    // this.refresh();
  });

  this.addEventListener("nodeActive", ({ detail: { nodeId } }) => {
    mostRecentlyActiveNodeId = nodeId;
  });

  this.addEventListener("nodeMoved", ({ detail: { nodeId, x, y } }) => {
    const node = nodes.get(nodeId);
    if (node) {
      node.x = x;
      node.y = y;
      this.refresh();
    } else {
      console.warn("can't set node movement", nodeId);
    }
  });

  this.addEventListener("removeNode", ({ detail: { nodeId } }) => {
    if (removeNode(nodeId)) {
      this.refresh();
    }
  });

  this.addEventListener("setLineType", ({ detail: { shapeId, lineType } }) => {
    if (setLineType(shapeId, lineType)) {
      this.refresh();
    }
  });

  this.addEventListener("createNode", ({ detail: { nodeId } }) => {
    const node = nodes.get(nodeId);
    if (node) createNodeAroundNode(node);
  });

  const onKeyDown = (event) => {
    if (event.key === "Enter") {
      const node = nodes.get(mostRecentlyActiveNodeId);
      if (node) createNodeAroundNode(node);
      else createNode(window.innerWidth / 2, window.innerHeight / 2);
    }
  };

  /** Create Functions */

  const createLine = (nodeDependents1, nodeDependents2) => {
    const shapeId = ++maxShapeId;
    const lineShape = { type: "line", lineType: "short" };

    shapes.set(shapeId, lineShape);
    nodeDependents1.push({ shapeId, attrs: { x: "x2", y: "y2" } });
    nodeDependents2.push({ shapeId, attrs: { x: "x1", y: "y1" } });

    return { shape: lineShape, shapeId };
  };

  const setLineType = (shapeId, lineType) => {
    const shape = shapes.get(shapeId);
    if (shape) {
      shape.lineType = lineType;
      return true;
    } else {
      console.warn(`can't set line type, line not found: ${shapeId}`);
      return false;
    }
  };

  const createNode = (x, y, initialFocus = true) => {
    if (globalIsDragging) return;

    const nodeId = ++maxNodeId;
    const shapeId = ++maxShapeId;

    const color = getColorFromWorldCoord(x, y);

    // Create a circle that controls the node
    const controllerShape = {
      type: "circle",
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
      initialFocus,
      text: `n${nodeId}`,
      dependents: [
        {
          shapeId,
          attrs: {
            x: "cx",
            y: "cy",
            color: "color",
            initialFocus: "initialFocus",
          },
        },
        ...dependents,
      ],
    };
    nodes.set(nodeId, node);

    this.refresh();

    return node;
  };

  const removeNode = (nodeId /*: number */) => {
    const node = nodes.get(nodeId);
    if (node) {
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

  let newNodeAngle = 0;
  const createNodeAroundNode = (node) => {
    const { x: cx, y: cy } = node;
    const x = cx + Math.cos(newNodeAngle) * 180;
    const y = cy + Math.sin(newNodeAngle) * 180;
    newNodeAngle += Math.PI / 4;
    createNode(x, y, true);
  };

  let createdNodeTimer;
  const shapeIdsCutThisMotion = new Set();
  const pos = { x: 0, y: 0 };
  const { start, end, move, touchStart } = makeDraggable(pos, {
    onStart: ({ x, y, dx, dy }) => {
      coneX = x;
      coneY = y;
      startAnimation("cone");
      // recentlyCreatedNode = createNode(x, y);
      // createdNodeTimer = setTimeout(() => {
      //   showColorGuide = true;
      //   this.refresh();
      // }, 200);
    },
    onEnd: ({ x, y }) => {
      if (!coneCutMode) {
        createNode(x, y);
      }
      coneX = undefined;
      coneY = undefined;
      shapeIdsCutThisMotion.clear();
      clearTimeout(createdNodeTimer);
      stopAnimation("cone");
      showColorGuide = false;
      coneCutMode = false;
      this.refresh();
    },
    onMove: ({ x, y }) => {
      coneX = x;
      coneY = y;
      // recentlyCreatedNode.x = x;
      // recentlyCreatedNode.y = y;
      // recentlyCreatedNode.color = getColorFromWorldCoord(x, y);

      if (coneCutMode) {
        for (let [shapeId, shape] of shapes.entries()) {
          if (shapeIdsCutThisMotion.has(shapeId)) continue;

          if (shape.type === "circle") {
            const distance = calcDistance(shape.cx, shape.cy, x, y);
            if (distance <= 95) {
              if (removeNode(shape.controlsNodeId)) {
                shapeIdsCutThisMotion.add(shapeId);
              }
            }
          } else if (shape.type === "line") {
            let didCutLine = false;
            coneCutPath.slice(1).forEach((p, i) => {
              const q = coneCutPath[i];
              if (
                isIntersecting(
                  // this part of the cut path segment
                  { x: q.x, y: q.y },
                  { x: p.x, y: p.y },
                  // the line we are currently testing
                  { x: shape.x1, y: shape.y1 },
                  { x: shape.x2, y: shape.y2 }
                )
              ) {
                didCutLine = true;
                shapeIdsCutThisMotion.add(shapeId);
                return;
              }
            });
            if (didCutLine) {
              console.log("cut line", shapeId, shape.lineType);
              setLineType(
                shapeId,
                shape.lineType === "strong" ? "short" : "deleted"
              );
            }
          }
        }
      }
      this.refresh();
    },
  });

  let svgShapes = [],
    htmlShapes = [];

  document.body.addEventListener("keydown", onKeyDown);
  try {
    while (true) {
      for (let node of nodes.values()) {
        applyNodeToShapes(node, shapes);
      }

      svgShapes.length = 0;
      htmlShapes.length = 0;
      for (let [shapeId, shape] of shapes.entries()) {
        if (shape.type === "line") svgShapes.push([shapeId, shape]);
        if (shape.type === "circle") htmlShapes.push([shapeId, shape]);
      }

      yield html`<!-- -->
        <!-- Orb styles are here because having them in the Orb component
             causes an animation glitch on remount -->
        <style>
          .to-rect {
            animation: 0.3s linear to-rect;
            animation-timing-function: cubic-bezier(0.6, 0, 1, 1);
            animation-fill-mode: forwards;
          }
          @keyframes to-rect {
            0% {
              border-radius: 100%;
              width: ${orbSize}px;
              height: ${orbSize}px;
            }
            40% {
              border-radius: 9px;
              width: ${orbSize}px;
              height: ${orbSize}px;
            }
            100% {
              border-radius: 9px;
              width: ${orbRectWidth}px;
              height: ${orbRectHeight}px;
            }
          }
        </style>
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
            return html`<${Line}
              crank-key=${shapeId}
              shapeId=${shapeId}
              x1=${shape.x1}
              y1=${shape.y1}
              x2=${shape.x2}
              y2=${shape.y2}
              type=${shape.lineType}
            />`;
          })}
          ${coneX !== undefined &&
          coneY !== undefined &&
          html`
            <${Cone}
              x=${coneX}
              y=${coneY}
              dragDX=${0}
              dragDY=${0}
              color=${getColorFromWorldCoord(coneX, coneY)}
              forceCutMode=${shapeIdsCutThisMotion.size > 0}
            />
          `}
        </svg>

        ${showColorGuide && html`<${ColorWheel} w=${winW} h=${winH} />`}
        ${htmlShapes.map(([shapeId, shape]) => {
          return html`
            <${Orb}
              crank-key=${shapeId}
              nodeId=${shape.controlsNodeId}
              color=${shape.color}
              initialFocus=${shape.initialFocus}
              x=${shape.cx}
              y=${shape.cy}
            />
          `;
        })}`;
    }
  } finally {
    document.body.removeEventListener("keydown", onKeyDown);
  }
}

renderer.render(html`<${Svg} /><${FirstTime} />`, document.body);
