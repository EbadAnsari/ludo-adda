import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuthStore();

  if (loading)
    return (
      <div className="flex justify-center items-center bg-bg min-h-screen">
        <div className="border-2 border-green border-t-transparent rounded-full w-6 h-6 animate-spin" />
      </div>
    );

  if (!user) return <Navigate to="/login" replace />;
  if (!profile) return <Navigate to="/setup" replace />;
  if (profile.isBlocked) return <Navigate to="/blocked" replace />;

  return children;
}
