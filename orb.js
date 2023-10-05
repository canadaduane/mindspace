import { html } from "./utils.js";
import { makeDraggable } from "./drag.js";
import { setGlobalIsDragging, stringLengthTransition } from "./constants.js";

export function* Orb({ nodeId, x = 0, y = 0, color, initialFocus }) {
  const pos = { x, y };

  let editEl;
  let rectShape = false;
  let didDrag = false;

  const { start, end, move, touchStart } = makeDraggable(pos, {
    onStart: () => {
      setGlobalIsDragging(true);
      didDrag = false;
    },
    onEnd: () => {
      setTimeout(() => setGlobalIsDragging(false), 50);
      if (!didDrag) {
        setTimeout(() => editEl?.focus(), 100);
      }
    },
    onMove: ({ event }) => {
      event.preventDefault();
      didDrag = true;
      this.dispatchEvent(
        new CustomEvent("nodeMoved", {
          bubbles: true,
          detail: { nodeId, ...pos },
        })
      );
    },
  });

  let content = "";

  const onKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      this.dispatchEvent(
        new CustomEvent("createNode", {
          bubbles: true,
          detail: { nodeId },
        })
      );
      event.preventDefault();
      return;
    }
  };

  const onKey = (event) => {
    console.log("event key", event.key);
    if (event.key === "Backspace" || event.key === "Delete") {
      if (content.length === 0) {
        this.dispatchEvent(
          new CustomEvent("removeNode", {
            bubbles: true,
            detail: { nodeId },
          })
        );
        return;
      }
    } else if (event.key === "Escape") {
      editEl?.blur();
    }
    content = event.target.innerText.trim();
    rectShape = content.length > stringLengthTransition;
    this.refresh();
  };

  if (initialFocus) {
    this.schedule(() => setTimeout(() => editEl?.focus(), 50));
  }

  for ({ x, y, color } of this) {
    pos.x = x;
    pos.y = y;
    yield html` <style>
        .orb {
          position: absolute;
          transform: translate(-50%, -50%);
          background-color: var(--defaultOrbFill);
          border-width: 3px;
          border-radius: 100%;
          border-style: solid;
          width: 100px;
          height: 100px;
          color: var(--brightText);
          display: flex;
          justify-content: center;
          align-items: center;
          overflow-y: auto;
          user-select: none;
        }
        .orb:focus-within {
          outline-width: 3px;
          outline-style: solid;
        }
        .orb .edit {
          background-color: rgba(0, 0, 0, 0.1);
          padding: 8px;
          flex-grow: 1;
          margin: auto;
          text-align: center;
        }
        .orb .edit:focus-visible {
          outline: 0;
        }
        .orb .edit.circle {
          font-size: 48px;
          line-height: 48px;
          margin-bottom: 14px;
          overflow: hidden;
          white-space: nowrap;
        }

        /* CSS hackery to get around bug where contenteditable with
           centered text does not show caret in correct position */
        .orb .edit:focus:empty {
          caret-color: transparent;
        }
        .orb .edit:focus:empty::after {
          content: "";
          display: inline-block;
          width: 3px;
          height: 48px;
          vertical-align: text-bottom;
          background: #ccc;
          animation: blink 1.2s steps(2) infinite;
        }
        .orb .edit:focus::after {
          display: none;
        }
      </style>
      <div
        onpointerdown=${start}
        onpointerup=${end}
        onpointercancel=${end}
        onpointermove=${move}
        ontouchstart=${touchStart}
        class="orb ${rectShape && "to-rect"}"
        style=${`left: ${pos.x}px;` +
        `top: ${pos.y}px;` +
        `border-color: ${color};` +
        `outline-color: ${color};`}
      >
        <div
          class="edit ${rectShape || "circle"}"
          spellcheck=${rectShape ? "true" : "false"}
          contenteditable="true"
          onkeydown=${onKeyDown}
          onkeyup=${onKey}
          c-ref=${(el) => (editEl = el)}
        ></div>
      </div>`;
  }
}
