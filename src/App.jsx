import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect } from "react";
import { auth, db } from "./firebase/config";
import { useAuthStore } from "./store/authStore";

// Pages
import Layout from "./layout/Layout";

export default function App() {
	const { setUser, setProfile, setLoading } = useAuthStore();

	useEffect(() => {
		const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
			if (firebaseUser) {
				setUser(firebaseUser);
				const snap = await getDoc(doc(db, "users", firebaseUser.uid));
				if (snap.exists()) setProfile(snap.data());
			} else {
				setUser(null);
				setProfile(null);
			}
			setLoading(false);
		});
		return unsub;
	}, []);

	return <Layout />;
}
