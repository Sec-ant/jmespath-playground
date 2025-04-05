import { type SyntaxNode } from "@lezer/common";

export function getCommonAncestorNode(
  node1: SyntaxNode,
  node2: SyntaxNode,
): SyntaxNode | null {
  const ancestors1 = getAncestors(node1);
  const ancestors2 = getAncestors(node2);

  if (ancestors1[0] !== ancestors2[0]) {
    return null;
  }

  for (let i = 0; i < ancestors1.length; ++i) {
    if (ancestors1[i] !== ancestors2[i]) {
      return ancestors1[i - 1]!;
    }
  }

  return ancestors1[ancestors1.length - 1] ?? null;
}

function getAncestors(node: SyntaxNode): SyntaxNode[] {
  const ancestors: SyntaxNode[] = [];
  let currentNode: SyntaxNode | null = node;
  while (currentNode) {
    ancestors.unshift(currentNode);
    currentNode = currentNode.parent;
  }
  return ancestors;
}
