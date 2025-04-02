import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PlaygroundState {
  jsonStr: string;
  jmespathStr: string;
  jsonEditorWidth: number;
  jmespathEditorHeight: number;
}

export const INITIAL_PLAYGROUND_STATE: PlaygroundState = {
  jsonStr: "",
  jmespathStr: "",
  jsonEditorWidth: 400,
  jmespathEditorHeight: 100,
};

export const usePlaygroundStore = create<PlaygroundState>()(
  persist(() => INITIAL_PLAYGROUND_STATE, {
    name: "playground-store",
  })
);
