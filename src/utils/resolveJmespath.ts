import { type SyntaxNode } from "@lezer/common";
import { type EditorState } from "@uiw/react-codemirror";
import { type ArrayProjection } from "../store/playground";

interface ResolveJmespathOptions {
  arrayProjection?: ArrayProjection;
}

const defaultResolveJmespathOptions: Required<ResolveJmespathOptions> = {
  arrayProjection: "none",
};

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
export function resolveJmespath(
  node: SyntaxNode,
  state: EditorState,
  options: ResolveJmespathOptions = {},
) {
  const resolvedOptions = {
    ...defaultResolveJmespathOptions,
    ...options,
  };

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
      const propertyName = state
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
        const propertyName = state
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

  return joinJmespath(
    pathSegmentList.reverse(),
    resolvedOptions.arrayProjection,
  );
}

export function joinJmespath(
  pathSegmentList: (string | number)[],
  arrayProjection: ArrayProjection,
) {
  let result = "";

  for (let i = 0; i < pathSegmentList.length; ++i) {
    const segment = pathSegmentList[i];

    if (typeof segment === "string") {
      if (i > 0) {
        result += ".";
      }
      result += needsQuoting(segment) ? `"${segment}"` : segment;
    } else if (typeof segment === "number") {
      switch (arrayProjection) {
        case "none":
          result += `[${segment}]`;
          break;
        case "wildcard":
          result += "[*]";
          break;
        case "slice to":
          result += `[:${segment + 1}]`;
          break;
        case "slice from":
          result += `[${segment}:]`;
          break;
        case "slice":
          result += "[:]";
          break;
        case "flatten":
          result += "[]";
          break;
        default:
          arrayProjection satisfies never;
          result += `[${segment}]`;
          break;
      }
    } else {
      throw new TypeError(`Invalid path segment: ${segment}`);
    }
  }

  return result;
}

export function needsQuoting(str: string): boolean {
  return !/^[A-Za-z_][A-Za-z0-9_]*$/.test(str);
}
