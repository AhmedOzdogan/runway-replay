/** querySelector that fails loudly instead of returning null. */
export function query<T extends Element>(
  root: ParentNode,
  selector: string,
): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing element ${selector}`);
  return found;
}

/**
 * Create an element with attributes and children. Strings become text nodes, never HTML.
 * `true` sets a boolean attribute (e.g. hidden), `false` leaves it out.
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | number | boolean> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value !== false)
      element.setAttribute(name, value === true ? "" : String(value));
  }
  element.append(...children);
  return element;
}
