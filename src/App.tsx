import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useRef } from "react";
import { auth, db } from "./firebase/config";
import { useAuthStore } from "./store/authStore";

// Pages
import Layout from "./layout/Layout";

export default function App() {
  const { setUser, setProfile, setLoading } = useAuthStore();
  const unsubProfileRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubProfileRef.current) unsubProfileRef.current();

      if (firebaseUser) {
        setUser(firebaseUser);
        unsubProfileRef.current = onSnapshot(doc(db, "users", firebaseUser.uid), (snap) => {
          if (snap.exists()) setProfile(snap.data() as any);
        });
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubAuth();
      if (unsubProfileRef.current) unsubProfileRef.current();
    };
  }, []);

  return <Layout />;
}
