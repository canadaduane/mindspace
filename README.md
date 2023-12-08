# Mindspace

Mindspace is a beautiful interface for thinking and feeling.

Mindmapping tools that I've used in the past seem too focused on details such as how to connect A to B, or whether or not the map is a hierarchy or a cyclic graph.

For me, mind mapping is as much an emotional exercise as it is reasoning about a representation of knowledge. Ideas and concepts are laid out, grouped, discarded, connected, disconnected.

I wanted a UI that encourages treating thoughts and concepts as toys to play with. If you're looking for something similar, you will probably enjoy Mindspace even in its early phase.


https://github.com/canadaduane/mindspace/assets/129/74c83b99-19a2-4366-ad0c-264a5fa34207


## Instructions

1. Create a concept circle: click or tap on the empty background--or press enter on the keyboard--then type. If the text is 3 characters or fewer, the concept will have a circular shape. If longer, it will take up a rectangular space. Tip: press enter several times to connect several concepts in a spiral shape.

2. Choose a color for your concept circle: instead of clicking or tapping, click and drag slowly (or swipe) on the empty background.

3. Connect a concept to another: drag a concept circle (or rectangle) near another. A line will automatically connect them when they are near enough. If you would like the concepts to be more strongly connected, bump them together--a thicker line indicates they can now be separated by any distance and they will still be connected.

4. Delete a connection: quickly swipe or click-drag towards and through any connecting lines. When you move quickly enough, you will see a sharp red "dagger" that can cut connections.

5. Delete a concept: (a) when there is no text, press Backspace or Delete, or (b) like deleting connections, quickly swipe or click-drag towards the concept and you will see a "dagger". Swipe over ("stab") the concept circle/rectangle, and it will be removed along with all of its connections.

## Tech stack

Mindspace uses [Crank.js](https://crank.js.org/) and Flow using type annotations in multiline JS comments. It's otherwise built using plain html and javascript--no build tools or compile step.

### How to run it locally

In the directory where you have all of the source files, run an HTTP server and load up the `index.html` file. For convenience, you can use the nodejs packaged "SIRV" server:

```bash
$ pnpm install
$ pnpm run dev
```

## About Halecraft

We are building emotionally intelligent, open source software. Let's chat!

Duane & Kelty
