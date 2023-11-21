export const styles = new Set();

export function css(strings, ...args) {
  let result = "";

  // Iterate over the strings and args arrays
  strings.forEach((string, i) => {
    result += string; // Add the current string
    if (i < args.length) {
      result += args[i]; // Add the current argument
    }
  });

  styles.add(result);
}
