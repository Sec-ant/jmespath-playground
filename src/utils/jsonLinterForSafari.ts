import { json } from "@codemirror/lang-json";
import { type Diagnostic } from "@codemirror/lint";
import { type EditorView } from "@codemirror/view";

export function jsonLinterForSafari() {
  return (view: EditorView): Diagnostic[] => {
    const code = view.state.doc.toString();
    if (code === "") {
      return [];
    }
    try {
      JSON.parse(code);
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e;
      const [from, to] = getErrorPosition(code);
      return [
        {
          from,
          to,
          message: e.message,
          severity: "error",
          source: "@codemirror/lang-json",
        },
      ];
    }
    return [];
  };
}

function getErrorPosition(code: string) {
  let from = 0;
  let to = 0;
  json()
    .language.parser.parse(code)
    .iterate({
      enter(node) {
        if (node.name === "⚠") {
          from = node.from;
          to = node.to;
          return false;
        }
      },
    });
  return [from, to];
}
