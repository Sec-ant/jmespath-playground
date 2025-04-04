import { type JSONValue } from "@jmespath-community/jmespath";
import { useEffect, useState } from "react";
import { create } from "zustand";
import {
  persist,
  type PersistStorage,
  type StorageValue,
} from "zustand/middleware";
import { decode } from "../utils/decode";
import { encode } from "../utils/encode";
import {
  INITIAL_PLAYGROUND_STATE,
  usePlaygroundStore,
  type PlaygroundState,
} from "./playground";

const STORE_NAME = "hash-store";

export const hydrationErrorEventTarget = new EventTarget();

function getUrlHash() {
  return window.location.hash.slice(1);
}

const hashStateStorage: PersistStorage<HashState> = {
  getItem: async (key: string) => {
    let urlStore: JSONValue | undefined;
    const urlHash = getUrlHash();

    if (urlHash) {
      const searchParams = new URLSearchParams(urlHash);
      if (searchParams.has(key)) {
        urlStore = await decode(searchParams.get(STORE_NAME) as string);
      }
    }

    if (
      typeof urlStore !== "object" ||
      urlStore === null ||
      Array.isArray(urlStore) ||
      !("state" in urlStore)
    ) {
      throw new Error("Invalid url hash store");
    }

    return urlStore as StorageValue<HashState>;
  },

  setItem: async (key: string, value: StorageValue<HashState>) => {
    const searchParams = new URLSearchParams(getUrlHash());
    searchParams.set(key, await encode(value));
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}#${searchParams.toString()}`,
    );
  },

  removeItem: async (key: string) => {
    const searchParams = new URLSearchParams(getUrlHash());
    searchParams.delete(key);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}#${searchParams.toString()}`,
    );
  },
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface HashState
  extends Pick<PlaygroundState, "jsonStr" | "jmespathStr"> {}

export const INITIAL_HASH_STATE: HashState = {
  jsonStr: INITIAL_PLAYGROUND_STATE.jsonStr,
  jmespathStr: INITIAL_PLAYGROUND_STATE.jmespathStr,
};

export const useHashStore = create<HashState>()(
  persist(() => INITIAL_HASH_STATE, {
    name: STORE_NAME,
    storage: hashStateStorage,
    partialize: (state): HashState => ({
      jsonStr: state.jsonStr,
      jmespathStr: state.jmespathStr,
    }),
    onRehydrateStorage: () => {
      return (_, error) => {
        if (error instanceof Error) {
          const { jsonStr, jmespathStr } = usePlaygroundStore.getState();
          useHashStore.setState({
            jsonStr,
            jmespathStr,
          });
        }
      };
    },
  }),
);

export function useHashStoreHydration() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsubHydrate = useHashStore.persist.onHydrate(() =>
      setHydrated(false),
    );

    const unsubFinishHydration = useHashStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    setHydrated(useHashStore.persist.hasHydrated());

    return () => {
      unsubHydrate();
      unsubFinishHydration();
    };
  }, []);

  return hydrated;
}
