import { type Diagnostic } from "@codemirror/lint";
import json from "@eslint/json";
import { type EditorView } from "@uiw/react-codemirror";
import { Linter } from "eslint-linter-browserify";

const linter = new Linter({
  cwd: "/",
});

export function jsonLinter() {
  return (view: EditorView) => {
    const diagnostics: Diagnostic[] = [];
    const doc = view.state.doc;
    const jsonStr = doc.toString();
    if (jsonStr === "") {
      return diagnostics;
    }
    const lintMessages = linter.verify(
      jsonStr,
      [
        {
          plugins: {
            json,
          },
          files: ["**/*.json"],
          language: "json/json",
          rules: {
            "json/no-duplicate-keys": "warn",
            "json/no-empty-keys": "warn",
            "json/no-unsafe-values": "warn",
            "json/no-unnormalized-keys": "warn",
            "json/sort-keys": "off",
            "json/top-level-interop": "off",
          },
        },
      ],
      {
        filename: "code.json",
      }
    );

    for (const lintMessage of lintMessages) {
      const { line, column, endLine, endColumn, severity, message } =
        lintMessage;

      const from = view.state.doc.line(line).from + column - 1;
      const to =
        view.state.doc.line(endLine ?? line).from + (endColumn ?? column) - 1;

      diagnostics.push({
        from,
        to,
        message: message,
        severity: severity === 2 ? "error" : "warning",
        source: "@eslint/json",
      });
    }

    return diagnostics;
  };
}
