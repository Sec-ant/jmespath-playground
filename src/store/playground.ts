import { create } from "zustand";
import { persist } from "zustand/middleware";

const STORE_NAME = "playground-store";

export const ARRAY_PROJECTION_LIST = [
  "none",
  "wildcard",
  "slice to",
  "slice from",
  "slice",
  "flatten",
] as const;

export type ArrayProjection = (typeof ARRAY_PROJECTION_LIST)[number];

export interface PlaygroundState {
  jsonStr: string;
  jmespathStr: string;
  jsonEditorWidth: number;
  jmespathEditorHeight: number;
  autoUpdateJmespath: boolean;
  arrayProjection: ArrayProjection;
}

export const INITIAL_PLAYGROUND_STATE: PlaygroundState = {
  jsonStr: "",
  jmespathStr: "",
  jsonEditorWidth: 400,
  jmespathEditorHeight: 100,
  autoUpdateJmespath: true,
  arrayProjection: "none",
};

export const usePlaygroundStore = create<PlaygroundState>()(
  persist(() => INITIAL_PLAYGROUND_STATE, {
    name: STORE_NAME,
  }),
);
