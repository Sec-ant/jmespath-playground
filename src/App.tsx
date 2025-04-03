import { json } from "@codemirror/lang-json";
import { language, syntaxTree } from "@codemirror/language";
import { linter } from "@codemirror/lint";
import { keymap, type KeyBinding } from "@codemirror/view";
import { search, type JSONValue } from "@jmespath-community/jmespath";
import { vscodeLight } from "@uiw/codemirror-theme-vscode";
import CodeMirror, {
  placeholder,
  type ReactCodeMirrorProps,
  type ReactCodeMirrorRef,
} from "@uiw/react-codemirror";
import { jmespath } from "codemirror-lang-jmespath";
import { formatWithCursor, type Plugin } from "prettier";
import * as prettierPluginBabel from "prettier/plugins/babel";
import * as prettierPluginEstree from "prettier/plugins/estree";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type FC,
  type MouseEventHandler,
} from "react";
import { useShallow } from "zustand/shallow";
import ExtendedJsonView from "./components/ExtendedJsonView";
import JmespathEditorSeparator from "./components/JmespathEditorSeparator";
import JsonEditorSeparator from "./components/JsonEditorSeparator";
import { useHashStore, useHashStoreHydration } from "./store/hash";
import { usePlaygroundStore } from "./store/playground";
import { jmespathLinter } from "./utils/jmespathLinter";
import { jsonLinter } from "./utils/jsonLinter";
import { resolveJmespath } from "./utils/resolveJmespath";

const INVALID_JSON = Symbol("INVALID_JSON");
const INVALID_JMESPATH = Symbol("INVALID_JMESPATH");

const supportedKeymap = () =>
  keymap.of([
    {
      key: "Shift-Alt-f",
      run: (view) => {
        const { name: languageName } = view.state.facet(language) ?? {};

        if (languageName !== "json") {
          return false;
        }

        const source = view.state.doc.toString();

        const cursorOffset = view.state.selection.main.to;

        formatWithCursor(source, {
          parser: "json",
          cursorOffset,
          plugins: [prettierPluginBabel, prettierPluginEstree] as Plugin[],
        })
          .then(({ formatted, cursorOffset }) => {
            view.dispatch({
              changes: { from: 0, to: source.length, insert: formatted },
              selection: { anchor: cursorOffset, head: cursorOffset },
            });
          })
          .catch(() => {});

        return true;
      },
      preventDefault: true,
    },
  ] satisfies KeyBinding[]);

const jsonExtensions = [
  supportedKeymap(),
  json(),
  linter(jsonLinter(), {
    delay: 0,
  }),
  placeholder("Enter JSON here..."),
];

const jmespathExtensions = [
  supportedKeymap(),
  jmespath(),
  linter(jmespathLinter(), {
    delay: 0,
  }),
  placeholder("Enter JMESPath expression here..."),
];

const App: FC = () => {
  const hashHydrated = useHashStoreHydration();

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

  const updateStoreJsonStr = useCallback((value = "") => {
    useHashStore.setState({ jsonStr: value });
    usePlaygroundStore.setState({ jsonStr: value });
  }, []);

  const updateStoreJmespathStr = useCallback((value = "") => {
    useHashStore.setState({ jmespathStr: value });
    usePlaygroundStore.setState({ jmespathStr: value });
  }, []);

  useEffect(() => {
    if (hashHydrated) {
      usePlaygroundStore.setState({
        jsonStr: useHashStore.getState().jsonStr,
        jmespathStr: useHashStore.getState().jmespathStr,
      });
    }
  }, [hashHydrated]);

  const handleInputJsonStrChange = useCallback<
    Exclude<ReactCodeMirrorProps["onChange"], undefined>
  >(
    (value) => {
      updateStoreJsonStr(value);
    },
    [updateStoreJsonStr]
  );

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
  >(
    (value) => {
      updateStoreJmespathStr(value);
    },
    [updateStoreJmespathStr]
  );

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

  const handleJsonEditorClick = useCallback<MouseEventHandler>(
    (e) => {
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
      const node = tree.resolve(pos, 1);
      const jmespath = resolveJmespath(node, view);
      updateStoreJmespathStr(jmespath);
    },
    [updateStoreJmespathStr]
  );

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
          <JmespathEditorSeparator />
          <div className="grow overflow-auto p-2 bg-gray-100 rounded-md min-h-[100px]">
            {queriedJsonView}
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(App);
