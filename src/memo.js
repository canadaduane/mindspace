import { createElement, Copy } from "@b9g/crank/standalone";

function equals(props, newProps) {
  for (const name in { ...props, ...newProps }) {
    if (props[name] !== newProps[name]) {
      console.log("changed prop", name, props[name], newProps[name]);
      return false;
    }
  }

  return true;
}

export function memo(Component) {
  return function* Wrapped({ children, ...props }) {
    console.log(
      "create memo wrapped component",
      Component.name,
      props,
      children
    );
    yield createElement(Component, props, ...(children ?? []));

    for (const { children, ...newProps } of this) {
      if (equals(props, newProps)) {
        console.log("yield copy");
        yield createElement(Copy);
      } else {
        console.log("yield modified", Component.name, newProps, children);
        yield createElement(Component, { ...newProps }, ...(children ?? []));
      }

      props = newProps;
    }
  };
}
