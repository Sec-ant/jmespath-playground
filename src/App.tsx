import {
  useMemo,
  type FC,
  useCallback,
  memo,
  type MouseEventHandler,
  useRef,
} from "react";
import { jmespath } from "codemirror-lang-jmespath";
import { useShallow } from "zustand/shallow";
import CodeMirror, {
  type ReactCodeMirrorRef,
  type ReactCodeMirrorProps,
} from "@uiw/react-codemirror";
import { vscodeLight } from "@uiw/codemirror-theme-vscode";
import { placeholder } from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { linter } from "@codemirror/lint";
import { search, type JSONValue } from "@jmespath-community/jmespath";
import { syntaxTree } from "@codemirror/language";
import ExtendedJsonView from "./components/ExtendedJsonView";
import { usePlaygroundStore } from "./store/playground";
import JsonEditorSeparator from "./components/JsonEditorSeparator";
import JmesPathEditorSeparator from "./components/JmesPathEditorSeparator";
import { jmespathLinter } from "./utils/jmespathLinter";
import { jsonLinter } from "./utils/jsonLinter";

const INVALID_JSON = Symbol("INVALID_JSON");
const INVALID_JMESPATH = Symbol("INVALID_JMESPATH");

const jsonExtensions = [
  json(),
  linter(jsonLinter(), {
    delay: 0,
  }),
  placeholder("Enter JSON here..."),
];

const jmespathExtensions = [
  jmespath(),
  linter(jmespathLinter(), {
    delay: 0,
  }),
  placeholder("Enter JMESPath expression here..."),
];

const App: FC = () => {
  const { jsonStr, jmespathStr, jsonEditorWidth, jmespathEditorHeight } =
    usePlaygroundStore(
      useShallow(
        useCallback(
          ({
            jsonStr,
            jmespathStr,
            jsonEditorWidth,
            jmespathEditorHeight,
          }) => ({
            jsonStr,
            jmespathStr,
            jsonEditorWidth,
            jmespathEditorHeight,
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
    if (jsonStr === "") {
      return null;
    }

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
        <span
          style={{
            color: "#d11",
            fontFamily: "var(--w-rjv-font-family, Menlo, monospace)",
            fontSize: 13,
            lineHeight: 1.4,
          }}
        >
          {queriedJson.description}
        </span>
      );
    }
    return <ExtendedJsonView value={queriedJson} />;
  }, [queriedJson]);

  const jsonEditorRef = useRef<ReactCodeMirrorRef>(null);

  const handleJsonEditorClick = useCallback<MouseEventHandler>((e) => {
    const { view, view: { state } = {} } = jsonEditorRef.current ?? {};

    if (!view || !state) {
      return;
    }

    const { clientX, clientY } = e;

    const pos = view.posAtCoords({ x: clientX, y: clientY });

    if (!pos) {
      return;
    }

    const tree = syntaxTree(state);

    const treeCursor = tree.cursorAt(pos, 1);

    console.log(treeCursor);
  }, []);

  return (
    <div className="flex flex-col p-4 h-screen gap-2">
      <h1 className="shrink-0 text-xl font-bold">JMESPath Playground</h1>
      <div className="flex grow min-h-0">
        <div className="h-full shrink-0" style={{ width: jsonEditorWidth }}>
          <CodeMirror
            ref={jsonEditorRef}
            height="100%"
            value={jsonStr}
            theme={vscodeLight}
            onChange={handleInputJsonStrChange}
            onClick={handleJsonEditorClick}
            extensions={jsonExtensions}
            style={{
              height: "100%",
            }}
          />
        </div>
        <JsonEditorSeparator />
        <div className="flex flex-col flex-grow min-w-[400px] overflow-y-auto">
          <div
            className="w-full shrink-0"
            style={{ height: jmespathEditorHeight }}
          >
            <CodeMirror
              height="100%"
              value={jmespathStr}
              theme={vscodeLight}
              extensions={jmespathExtensions}
              onChange={handleInputJmespathStrChange}
              style={{
                height: "100%",
              }}
            />
          </div>
          <JmesPathEditorSeparator />
          <div className="grow overflow-auto p-2 bg-gray-100 rounded-md min-h-[100px]">
            {queriedJsonView}
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(App);
