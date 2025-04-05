import { json } from "@codemirror/lang-json";
import { language } from "@codemirror/language";
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
} from "react";
import { useShallow } from "zustand/shallow";
import ExtendedJsonView from "./components/ExtendedJsonView";
import JmespathEditorSeparator from "./components/JmespathEditorSeparator";
import JsonEditorSeparator from "./components/JsonEditorSeparator";
import { useHashStore, useHashStoreHydration } from "./store/hash";
import {
  ARRAY_PROJECTION_LIST,
  usePlaygroundStore,
  type ArrayProjection,
} from "./store/playground";
import { getSelectedNode } from "./utils/getSelectedNode";
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
    autoUpdateJmespath,
    arrayProjection,
  } = usePlaygroundStore(
    useShallow(
      useCallback(
        ({
          jsonStr,
          jmespathStr,
          jsonEditorWidth,
          jmespathEditorHeight,
          autoUpdateJmespath,
          arrayProjection,
        }) => ({
          jsonStr,
          jmespathStr,
          jsonEditorWidth,
          jmespathEditorHeight,
          autoUpdateJmespath,
          arrayProjection,
        }),
        [],
      ),
    ),
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
    [updateStoreJsonStr],
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

  const isJmespathManuallyUpdatedRef = useRef(true);

  const handleInputJmespathStrChange = useCallback<
    Exclude<ReactCodeMirrorProps["onChange"], undefined>
  >(
    (value) => {
      updateStoreJmespathStr(value);
      isJmespathManuallyUpdatedRef.current = true;
    },
    [updateStoreJmespathStr],
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

  const handleJsonEditorUpdate = useCallback<
    Exclude<ReactCodeMirrorProps["onUpdate"], undefined>
  >(
    (viewUpdate) => {
      if (!viewUpdate.selectionSet) {
        return;
      }
      const { autoUpdateJmespath: updateJmespathByClick, arrayProjection } =
        usePlaygroundStore.getState();
      if (!updateJmespathByClick) {
        return;
      }
      const { state } = viewUpdate;
      const node = getSelectedNode(state);
      const jmespath = resolveJmespath(node, state, {
        arrayProjection,
      });
      updateStoreJmespathStr(jmespath);
      isJmespathManuallyUpdatedRef.current = false;
    },
    [updateStoreJmespathStr],
  );

  const handleUpdateJmespathByClickChange = useCallback<
    ChangeEventHandler<HTMLInputElement>
  >((e) => {
    const { checked } = e.target;
    usePlaygroundStore.setState({ autoUpdateJmespath: checked });
  }, []);

  const handleArrayProjectionChange = useCallback<
    ChangeEventHandler<HTMLSelectElement>
  >((e) => {
    const { value } = e.target;
    usePlaygroundStore.setState({
      arrayProjection: value as ArrayProjection,
    });
  }, []);

  useEffect(() => {
    if (isJmespathManuallyUpdatedRef.current) {
      return;
    }
    const { state } = jsonEditorRef.current?.view ?? {};
    if (!state) {
      return;
    }
    const node = getSelectedNode(state);
    const jmespath = resolveJmespath(node, state, {
      arrayProjection,
    });
    updateStoreJmespathStr(jmespath);
    isJmespathManuallyUpdatedRef.current = false;
  }, [arrayProjection, updateStoreJmespathStr]);

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
    <div className="p flex h-screen min-w-fit flex-col gap-2 p-4">
      <h1 className="shrink-0 text-xl font-bold">🛝 JMESPath Playground</h1>
      <div className="flex shrink-0 items-center gap-4">
        <div className="flex shrink-0 items-center gap-2">
          <input
            className="cursor-pointer"
            type="checkbox"
            id="auto-update-jmespath"
            name="autoUpdateJmespath"
            checked={autoUpdateJmespath}
            onChange={handleUpdateJmespathByClickChange}
          />
          <label
            className="cursor-pointer select-none"
            htmlFor="auto-update-jmespath"
          >
            Auto update JMESPath
          </label>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <label
            className="cursor-pointer select-none"
            htmlFor="array-projection"
          >
            Array projection
          </label>
          <select
            className="cursor-pointer rounded-sm bg-gray-100 px-1 text-gray-500 valid:bg-white valid:text-black"
            name="arrayProjection"
            id="array-projection"
            disabled={!autoUpdateJmespath}
            value={arrayProjection}
            onChange={handleArrayProjectionChange}
          >
            {ARRAY_PROJECTION_LIST.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </div>
        <button
          className="cursor-pointer rounded-sm bg-gray-100 px-2 outline-1 outline-gray-400 transition-colors hover:bg-gray-200 active:bg-gray-300"
          onClick={handleShareButtonClick}
        >
          Share
        </button>
        {showCopyResult && (
          <span className="text-sm text-nowrap">{copyResult}</span>
        )}
      </div>
      <div className="flex min-h-0 grow">
        <div className="h-full shrink-0" style={{ width: jsonEditorWidth }}>
          <CodeMirror
            ref={jsonEditorRef}
            height="100%"
            value={jsonStr}
            theme={vscodeLight}
            onChange={handleInputJsonStrChange}
            onUpdate={handleJsonEditorUpdate}
            extensions={jsonExtensions}
            style={{
              height: "100%",
            }}
          />
        </div>
        <JsonEditorSeparator />
        <div className="flex min-w-[400px] flex-grow flex-col overflow-y-auto">
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
          <div className="min-h-[100px] grow overflow-auto rounded-md bg-gray-100 p-2">
            {queriedJsonView}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-center gap-4 text-sm">
        <a
          className="cursor-pointer text-gray-600 underline"
          href="https://github.com/Sec-ant/jmespath-playground"
          target="_blank"
        >
          GitHub
        </a>
        <a
          className="cursor-pointer text-gray-600 underline"
          href="https://jmespath.org/tutorial.html"
          target="_blank"
        >
          JMESPath Tutorial
        </a>
      </div>
    </div>
  );
};

export default memo(App);
