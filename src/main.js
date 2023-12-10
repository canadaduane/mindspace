// @flow

import { renderer } from "@b9g/crank/dom";
import {
  html,
  closestSide,
  hasTagName,
  nonNull,
  dispatch,
  parse,
  debounce,
} from "./utils.js";
import { Vector2 } from "./math/vector2.js";
import { Box2 } from "./math/box2.js";
import {
  rainbowBorderThickness,
  spiralRadius,
  spiralInitial,
  spiralAddend,
  tapAnimationMs,
} from "./constants.js";
import { makeGraph } from "./models/graph.js";
import { getColorFromWorldCoord, getColorFromScreenCoord } from "./color.js";
import { makePointable } from "./pointable.js";
import { figuresMapToComponents } from "./figures/index.js";
import { styles } from "./styles.js";
import {
  RainbowBorder,
  getRainbowFocus,
  handleRainbowDrag,
} from "./rainbow-border.js";
import { generateRandomFragment } from "./random-names.js";

/*::
import type { Node, NodeConstructor } from "./models/node.js";
import type { Figure, FigureConstructor } from "./models/figure.js";
import type { Graph } from "./models/graph.js";
import type { RainbowFocus } from "./rainbow-border.js";
*/

function* Main(
  /*:: this:  any, */
  {
    nodes: initNodes = [],
    figures: initFigures = [],
  } /*: { nodes: NodeConstructor[], figures: FigureConstructor[] } */
) {
  let graph = makeGraph({ nodes: initNodes, figures: initFigures });

  window.buildGraphFromString = (input /*: string */) => {
    const data = parse(input);
    graph = makeGraph({ nodes: data.nodes, figures: data.figures });
    this.refresh();
  };

  window.graph = graph;

  const save = debounce(() => {
    const graphKey = window.location.hash;
    localStorage.setItem(graphKey, graph.toString());
  }, 1000);

  let mostRecentlyActiveNodeId;

  const winSize = new Vector2(window.innerWidth, window.innerHeight);
  // Consider https://github.com/msand/zoomable-svg/blob/master/index.js
  const zoom = {
    scale: 1.0,
    world: new Box2(new Vector2(0, 0), new Vector2().copy(winSize)),
    view: new Box2(new Vector2(0, 0), new Vector2().copy(winSize)),
  };

  let controlledNodeId;
  let selectedLineFigureId;

  let rainbowFocus /*: ?RainbowFocus */;

  const resizeWithoutRefresh = () => {
    winSize.set(window.innerWidth, window.innerHeight);
  };
  resizeWithoutRefresh();

  const resize = () => {
    resizeWithoutRefresh();
    this.refresh();
  };

  const pointerout = () => {
    rainbowFocus = undefined;
    this.refresh();
  };

  const pointermove = (event /*: PointerEvent */) => {
    const pos = new Vector2(event.clientX, event.clientY);
    rainbowFocus = getRainbowFocus(pos, winSize, rainbowBorderThickness);
    this.refresh();
  };

  const keydown = (event /*: KeyboardEvent */) => {
    if (!hasTagName(event.target, "body")) return;

    if (event.key === "Enter") {
      if (graph.hasNode(mostRecentlyActiveNodeId)) {
        createNodeAroundNode(mostRecentlyActiveNodeId);
      } else {
        graph.createDefaultJotWithNode(
          new Vector2(window.innerWidth / 2, window.innerHeight / 2)
        );
      }
      this.refresh();
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

  /** Event Listeners */

  window.addEventListener("resize", resize);

  window.addEventListener("pointerout", pointerout);

  window.addEventListener("pointermove", pointermove);

  document.body?.addEventListener("keydown", keydown);

  this.addEventListener("saveGraph", () => {
    save();
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

    const position = new Vector2(x, y);
    const side = closestSide(position, winSize);
    // Dip jots into the rainbow border to colorize them
    if (side.distance < 40) {
      node.color = getColorFromScreenCoord(position, winSize);
    }

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
    const line = graph.updateLine(figureId, { lineType: "deleted" });

    const node1 = graph.getNode(line.connectedNodeId1);
    const node2 = graph.getNode(line.connectedNodeId2);
    [node1, node2].forEach((node) => {
      const count = [...node.dependents.keys()].reduce((sum, depFigureId) => {
        const depFigure = graph.getFigure(depFigureId);
        if (depFigure.type === "line" && depFigure.lineType !== "deleted") {
          return sum + 1;
        } else {
          return sum;
        }
      }, 0);

      if (count > 0) return;

      node.dependents.forEach((attrs, depFigureId) => {
        const depFigure = graph.getFigure(depFigureId);
        if (depFigure.type === "line" && depFigure.lineType === "deleted") {
          depFigure.lineType = "short";
        }
      });
    });

    this.refresh();
    save();
  });

  this.addEventListener("setJotText", ({ detail: { figureId, text } }) => {
    const figure = graph.updateJot(figureId, { text });
    save();
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

    save();
  });

  this.addEventListener("createNode", ({ detail: { nodeId } }) => {
    createNodeAroundNode(nodeId);
    this.refresh();

    save();
  });

  let tapFigureId /*: ?string */;
  let newJotFigureId /*: ?string */;

  const deleteTapFigure = () => {
    if (!tapFigureId) return;

    graph.deleteFigure(tapFigureId);
    tapFigureId = null;
  };

  const { handlers, events } = makePointable({
    longPress: true,
    longPressMs: tapAnimationMs + 50,
    doublePress: true,
    longDrag: true,
  });

  events.on("singleDown", () => {
    unselectSelectedLine();
  });

  handleRainbowDrag(events, graph, () => this.refresh());

  events.on("tap", ({ position }) => {
    document.documentElement?.focus();
  });

  events.on("taptap", ({ position }) => {
    deleteTapFigure();

    newJotFigureId = graph.createDefaultJotWithNode(position).figureId;
    this.refresh();
  });

  events.on("taaap", ({ position }) => {
    deleteTapFigure();

    newJotFigureId = graph.createDefaultJotWithNode(position).figureId;
    this.refresh();
  });

  events.on("down", ({ state, position }) => {
    if (state !== "initial") return;

    tapFigureId = graph.createFigure({
      type: "tap",
      tapState: "creating",
      color: "var(--defaultOrbFill)",
      x: position.x,
      y: position.y,
    }).figureId;

    this.refresh();
  });

  events.on("up", ({ state }) => {
    deleteTapFigure();
    this.refresh();
  });

  events.on("dragMove", ({ state, position }) => {
    if (!tapFigureId) {
      if (newJotFigureId) {
        const figure = graph.getFigure(newJotFigureId);
        if (figure.type === "jot") {
          dispatch(this, "nodeMoved", {
            nodeId: figure.controlsNodeId,
            x: position.x,
            y: position.y,
          });
        }
      }
      return;
    }

    graph.updateTap(tapFigureId, { tapState: "destroying" });
    this.refresh();

    setTimeout(() => {
      deleteTapFigure();
      newJotFigureId = undefined;
      this.refresh();
    }, tapAnimationMs);
  });

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

  // Approximate Archimedean Spiral
  const createNodeAroundNode = (nodeId /*: string */) => {
    const node = graph.getNode(nodeId);
    const { x: cx, y: cy } = node;
    if (node.spiral === undefined) node.spiral = spiralInitial;

    const r = Math.SQRT2 * Math.sqrt(node.spiral);
    const x = cx + Math.cos(r) * spiralRadius;
    const y = cy + Math.sin(r) * spiralRadius;

    const { nodeId: createdNodeId } = graph.createDefaultJotWithNode(
      new Vector2(x, y)
    );

    // Pass the spirality on to the next node
    graph.updateNode(createdNodeId, { spiral: node.spiral + spiralAddend });

    // When revisiting this node, set the spiral to start in a new direction
    graph.updateNode(nodeId, { spiral: node.spiral + spiralAddend + 5 });
  };

  try {
    while (true) {
      graph.applyNodesToFigures();
      const { svgFigures, htmlFigures } = figuresMapToComponents(
        graph.figures,
        newJotFigureId
      );

      const { width: w, height: h } = winSize;
      yield html`<!-- begin -->
        <svg
          viewBox="0 0 ${w} ${h}"
          style="width: ${w}px; height: ${h}px;"
          xmlns="http://www.w3.org/2000/svg"
          onpointerdown=${handlers.start}
          onpointerup=${handlers.end}
          onpointercancel=${handlers.end}
          onpointermove=${handlers.move}
          ontouchstart=${handlers.touchStart}
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
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointerout", pointerout);
    window.removeEventListener("pointermove", pointermove);
    document.body?.removeEventListener("keydown", keydown);
  }
}

function loadAndRender() {
  const graphKey = window.location.hash;

  const input = localStorage.getItem(graphKey);
  const data /*: { nodes: any[], figures: any[] } */ = parse(
    input ?? `{"nodes":[],"figures":[]}`
  );

  renderer.render(null, document.body);
  renderer.render(
    html`<${Main} nodes=${data.nodes} figures=${data.figures} />`,
    document.body
  );
}

if (!window.location.hash) {
  const randomFragment = generateRandomFragment();
  window.location.hash = randomFragment;
}

document.addEventListener("DOMContentLoaded", loadAndRender);
window.addEventListener("hashchange", loadAndRender);

renderer.render(html`${[...styles]}`, document.getElementById("styles"));
