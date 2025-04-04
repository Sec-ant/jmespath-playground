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
  useState,
  type ChangeEventHandler,
  type FC,
  type MouseEventHandler,
} from "react";
import { useShallow } from "zustand/shallow";
import ExtendedJsonView from "./components/ExtendedJsonView";
import JmespathEditorSeparator from "./components/JmespathEditorSeparator";
import JsonEditorSeparator from "./components/JsonEditorSeparator";
import { useHashStore, useHashStoreHydration } from "./store/hash";
import {
  ARRAY_PROJECTION_MODE_LIST,
  usePlaygroundStore,
  type ArrayProjectionMode,
} from "./store/playground";
import { isSafari } from "./utils/isSafari";
import { jmespathLinter } from "./utils/jmespathLinter";
import { jsonLinter } from "./utils/jsonLinter";
import { jsonLinterForSafari } from "./utils/jsonLinterForSafari";
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
  linter(isSafari() ? jsonLinterForSafari() : jsonLinter(), {
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

  const {
    jsonStr,
    jmespathStr,
    jsonEditorWidth,
    jmespathEditorHeight,
    updateJmespathByClick,
    arrayProjectionMode,
  } = usePlaygroundStore(
    useShallow(
      useCallback(
        ({
          jsonStr,
          jmespathStr,
          jsonEditorWidth,
          jmespathEditorHeight,
          updateJmespathByClick,
          arrayProjectionMode,
        }) => ({
          jsonStr,
          jmespathStr,
          jsonEditorWidth,
          jmespathEditorHeight,
          updateJmespathByClick,
          arrayProjectionMode,
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
      const { updateJmespathByClick, arrayProjectionMode } =
        usePlaygroundStore.getState();

      if (!updateJmespathByClick) {
        return;
      }

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
      const jmespath = resolveJmespath(node, view, {
        arrayProjectionMode,
      });
      updateStoreJmespathStr(jmespath);
    },
    [updateStoreJmespathStr]
  );

  const handleUpdateJmespathByClickChange = useCallback<
    ChangeEventHandler<HTMLInputElement>
  >((e) => {
    const { checked } = e.target;
    usePlaygroundStore.setState({ updateJmespathByClick: checked });
  }, []);

  const handleArrayProjectionModeChange = useCallback<
    ChangeEventHandler<HTMLSelectElement>
  >((e) => {
    const { value } = e.target;
    usePlaygroundStore.setState({
      arrayProjectionMode: value as ArrayProjectionMode,
    });
  }, []);

  const [copyResult, setCopyResult] = useState("");

  const showCopyResultTimeoutRef = useRef(0);
  const [showCopyResult, setShowCopyResult] = useState(false);
  useEffect(() => {
    if (!showCopyResult) {
      setCopyResult("");
    }
  }, [showCopyResult]);

  const handleShareButtonClick = useCallback(() => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        setCopyResult("✅ Share link copied to clipboard");
      })
      .catch(() => {
        setCopyResult("❌ Failed to copy share link");
      })
      .finally(() => {
        clearTimeout(showCopyResultTimeoutRef.current);
        setShowCopyResult(true);
        showCopyResultTimeoutRef.current = setTimeout(() => {
          setShowCopyResult(false);
        }, 1000);
      });
  }, []);

  return (
    <div className="flex flex-col p-4 p h-screen gap-2">
      <h1 className="shrink-0 text-xl font-bold">🛝 JMESPath Playground</h1>
      <div className="flex gap-4 shrink-0 items-center">
        <div className="flex gap-2 shrink-0 items-center">
          <input
            className="cursor-pointer"
            type="checkbox"
            id="update-jmespath-by-click"
            name="updateJmespathByClick"
            checked={updateJmespathByClick}
            onChange={handleUpdateJmespathByClickChange}
          />
          <label
            className="cursor-pointer select-none"
            htmlFor="update-jmespath-by-click"
          >
            Update JMESPath by click
          </label>
        </div>
        <div className="flex gap-2 shrink-0 items-center">
          <label
            className="cursor-pointer select-none"
            htmlFor="array-projection-mode"
          >
            Array projection mode
          </label>
          <select
            className="cursor-pointer valid:bg-white valid:text-black bg-gray-100 text-gray-500 rounded-sm"
            name="arrayProjectionMode"
            id="array-projection-mode"
            disabled={!updateJmespathByClick}
            value={arrayProjectionMode}
            onChange={handleArrayProjectionModeChange}
          >
            {ARRAY_PROJECTION_MODE_LIST.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </div>
        <button
          className="outline-1 outline-gray-400 bg-gray-100 px-2 rounded-sm cursor-pointer hover:bg-gray-200 active:bg-gray-300 transition-colors"
          onClick={handleShareButtonClick}
        >
          Share
        </button>
        {showCopyResult && (
          <span className="text-sm text-nowrap">{copyResult}</span>
        )}
      </div>
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
      <div className="flex gap-4 shrink-0 items-center justify-center text-sm">
        <a
          className="underline text-gray-600 cursor-pointer"
          href="https://github.com/Sec-ant/jmespath-playground"
        >
          GitHub
        </a>
        <a
          className="underline text-gray-600 cursor-pointer"
          href="https://jmespath.org/tutorial.html"
        >
          JMESPath Tutorial
        </a>
      </div>
    </div>
  );
};

export default memo(App);
