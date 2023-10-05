import { renderer } from "@b9g/crank/dom";
import { html, svg } from "./utils.js";
import { globalIsDragging } from "./constants.js";
import { ColorWheel, getColorFromCoord } from "./colorwheel.js";
import { applyNodeToShapes, makeNodesMap, makeShapesMap } from "./shape.js";
import { makeDraggable } from "./drag.js";
import { FirstTime } from "./firsttime.js";
import { Orb } from "./orb.js";
import { Line } from "./line.js";

function* Svg({ nodes: initNodes = [], shapes: initShapes = [] }) {
  let { nodes, maxNodeId } = makeNodesMap(initNodes);
  let { shapes, maxShapeId } = makeShapesMap(initShapes);

  let showColorGuide = false;
  let mostRecentlyActiveNodeId;
  let selectedLineId;

  let w = window.innerWidth,
    h = window.innerHeight;

  const matchWindowSize = () => {
    w = window.innerWidth;
    h = window.innerHeight;
    this.refresh();
  };

  /** Event Listeners */

  window.addEventListener("resize", matchWindowSize);

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

  this.addEventListener("toggleSelectedLine", ({ detail: { shapeId } }) => {
    const shape = shapes.get(shapeId);
    if (shape) {
      if (selectedLineId === shapeId) {
        selectedLineId = undefined;
        shape.selected = false;
      } else {
        selectedLineId = shapeId;
        shape.selected = true;
      }
      console.log("toggleSelectedLine", selectedLineId);
      this.refresh();
    } else {
      console.warn("can't toggle selected line", shapeId);
    }
  });

  this.addEventListener("undeleteLine", ({ detail: { shapeId } }) => {
    const shape = shapes.get(shapeId);
    if (shape) {
      shape.deleted = false;
      // shape.selected = true;
      // selectedLineId = shapeId;
      // this.refresh();
    } else {
      console.log("can't undelete line, none found");
    }
  });

  this.addEventListener("createNode", ({ detail: { nodeId } }) => {
    const node = nodes.get(nodeId);
    if (node) createNodeAroundNode(node);
  });

  const onKeyDown = (event) => {
    console.log("onKeyDown", event.key);
    if (event.key === "Enter") {
      const node = nodes.get(mostRecentlyActiveNodeId);
      if (node) createNodeAroundNode(node);
      else createNode(window.innerWidth / 2, window.innerHeight / 2);
    } else if (event.key === "Backspace" || event.key === "Delete") {
      if (selectedLineId) {
        const shape = shapes.get(selectedLineId);
        if (shape) {
          shape.deleted = true;
          shape.selected = false;
          selectedLineId = undefined;
          this.refresh();
        } else {
          console.log("can't delete line, none selected");
        }
      }
    }
  };

  /** Create Functions */

  const createLine = (nodeDependents1, nodeDependents2) => {
    const shapeId = ++maxShapeId;
    const lineShape = { type: "line" };

    shapes.set(shapeId, lineShape);
    nodeDependents1.push({ shapeId, attrs: { x: "x2", y: "y2" } });
    nodeDependents2.push({ shapeId, attrs: { x: "x1", y: "y1" } });

    return { shape: lineShape, shapeId };
  };

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
    createNode(x, y, false);
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
              shapeId=${shapeId}
              x1=${shape.x1}
              y1=${shape.y1}
              x2=${shape.x2}
              y2=${shape.y2}
              selected=${shape.selected}
              deleted=${shape.deleted}
            />`;
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
        })}`;
    }
  } finally {
    document.body.removeEventListener("keydown", onKeyDown);
  }
}

renderer.render(html`<${Svg} /><${FirstTime} />`, document.body);
