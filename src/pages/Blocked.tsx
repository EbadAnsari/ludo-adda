import { signOut } from "../firebase/auth";
import { useNavigate } from "react-router-dom";

export default function Blocked() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 gap-5">
      <h1 className="font-display font-bold text-2xl text-text1">Account Blocked</h1>
      <p className="text-text3 text-sm text-center">
        Your account has been blocked. Contact support for assistance.
      </p>
      <button
        onClick={async () => { await signOut(); navigate("/login"); }}
        className="text-red text-sm font-semibold"
      >
        Sign Out
      </button>
    </div>
  );
}
