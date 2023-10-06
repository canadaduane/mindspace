import { renderer } from "@b9g/crank/dom";
import { html, svg } from "./utils.js";
import { globalIsDragging, scrollbarThickness } from "./constants.js";
import { ColorWheel, getColorFromCoord } from "./colorwheel.js";
import { applyNodeToShapes, makeNodesMap, makeShapesMap } from "./shape.js";
import { getScroll, makeDraggable } from "./drag.js";
import { FirstTime } from "./firsttime.js";
import { Orb } from "./orb.js";
import { Line } from "./line.js";
import { Spike } from "./spike.js";

function* Svg({ nodes: initNodes = [], shapes: initShapes = [] }) {
  let { nodes, maxNodeId } = makeNodesMap(initNodes);
  let { shapes, maxShapeId } = makeShapesMap(initShapes);

  let showColorGuide = false;
  let mostRecentlyActiveNodeId;

  let winW, winH, docW, docH;
  let minDocH = window.innerHeight * 2;
  let minDocW = window.innerWidth * 2;

  // Scroll to center of area after first render
  setTimeout(() => {
    document.documentElement.scrollLeft = window.innerWidth / 2;
    console.log("scrollTop =", window.innerHeight / 2);
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
    const node = nodes.get(nodeId);
    if (node) {
      node.dependents.forEach((d) => {
        shapes.delete(d.shapeId);
      });
      nodes.delete(nodeId);
      this.refresh();
    } else {
      console.warn("can't set node movement", nodeId);
    }
  });

  this.addEventListener("setLineType", ({ detail: { shapeId, lineType } }) => {
    const shape = shapes.get(shapeId);
    if (shape) {
      shape.lineType = lineType;
      console.log("setLineType", shapeId, lineType);
      this.refresh();
    } else {
      console.log(`can't set line type, line not found: ${shapeId}`);
    }
  });

  this.addEventListener("createNode", ({ detail: { nodeId } }) => {
    const node = nodes.get(nodeId);
    if (node) createNodeAroundNode(node);
  });

  let spike;
  this.addEventListener("showSpike", ({ detail: { x, y, theta } }) => {
    spike = { x, y, theta };
    this.refresh();
  });

  this.addEventListener("hideSpike", () => {
    spike = undefined;
    this.refresh();
  });

  const onKeyDown = (event) => {
    console.log("onKeyDown", event.key);
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

  const createNode = (x, y, initialFocus = true) => {
    if (globalIsDragging) return;

    const nodeId = ++maxNodeId;
    const shapeId = ++maxShapeId;

    const { left, top } = getScroll();
    const color = getColorFromCoord(
      x - left,
      y - top,
      window.innerWidth,
      window.innerHeight
    );

    // Create a circle that controls the node
    const controllerShape = {
      type: "circle",
      cx: x,
      cy: y,
      controlsNodeId: nodeId,
    };
    shapes.set(shapeId, controllerShape);
    console.log("create controllerShape", shapeId, controllerShape);

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
    console.log("create node", nodeId, node);
    nodes.set(nodeId, node);

    this.refresh();

    return node;
  };

  let newNodeAngle = 0;
  const createNodeAroundNode = (node) => {
    const { x: cx, y: cy } = node;
    const x = cx + Math.cos(newNodeAngle) * 180;
    const y = cy + Math.sin(newNodeAngle) * 180;
    newNodeAngle += Math.PI / 4;
    createNode(x, y, true);
  };

  let recentlyCreatedNode;
  let createdNodeTimer;
  const pos = { x: 0, y: 0 };
  const { start, end, move, touchStart } = makeDraggable(pos, {
    onStart: ({ x, y }) => {
      recentlyCreatedNode = createNode(x, y);
      createdNodeTimer = setTimeout(() => {
        showColorGuide = true;
        this.refresh();
      }, 200);
    },
    onEnd: () => {
      clearTimeout(createdNodeTimer);
      showColorGuide = false;
      this.refresh();
    },
    onMove: ({ x, y }) => {
      const { left, top } = getScroll();
      recentlyCreatedNode.x = x;
      recentlyCreatedNode.y = y;
      recentlyCreatedNode.color = getColorFromCoord(
        x - left,
        y - top,
        window.innerWidth,
        window.innerHeight
      );
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

      yield html`<svg
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
        })}
        ${spike &&
        html`<${Spike} x=${spike.x} y=${spike.y} theta=${spike.theta} />`} `;
    }
  } finally {
    document.body.removeEventListener("keydown", onKeyDown);
  }
}

renderer.render(html`<${Svg} /><${FirstTime} />`, document.body);
