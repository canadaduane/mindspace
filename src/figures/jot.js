// @flow

import { Vector2 } from "../math/vector2.js";
import { css } from "../styles.js";
import { dispatch, html, isFirefox } from "../utils.js";
import { makePointable } from "../pointable.js";
import {
  jotCircleRadius,
  jotRectangleWidth,
  jotRectangleHeight,
} from "../constants.js";

const circleToPillTextLength = 3;
const pillToRectangleTextLength = 16;

/*::
import type { JotShape } from "../models/figure.js";

type JotParams = {
  figureId: string,
  controlsNodeId: string,
  shape: JotShape,
  x: number,
  y: number,
}
*/

export function* Jot(
  /*:: this: any, */ {
    figureId,
    controlsNodeId: nodeId,
    shape,
    x = 0,
    y = 0,
  } /*: JotParams */
) /*: any */ {
  let editEl;
  let didDrag = false;
  let content = "";
  let currentShape = shape;
  let animateClass = "";

  const { handlers, events, position } = makePointable({
    position: new Vector2(x, y),
  });

  events.on("start", () => {
    didDrag = false;

    dispatch(this, "controllingNode", { nodeId });
  });

  events.on("end", () => {
    if (!didDrag) {
      setTimeout(() => editEl?.focus(), 100);
    }
  });

  events.on("move", ({ x, y }) => {
    didDrag = true;
    dispatch(this, "nodeMoved", { nodeId, x, y });
  });

  const onKeyDown = (event /*: KeyboardEvent */) => {
    if (event.key === "Enter" && !event.shiftKey) {
      dispatch(this, "createNode", { nodeId });
      event.preventDefault();
      // don't allow body to also create a node
      event.stopPropagation();
      return;
    }
  };

  const onKey = (event /*: KeyboardEvent */) => {
    if (event.key === "Backspace" || event.key === "Delete") {
      if (content.length === 0) {
        dispatch(this, "destroyNode", { nodeId });
        return;
      }
    } else if (event.key === "Escape") {
      editEl?.blur();
    }

    // $FlowIgnore
    content = event.target.innerText.trim();

    let newShape;
    if (content.length <= circleToPillTextLength) {
      newShape = "circle";
    } else if (content.length <= pillToRectangleTextLength) {
      newShape = "pill";
    } else {
      newShape = "rectangle";
    }

    if (newShape !== currentShape) {
      animateClass = `${currentShape}-to-${newShape}`;
      dispatch(this, "setJotShape", { figureId, shape: newShape });
      this.refresh();
    }
  };

  this.schedule(() => setTimeout(() => editEl?.focus(), 50));

  const onFocus = (event /*: FocusEvent */) => {
    dispatch(this, "nodeActive", { nodeId });
  };

  for (const { shape, x, y, color, shake } of this) {
    currentShape = shape;
    position.set(x, y);

    const shapeClasses = [];
    if (shake) shapeClasses.push("shake");
    shapeClasses.push(animateClass);

    yield html`<!-- jot -->
      <div
        onpointerdown=${handlers.start}
        onpointerup=${handlers.end}
        onpointercancel=${handlers.end}
        onpointermove=${handlers.move}
        ontouchstart=${handlers.touchStart}
        class="jot ${"jot--" + shapeClasses.join("-")}"
        style=${{
          "left": `${position.x}px`,
          "top": `${position.y}px`,
          "border-color": color,
        }}
      >
        <div
          class="edit ${shape === "circle" && "edit-jot"}"
          spellcheck=${shape === "rectangle" ? "true" : "false"}
          contenteditable="true"
          onkeydown=${onKeyDown}
          onkeyup=${onKey}
          onfocus=${onFocus}
          $ref=${(el /*: HTMLElement */) => (editEl = el)}
        ></div>
      </div>`;
  }
}

