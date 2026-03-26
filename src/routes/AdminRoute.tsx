import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuthStore();

  if (loading)
    return (
      <div className="flex justify-center items-center bg-bg min-h-screen">
        <div className="border-2 border-green border-t-transparent rounded-full w-6 h-6 animate-spin" />
      </div>
    );

  if (!user) return <Navigate to="/login" replace />;

  // Double check: Zustand profile isAdmin AND the route is only accessible if loaded
  if (!profile?.isAdmin) return <Navigate to="/home" replace />;

  return children;
}
