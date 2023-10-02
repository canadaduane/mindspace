import { renderer } from "crank/dom";
import { jsx } from "crank/standalone";

function Greeting({ name = "World" }) {
  return jsx`<div>Hello ${name}</div>`;
}

renderer.render(jsx`<${Greeting} />`, document.body);
