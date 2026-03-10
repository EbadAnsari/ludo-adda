import { create } from 'zustand'

export const useBattleStore = create((set) => ({
  openBattles: [],
  myBattles: [],
  currentBattle: null,
  setOpenBattles: (openBattles) => set({ openBattles }),
  setMyBattles: (myBattles) => set({ myBattles }),
  setCurrentBattle: (currentBattle) => set({ currentBattle }),
}))
