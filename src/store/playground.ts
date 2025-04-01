import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PlaygroundState {
  jsonStr: string;
  jmespathStr: string;
}

export const INITIAL_PLAYGROUND_STATE: PlaygroundState = {
  jsonStr: "",
  jmespathStr: "",
};

export const usePlaygroundStore = create<PlaygroundState>()(
  persist(() => INITIAL_PLAYGROUND_STATE, {
    name: "playground-store",
  })
);
