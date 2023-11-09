import { Vector2 } from "../math/vector2.js";
import { css } from "../styles.js";
import { dispatch, html, isFirefox } from "../utils.js";
import { makeDraggable } from "../drag.js";
import {
  orbSize,
  orbRectWidth,
  orbRectHeight,
  stringLengthTransition,
} from "../constants.js";
import { getColorFromWorldCoord } from "../color.js";

export function* Circle({ nodeId, x = 0, y = 0 }) {
  const pos = new Vector2(x, y);

  let editEl;
  let shape = "circle";
  let didDrag = false;
  let content = "";

  const { start, end, move, touchStart } = makeDraggable(pos, {
    onStart: () => {
      didDrag = false;

      dispatch(this, "controllingNode", { nodeId });
    },
    onEnd: () => {
      if (!didDrag) {
        setTimeout(() => editEl?.focus(), 100);
      }
    },
    onMove: ({ x, y }) => {
      didDrag = true;
      dispatch(this, "nodeMoved", { nodeId, ...pos });
    },
  });

  const onKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      dispatch(this, "createNode", { nodeId });
      event.preventDefault();
      // don't allow body to also create a node
      event.stopPropagation();
      return;
    }
  };

  const onKey = (event) => {
    if (event.key === "Backspace" || event.key === "Delete") {
      if (content.length === 0) {
        dispatch(this, "destroyNode", { nodeId });
        return;
      }
    } else if (event.key === "Escape") {
      editEl?.blur();
    }
    content = event.target.innerText.trim();
    if (content.length <= stringLengthTransition) {
      shape = "circle";
    } else {
      shape = "rect";
    }
    this.refresh();
  };

  this.schedule(() => setTimeout(() => editEl?.focus(), 50));

  const onFocus = (event) => {
    dispatch(this, "nodeActive", { nodeId });
  };

  for (const { x, y, color, shake } of this) {
    pos.set(x, y);

    yield html`<!-- circle -->
      <div
        onpointerdown=${start}
        onpointerup=${end}
        onpointercancel=${end}
        onpointermove=${move}
        ontouchstart=${touchStart}
        class="circle ${shake && shape === "rect"
          ? "circle--rect-shake"
          : shape === "rect"
          ? "circle--rect"
          : shake
          ? "circle--shake"
          : ""}"
        style=${{
          "left": `${pos.x}px`,
          "top": `${pos.y}px`,
          "border-color": color,
          "outline-color": color,
        }}
      >
        <div
          class="edit ${shape === "circle" && "edit-circle"}"
          spellcheck=${shape === "rect" ? "true" : "false"}
          contenteditable="true"
          onkeydown=${onKeyDown}
          onkeyup=${onKey}
          onfocus=${onFocus}
          c-ref=${(el) => (editEl = el)}
        ></div>
      </div>`;
  }
}

function styles() {
  css`
    .circle {
      position: absolute;
      transform: translate(-50%, -50%);

      border-radius: 100%;
      outline-width: 3px;
      outline-style: solid;
      transition: outline-width 200s ease-in-out,
        outline-color 600ms linear;

      width: ${orbSize}px;
      height: ${orbSize}px;
      color: var(--brightText);
      background-color: var(--defaultOrbFill);

      display: flex;
      justify-content: center;
      align-items: center;

      overflow-y: auto;
      cursor: default;
    }
    .circle:focus-within {
      outline-width: 9px;
      transition: outline-width 0.15s ease-in-out;
    }
    .circle .edit {
      padding: 8px;
      flex-grow: 1;
      margin: auto;
      text-align: center;
    }
    .circle .edit:focus-visible {
      outline: 0;
    }
    .circle .edit.edit-circle {
      font-size: 48px;
      line-height: 48px;
      margin-bottom: 14px;
      overflow: hidden;
      white-space: nowrap;
    }

    .circle--rect {
      animation: circle--rect 0.3s cubic-bezier(0.6, 0, 1, 1) forwards;
    }
    .circle--shake {
      animation: circle--shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    }
    .circle--rect-shake {
      animation: circle--rect 0.3s cubic-bezier(0.6, 0, 1, 1) forwards,
        circle--shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    }
    @keyframes circle--rect {
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

    @keyframes circle--shake {
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
      .circle .edit:focus:empty {
        caret-color: transparent;
      }
      .circle .edit:focus:empty::after {
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
      .circle .edit:focus::after {
        display: none;
      }
    `;
  }
}

styles();
