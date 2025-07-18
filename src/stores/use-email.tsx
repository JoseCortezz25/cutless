import { create } from "zustand";

export interface Fragment {
  id: string;
  file: File;
  base64: string;
}

interface EmailStore {
  email: string | null;
  image: File | null;
  fragments: Fragment[];
  generatedHtml: string | null;
  setEmail: (email: string) => void;
  setImage: (image: File) => void;
  setFragments: (fragments: Fragment[]) => void;
  setGeneratedHtml: (generatedHtml: string) => void;
}

export const useEmail = create<EmailStore>((set) => ({
  email: "",
  image: null,
  fragments: [],
  generatedHtml: null,
  setEmail: (email) => set({ email }),
  setImage: (image) => set({ image }),
  setFragments: (fragments) => set({ fragments }),
  setGeneratedHtml: (generatedHtml: string) => set({ generatedHtml })
}));