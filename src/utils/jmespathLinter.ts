import { type EditorView } from "@uiw/react-codemirror";
import { type Diagnostic } from "@codemirror/lint";
import { compile } from "@jmespath-community/jmespath";

export function jmespathLinter() {
  return (view: EditorView) => {
    const diagnostics: Diagnostic[] = [];
    const doc = view.state.doc;
    const expression = doc.toString();
    if (expression === "") {
      return diagnostics;
    }
    try {
      compile(expression);
    } catch (e) {
      const errorMessage =
        e instanceof Error &&
        (e.name === "ParserError" || e.name === "LexerError")
          ? `${e.name}: ${e.message}`
          : "Invalid JMESPath expression";

      diagnostics.push({
        from: 0,
        to: expression.length,
        severity: "error",
        message: errorMessage,
        source: "@jmespath-community/jmespath",
      });
    }
    return diagnostics;
  };
}
