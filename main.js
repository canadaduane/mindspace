import { renderer } from "@b9g/crank/dom";
import { html, svg } from "./utils.js";
import {
  globalIsDragging,
  lineMaxDistance,
  lineTransition,
} from "./constants.js";
import { ColorWheel, getColorFromCoord } from "./colorwheel.js";
import { applyNodeToShapes, makeNodesMap, makeShapesMap } from "./shape.js";
import { makeDraggable } from "./drag.js";
import { FirstTime } from "./firsttime.js";
import { Orb } from "./orb.js";

function* Svg({ nodes: initNodes = [], shapes: initShapes = [] }) {
  let { nodes, maxNodeId } = makeNodesMap(initNodes);
  let { shapes, maxShapeId } = makeShapesMap(initShapes);

  let showColorGuide = false;

  let w = window.innerWidth,
    h = window.innerHeight;

  const matchWindowSize = () => {
    w = window.innerWidth;
    h = window.innerHeight;
    this.refresh();
  };

  window.addEventListener("resize", matchWindowSize);

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

  let newNodeAngle = 0;
  this.addEventListener("createNode", ({ detail: { nodeId } }) => {
    const node = nodes.get(nodeId);
    if (node) {
      const { x: cx, y: cy } = node;
      const x = cx + Math.cos(newNodeAngle) * 150;
      const y = cy + Math.sin(newNodeAngle) * 150;
      newNodeAngle += Math.PI / 4;
      createNode(x, y, false);
    }
  });

  const createNode = (x, y, initialFocus = true) => {
    if (globalIsDragging) return;

    const nodeId = ++maxNodeId;
    const shapeId = ++maxShapeId;

    const color = getColorFromCoord(
      x,
      y,
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
      const shapeId = ++maxShapeId;
      const connectShape = { type: "line" };

      console.log("create connectShape", shapeId, connectShape);
      shapes.set(shapeId, connectShape);
      dependents.push({ shapeId, attrs: { x: "x2", y: "y2" } });
      otherNode.dependents.push({ shapeId, attrs: { x: "x1", y: "y1" } });
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
      recentlyCreatedNode.x = x;
      recentlyCreatedNode.y = y;
      recentlyCreatedNode.color = getColorFromCoord(
        x,
        y,
        window.innerWidth,
        window.innerHeight
      );
      this.refresh();
    },
  });

  let svgShapes = [],
    htmlShapes = [];

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
        viewBox="0 0 ${w} ${h}"
        style="width: ${w}px; height: ${h}px;"
        xmlns="http://www.w3.org/2000/svg"
        onpointerdown=${start}
        onpointerup=${end}
        onpointercancel=${end}
        onpointermove=${move}
        ontouchstart=${touchStart}
      >
        ${showColorGuide && svg`<${ColorWheel} w=${w} h=${h} />`}
        ${svgShapes.map(([shapeId, shape]) => {
          return html`<${Line}
            crank-key=${shapeId}
            x1=${shape.x1}
            y1=${shape.y1}
            x2=${shape.x2}
            y2=${shape.y2}
          /> `;
        })}
      </svg>

      ${htmlShapes.map(([shapeId, shape]) => {
        return svg`
              <${Orb} 
                crank-key=${shapeId}
                nodeId=${shape.controlsNodeId} 
                color=${shape.color}
                initialFocus=${shape.initialFocus}
                x=${shape.cx}
                y=${shape.cy}
              /> 
            `;
      })} `;
  }
}

function* Line({ x1, y1, x2, y2 }) {
  for ({ x1, y1, x2, y2 } of this) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const opacity =
      1 -
      1 / (1 + Math.pow(Math.E, (lineMaxDistance - distance) / lineTransition));
    yield svg`<line
      x1=${x1}
      y1=${y1}
      x2=${x2}
      y2=${y2}
      stroke="rgba(240, 240, 240, ${opacity})"
      stroke-width="3"
    />`;
  }
}

renderer.render(html`<${Svg} /><${FirstTime} />`, document.body);
