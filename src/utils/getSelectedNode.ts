import { syntaxTree } from "@codemirror/language";
import { type SyntaxNode } from "@lezer/common";
import { type EditorState } from "@uiw/react-codemirror";
import { getCommonAncestorNode } from "./getCommonAncestorNode";

export function getSelectedNode(state: EditorState): SyntaxNode {
  const tree = syntaxTree(state);

  const {
    selection: {
      main: { head, anchor },
    },
  } = state;

  let node: SyntaxNode;

  if (head === anchor) {
    const startWithNode = tree.resolve(head, 1);
    const endWithNode = tree.resolve(head, -1);
    if (startWithNode === endWithNode) {
      node = startWithNode;
    } else {
      const commonAncestorNode = getCommonAncestorNode(
        startWithNode,
        endWithNode
      );
      if (commonAncestorNode === startWithNode) {
        node = endWithNode;
      } else {
        node = startWithNode;
      }
    }
  } else {
    const headNode = tree.resolve(head, head < anchor ? 1 : -1);
    const anchorNode = tree.resolve(anchor, anchor < head ? 1 : -1);
    if (headNode === anchorNode) {
      node = headNode;
    } else {
      node = getCommonAncestorNode(headNode, anchorNode) ?? headNode;
    }
  }

  return node;
}
