// @flow

/**
 * ReplaceKeywords
 *
 * A match/replace algorithm for contenteditable HTMLElements.
 *
 * by https://github.com/JH1ller/replace-keywords
 */

/*::
export interface RKConfig {
  transformations: Transformation[];
}

type TransformationQuery = string | RegExp;

interface Transformation {
  query: TransformationQuery;
  value:
    | string
    | ((
        word: string,
        query: TransformationQuery,
        matches: RegExp$matchResult | null
      ) => string);
  appendSpace?: boolean;
}

type ReplaceEvent = CustomEvent;
*/

export default class ReplaceKeywords {
  element /*: ?HTMLElement */;
  config /*: RKConfig */;

  constructor(element /*: HTMLElement */, config /*: RKConfig */) {
    this.config = config;
    this.attach(element);
  }

  attach(element /*: HTMLElement */) /*: void */ {
    if (!(element instanceof HTMLElement)) {
      console.error("Element must be of type 'HTMLElement'.");
      return;
    }
    if (element.contentEditable !== "true") {
      console.error(
        "Element does not have 'contenteditable=\"true\"' attribute."
      );
      return;
    }
    if (this.element) {
      this.detach();
    }
    element.addEventListener("keyup", () => this.keyupHandler());
    this.element = element;
  }

  detach() /*: void */ {
    if (this.element) {
      this.element.removeEventListener("keyup", () => this.keyupHandler());
      this.element = undefined;
    } else {
      console.warn("Detach failed, element is not attached");
    }
  }

  get transformations() /*: Transformation[] */ {
    return this.config.transformations ?? [];
  }

  set transformations(transformations /*: Transformation[] */) {
    this.config.transformations = transformations;
  }

  keyupHandler() /*: void */ {
    const precedingText = this.getPrecedingText();
    const lastWord = this.getLastWordInText(precedingText);

    for (const { query, value, appendSpace } of this.config.transformations) {
      const isRegexp = query instanceof RegExp;
      const startPos = precedingText.length - lastWord.length;
      const matches = isRegexp ? lastWord.match(query) : null;

      if (matches || (query === lastWord && !isRegexp)) {
        let replaceContent =
          typeof value === "function" ? value(lastWord, query, matches) : value;

        if (appendSpace ?? true) {
          replaceContent += "\xA0";
        }
        this.replaceHtml(replaceContent, startPos, startPos + lastWord.length);

        const replaceEvent /*: ReplaceEvent */ = new CustomEvent("replace", {
          detail: {
            oldValue: lastWord,
            newValue: replaceContent,
            config: { query, value, appendSpace },
          },
        });

        if (!this.element) throw new Error("this.element undefined");

        this.element.dispatchEvent(replaceEvent);
      }
    }
  }

  replaceHtml(
    html /*: string */,
    startPos /*: number */,
    endPos /*: number */
  ) /*: void */ {
    const selection = window.getSelection();
    let range = document.createRange();

    if (selection?.anchorNode) {
      range.setStart(selection?.anchorNode, startPos);
      range.setEnd(selection.anchorNode, endPos);
    }

    range.deleteContents();

    const element = document.createElement("div");
    element.innerHTML = html;
    const frag = document.createDocumentFragment();
    let node /*: ?Node */;
    let lastNode /*: Node */;
    while ((node = element.firstChild)) {
      lastNode = frag.appendChild(node);
    }
    range.insertNode(frag);

    if (lastNode) {
      range = range.cloneRange();
      range.setStartAfter(lastNode);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }

  getPrecedingText() /*: string */ {
    let text = "";
    const element = window.getSelection()?.anchorNode;
    const workingNodeContent = element?.textContent;
    const selectStartOffset = window.getSelection()?.getRangeAt(0).startOffset;

    if (workingNodeContent && selectStartOffset && selectStartOffset >= 0) {
      text = workingNodeContent.substring(0, selectStartOffset);
    }

    return text;
  }

  getLastWordInText(text /*: string */) /*: string */ {
    text = text.replace(/\u00A0/g, " ");
    const wordsArray = text.split(/\s+/);
    const wordsCount = wordsArray.length - 1;
    return wordsArray[wordsCount].trim();
  }
}