function styles() {
  css`
    .jot {
      position: absolute;
      transform: translate(-50%, -50%);

      border-radius: 100%;
      border-width: 3px;
      border-style: solid;
      transition: border-width 200ms ease-in-out, border-color 200ms linear;

      /* outline-width: 3px;
      outline-style: solid;
      outline-color: rgba(255, 230, 51, 0.5);
      outline-offset: 5px;  */

      width: ${jotCircleRadius * 2}px;
      height: ${jotCircleRadius * 2}px;
      color: var(--brightText);
      background-color: var(--defaultOrbFill);

      display: flex;
      justify-content: center;
      align-items: center;

      overflow-y: auto;
      cursor: default;
    }
    .jot:focus-within {
      border-width: 9px;
    }
    .jot .edit {
      padding: 8px;
      flex-grow: 1;
      margin: auto;
      text-align: center;
      word-break: break-word;
    }
    .jot .edit:focus-visible {
      outline: 0;
    }
    .jot .edit.edit-jot {
      font-size: 48px;
      line-height: 48px;
      margin-bottom: 14px;
      overflow: hidden;
      white-space: nowrap;
    }

    .jot--shake- {
      /* prettier-ignore */
      animation:
        jot--shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    }
    .jot--circle-to-pill {
      /* prettier-ignore */
      animation:
        jot--circle-to-pill 0.3s cubic-bezier(0.6, 0, 1, 1) forwards;
    }
    .jot--shake-circle-to-pill {
      /* prettier-ignore */
      animation:
        jot--shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both,
        jot--circle-to-pill 0.3s cubic-bezier(0.6, 0, 1, 1) forwards;
    }
    .jot--pill-to-circle {
      /* prettier-ignore */
      animation:
        jot--pill-to-circle 0.3s cubic-bezier(0.6, 0, 1, 1) forwards;
    }
    .jot--shake-pill-to-circle {
      /* prettier-ignore */
      animation:
        jot--shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both,
        jot--pill-to-circle 0.3s cubic-bezier(0.6, 0, 1, 1) forwards;
    }
    .jot--pill-to-rectangle {
      /* prettier-ignore */
      animation:
        jot--pill-to-rectangle 0.3s cubic-bezier(0.6, 0, 1, 1) forwards;
    }
    .jot--shake-pill-to-rectangle {
      /* prettier-ignore */
      animation:
        jot--shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both,
        jot--pill-to-rectangle 0.3s cubic-bezier(0.6, 0, 1, 1) forwards;
    }
    .jot--rectangle-to-pill {
      /* prettier-ignore */
      animation:
        jot--rectangle-to-pill 0.3s cubic-bezier(0.6, 0, 1, 1) forwards;
    }
    .jot--shake-rectangle-to-pill {
      /* prettier-ignore */
      animation:
        jot--shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both,
        jot--rectangle-to-pill 0.3s cubic-bezier(0.6, 0, 1, 1) forwards;
    }

    @keyframes jot--circle-to-pill {
      0% {
        border-radius: 100%;
        width: ${jotCircleRadius * 2}px;
        height: ${jotCircleRadius * 2}px;
      }
      40% {
        border-radius: ${jotCircleRadius * 2}px;
        width: ${jotCircleRadius * 2}px;
        height: ${jotCircleRadius * 2}px;
      }
      100% {
        border-radius: ${jotCircleRadius * 2}px;
        width: ${jotRectangleWidth}px;
        height: ${jotCircleRadius * 2}px;
      }
    }

    @keyframes jot--pill-to-circle {
      0% {
        border-radius: ${jotCircleRadius * 2}px;
        width: ${jotRectangleWidth}px;
        height: ${jotCircleRadius * 2}px;
      }
      40% {
        border-radius: ${jotCircleRadius * 2}px;
        width: ${jotCircleRadius * 2}px;
        height: ${jotCircleRadius * 2}px;
      }
      100% {
        border-radius: 100%;
        width: ${jotCircleRadius * 2}px;
        height: ${jotCircleRadius * 2}px;
      }
    }

    @keyframes jot--pill-to-rectangle {
      0% {
        border-radius: ${jotCircleRadius * 2}px;
        width: ${jotRectangleWidth}px;
        height: ${jotCircleRadius * 2}px;
      }
      40% {
        border-radius: 9px;
        width: ${jotRectangleWidth}px;
        height: ${jotCircleRadius * 2}px;
      }
      100% {
        border-radius: 9px;
        width: ${jotRectangleWidth}px;
        height: ${jotRectangleHeight}px;
      }
    }

    @keyframes jot--rectangle-to-pill {
      0% {
        border-radius: 9px;
        width: ${jotRectangleWidth}px;
        height: ${jotRectangleHeight}px;
      }
      40% {
        border-radius: ${jotCircleRadius * 2}px;
        width: ${jotRectangleWidth}px;
        height: ${jotCircleRadius * 2}px;
      }
      100% {
        border-radius: ${jotCircleRadius * 2}px;
        width: ${jotRectangleWidth}px;
        height: ${jotCircleRadius * 2}px;
      }
    }

    @keyframes jot--shake {
      10%,
      90% {
        transform: translate(-51%, -50%);
      }

      20%,
      80% {
        transform: translate(-48%, -50%);
      }

      30%,
      50%,
      70% {
        transform: translate(-54%, -50%);
      }

      40%,
      60% {
        transform: translate(-46%, -50%);
      }
    }
  `;

  if (isFirefox()) {
    css`
      /* CSS hackery to get around bug where contenteditable with
           centered text does not show caret in correct position */
      .jot .edit:focus:empty {
        caret-color: transparent;
      }
      .jot .edit:focus:empty::after {
        content: "";
        display: inline-block;
        width: 3.5px;
        height: 64px;
        margin-bottom: -8px;
        vertical-align: text-bottom;
        background: #ccc;
        opacity: 1;
        animation: blink 1.2s steps(2, jump-none) reverse infinite;
      }
      .jot .edit:focus::after {
        display: none;
      }
    `;
  }
}

styles();
