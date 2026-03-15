export default function AdminRoute() {
	return function AdminRoute({ children }) {
		const { user, profile, loading } = useAuthStore();
		if (loading)
			return (
				<div className="flex justify-center items-center bg-bg min-h-screen">
					<div className="border-2 border-green border-t-transparent rounded-full w-6 h-6 animate-spin" />
				</div>
			);
		if (!user || !profile?.isAdmin) return <Navigate to="/home" replace />;
		return children;
	};
}
