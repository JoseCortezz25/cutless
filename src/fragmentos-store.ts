import { create } from "zustand";

interface FragmentosStore {
  fragments: string[];
  setFragments: (fragments: string[]) => void;
}

export const useFragmentosStore = create<FragmentosStore>((set) => ({
  fragments: [],
  setFragments: (fragments) => set({ fragments })
}));