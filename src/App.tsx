import JsonView from "@uiw/react-json-view";
import { useMemo, useState, type FC, useCallback } from "react";
import CodeMirror, {
  EditorView,
  type ReactCodeMirrorProps,
} from "@uiw/react-codemirror";
import { jmespath } from "codemirror-lang-jmespath";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { Diagnostic, linter } from "@codemirror/lint";
import { search, compile, type JSONValue } from "@jmespath-community/jmespath";
import { vscodeLight } from "@uiw/codemirror-theme-vscode";

const INVALID_JSON = Symbol("INVALID_JSON");
const INVALID_JMESPATH = Symbol("INVALID_JMESPATH");

const jsonExtensions = [
  json(),
  linter(jsonParseLinter(), {
    delay: 0,
  }),
];

function jmespathLinter() {
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
      });
    }
    return diagnostics;
  };
}

const jmespathExtensions = [
  jmespath(),
  linter(jmespathLinter(), {
    delay: 0,
  }),
];

const App: FC = () => {
  const [inputJsonStr, setInputJsonStr] = useState<string>("");

  const handleInputJsonStrChange = useCallback<
    Exclude<ReactCodeMirrorProps["onChange"], undefined>
  >((value) => {
    setInputJsonStr(value ?? "");
  }, []);

  const inputJson = useMemo(() => {
    try {
      return JSON.parse(inputJsonStr) as JSONValue;
    } catch (_) {
      return INVALID_JSON;
    }
  }, [inputJsonStr]);

  const [inputJmespathStr, setInputJmespathStr] = useState<string>("");

  const handleInputJmespathStrChange = useCallback<
    Exclude<ReactCodeMirrorProps["onChange"], undefined>
  >((value) => {
    setInputJmespathStr(value ?? "");
  }, []);

  const parsedJson = useMemo(() => {
    if (inputJson === INVALID_JSON) {
      return INVALID_JSON;
    }

    if (inputJmespathStr === "") {
      return inputJson;
    }

    try {
      const searchResult = search(inputJson, inputJmespathStr);
      return searchResult;
    } catch (_) {
      console.log(_);
      return INVALID_JMESPATH;
    }
  }, [inputJson, inputJmespathStr]);

  const parsedJsonView = useMemo(() => {
    if (typeof parsedJson === "symbol") {
      return <span className="font-mono">{parsedJson.description}</span>;
    }
    if (typeof parsedJson === "object" && parsedJson !== null) {
      return <JsonView value={parsedJson} />;
    }
    return <span className="font-mono">{JSON.stringify(parsedJson)}</span>;
  }, [parsedJson]);

  return (
    <div className="flex gap-2 p-2 h-screen bg-gray-200">
      <CodeMirror
        height="100%"
        value={inputJsonStr}
        theme={vscodeLight}
        onChange={handleInputJsonStrChange}
        extensions={jsonExtensions}
        style={{
          width: 400,
          height: "100%",
          borderRadius: 16,
        }}
      />
      <div className="flex flex-col gap-2 flex-grow">
        <CodeMirror
          height="100px"
          value={inputJmespathStr}
          theme={vscodeLight}
          extensions={jmespathExtensions}
          onChange={handleInputJmespathStrChange}
        />
        {parsedJsonView}
      </div>
    </div>
  );
};

export default App;
