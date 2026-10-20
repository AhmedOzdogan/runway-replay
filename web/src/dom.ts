/** querySelector that fails loudly instead of returning null. */
export function query<T extends Element>(
  root: ParentNode,
  selector: string,
): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing element ${selector}`);
  return found;
}
