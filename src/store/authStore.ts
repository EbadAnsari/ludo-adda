import { create } from "zustand";

interface AuthStore {
	user: any;
	profile: any;
	loading: boolean;
	setUser: (user: any) => void;
	setProfile: (profile: any) => void;
	setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
	user: null,
	profile: null,
	loading: true,
	setUser: (user) => set({ user }),
	setProfile: (profile) => set({ profile }),
	setLoading: (loading) => set({ loading }),
}));
