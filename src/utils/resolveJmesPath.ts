import { type SyntaxNode } from "@lezer/common";
import { type EditorView } from "@uiw/react-codemirror";

/**
 * NodeTypes:
 * - "⚠"
 * - "JsonText"
 * - "True"
 * - "False"
 * - "Null"
 * - "Number"
 * - "String"
 * - "}"
 * - "{"
 * - "Object"
 * - "Property"
 * - "PropertyName"
 * - ":"
 * - ","
 * - "]"
 * - "["
 * - "Array"
 */
export function resolveJmespath(node: SyntaxNode, view: EditorView) {
  const pathSegmentList: (string | number)[] = [];

  let currentNode: SyntaxNode | null | undefined = node;

  while (currentNode) {
    if (currentNode.name === "⚠") {
      break;
    }

    if (currentNode.name === "JsonText") {
      break;
    }

    if (["}", "{", ":", ",", "[", "]", ""].includes(currentNode.name)) {
      currentNode = currentNode.parent;
      continue;
    }

    if (currentNode.name === "Property") {
      currentNode = currentNode.getChild("PropertyName");
      continue;
    }

    if (currentNode.name === "PropertyName") {
      const propertyName = view.state
        .sliceDoc(currentNode.from, currentNode.to)
        // remove quotes
        .replace(/^"|"$/g, "");
      pathSegmentList.push(propertyName);
      currentNode = currentNode.parent?.parent;
      continue;
    }

    // Remaining node types: "True", "False", "Null", "Number", "String", "Array", "Object"

    const parent = currentNode.parent;

    if (!parent) {
      break;
    }

    if (parent.name === "Array") {
      let childPointer: SyntaxNode | null = currentNode;
      let count = 0;
      while (childPointer) {
        if (!["[", "]", ","].includes(childPointer.name)) {
          ++count;
        }
        childPointer = childPointer.prevSibling;
      }
      const index = count - 1;
      pathSegmentList.push(index);
      currentNode = parent;
      continue;
    }

    if (parent.name === "Property") {
      const propertyNameNode = currentNode.prevSibling?.prevSibling;

      if (propertyNameNode?.name === "PropertyName") {
        const propertyName = view.state
          .sliceDoc(propertyNameNode.from, propertyNameNode.to)
          // remove quotes
          .replace(/^"|"$/g, "");
        pathSegmentList.push(propertyName);
      }
      currentNode = parent.parent;
      continue;
    }

    break;
  }

  return joinJmespath(pathSegmentList.reverse());
}

export function joinJmespath(pathSegmentList: (string | number)[]) {
  let result = "";

  for (let i = 0; i < pathSegmentList.length; ++i) {
    const segment = pathSegmentList[i];

    if (typeof segment === "string") {
      if (i > 0) {
        result += ".";
      }
      result += needsQuoting(segment) ? `"${segment}"` : segment;
    } else if (typeof segment === "number") {
      result += `[${segment}]`;
    } else {
      throw new TypeError(`Invalid path segment: ${segment}`);
    }
  }

  return result;
}

export function needsQuoting(str: string): boolean {
  return !/^[A-Za-z_][A-Za-z0-9_]*$/.test(str);
}
