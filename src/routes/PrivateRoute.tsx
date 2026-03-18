import { useAuthStore } from "../store/authStore";

export default function PrivateRoute({ children }: { children: any }) {
	const { user, loading } = useAuthStore();
	// if (loading)
	// 	return (
	// 		<div className="flex justify-center items-center bg-bg min-h-screen">
	// 			<div className="border-2 border-green border-t-transparent rounded-full w-6 h-6 animate-spin" />
	// 		</div>
	// 	);
	// if (!user) return <Navigate to="/login" replace />;
	return children;
}
