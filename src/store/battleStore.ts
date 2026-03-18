import { create } from "zustand";
import { Battle } from "../interface/Battle";

interface BattleStore {
	openBattles: Battle[];
	myBattles: Battle[];
	currentBattle: Battle;
	setOpenBattles: (openBattles: Battle[]) => void;
	setMyBattles: (myBattles: Battle[]) => void;
	setCurrentBattle: (currentBattle: Battle) => void;
}

export const useBattleStore = create<BattleStore>((set) => ({
	openBattles: [],
	myBattles: [],
	currentBattle: null,
	setOpenBattles: (openBattles) => set({ openBattles }),
	setMyBattles: (myBattles) => set({ myBattles }),
	setCurrentBattle: (currentBattle) => set({ currentBattle }),
}));
