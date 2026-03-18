import { create } from 'zustand'

interface WalletStore {
  transactions: any[];
  setTransactions: (transactions: any[]) => void;
}

export const useWalletStore = create<WalletStore>((set) => ({
  transactions: [],
  setTransactions: (transactions) => set({ transactions }),
}))
