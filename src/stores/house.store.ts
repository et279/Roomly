import { create } from "zustand";
import type { Home, HomeMember } from "@/types";

type HouseState = {
  home: Home | null;
  members: HomeMember[];
  setHome: (home: Home | null) => void;
  setMembers: (members: HomeMember[]) => void;
};

export const useHouseStore = create<HouseState>((set) => ({
  home: null,
  members: [],
  setHome: (home) => set({ home }),
  setMembers: (members) => set({ members }),
}));
