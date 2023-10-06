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

```ts
nodeId: number;
type Node = {
  x: number;
  y: number;
  color: string;
  text: string;
  dependents: Dependent[];
};

type Dependent = {
  shapeId: number;
  attrs: Record<string, string>;
};

shapeId: number;
type Shape =
  | {
      type: "circle";
      controlsNodeId: number;
      color: string;
      cx: number;
      cy: number;
    }
  | {
      type: "cone";
      controlsNodeId: number;
      forceCutMode: boolean; 
      color: string;
      cx: number;
      cy: number;
    }
  | {
      type: "line";
      color: string;
      lineType: "short" | "deleted" | "strong";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    };
```
