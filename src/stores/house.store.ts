import { create } from "zustand";
import type { House, HouseMember } from "@/types";

type HouseState = {
  house: House | null;
  members: HouseMember[];
  setHouse: (house: House | null) => void;
  setMembers: (members: HouseMember[]) => void;
};

export const useHouseStore = create<HouseState>((set) => ({
  house: null,
  members: [],
  setHouse: (house) => set({ house }),
  setMembers: (members) => set({ members }),
}));
