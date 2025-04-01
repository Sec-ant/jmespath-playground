import { useMemo, type FC, useCallback, memo } from "react";
import { jmespath } from "codemirror-lang-jmespath";
import { useShallow } from "zustand/shallow";
import CodeMirror, {
  type EditorView,
  type ReactCodeMirrorProps,
} from "@uiw/react-codemirror";
import { vscodeLight } from "@uiw/codemirror-theme-vscode";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { type Diagnostic, linter } from "@codemirror/lint";
import { search, compile, type JSONValue } from "@jmespath-community/jmespath";
import ExtendedJsonView from "./components/ExtendedJsonView";
import { usePlaygroundStore } from "./store/playground";

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
  const { jsonStr, jmespathStr } = usePlaygroundStore(
    useShallow(
      useCallback(
        ({ jsonStr, jmespathStr }) => ({
          jsonStr: jsonStr,
          jmespathStr: jmespathStr,
        }),
        []
      )
    )
  );

  const handleInputJsonStrChange = useCallback<
    Exclude<ReactCodeMirrorProps["onChange"], undefined>
  >((value) => {
    usePlaygroundStore.setState({ jsonStr: value ?? "" });
  }, []);

  const parsedJson = useMemo(() => {
    try {
      return JSON.parse(jsonStr) as JSONValue;
    } catch (_) {
      return INVALID_JSON;
    }
  }, [jsonStr]);

  const handleInputJmespathStrChange = useCallback<
    Exclude<ReactCodeMirrorProps["onChange"], undefined>
  >((value) => {
    usePlaygroundStore.setState({ jmespathStr: value ?? "" });
  }, []);

  const queriedJson = useMemo(() => {
    if (parsedJson === INVALID_JSON) {
      return INVALID_JSON;
    }

    if (jmespathStr === "") {
      return parsedJson;
    }

    try {
      const searchResult = search(parsedJson, jmespathStr);
      return searchResult;
    } catch (_) {
      return INVALID_JMESPATH;
    }
  }, [parsedJson, jmespathStr]);

  const queriedJsonView = useMemo(() => {
    if (typeof queriedJson === "symbol") {
      return (
        <span className="font-mono text-[rgb(221,17,17)]">
          {queriedJson.description}
        </span>
      );
    }
    return <ExtendedJsonView value={queriedJson} />;
  }, [queriedJson]);

  return (
    <div className="flex gap-2 p-2 h-screen bg-gray-200">
      <CodeMirror
        height="100%"
        value={jsonStr}
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
          value={jmespathStr}
          theme={vscodeLight}
          extensions={jmespathExtensions}
          onChange={handleInputJmespathStrChange}
        />
        {queriedJsonView}
      </div>
    </div>
  );
};

export default memo(App);
