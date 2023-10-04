
Create a node in the center:

```js
const n0 = {
  nodeId: 0,
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  text: "n0",
  dependents: [
    { shapeId: 0, attrs: { x: "cx", y: "cy" } },
    { shapeId: 2, attrs: { x: "x1", y: "y1" } },
  ],
};

const s0 = { shapeId: 0, type: "circle", controlsNodeId: 0 };
```