import { create } from 'zustand'

export const useWalletStore = create((set) => ({
  transactions: [],
  setTransactions: (transactions) => set({ transactions }),
}))
