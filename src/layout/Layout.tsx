import { Navigate, Route, Routes } from "react-router-dom";

// Pages
// import PrivateRoute from "../routes/PrivateRoute";
import Home from "../pages/Home";
import Login from "../pages/Login";
import OTP from "../pages/OTP";
import Profile from "../pages/Profile";
import ProfileSetup from "../pages/ProfileSetup";
import Splash from "../pages/Splash";
import Blocked from "../pages/Blocked";
import Wallet from "../pages/Wallet";
import AdminBattles from "../pages/admin/Battles";
import AdminDashboard from "../pages/admin/Dashboard";
import AdminDeposits from "../pages/admin/Deposits";
import AdminDisputes from "../pages/admin/Disputes";
import AdminUsers from "../pages/admin/Users";
import AdminWithdrawals from "../pages/admin/Withdrawals";
import BattleRoom from "../pages/battle/BattleRoom";
import CreateBattle from "../pages/battle/CreateBattle";
import SubmitResult from "../pages/battle/SubmitResult";
import AdminRoute from "../routes/AdminRoute";
import PrivateRoute from "../routes/PrivateRoute";

export default function Layout() {
	return (
		<Routes>
			<Route path="/" element={<Splash />} />
			<Route path="/login" element={<Login />} />
			<Route path="/otp" element={<OTP />} />
			<Route path="/setup" element={<ProfileSetup />} />
			<Route path="/blocked" element={<Blocked />} />
			<Route
				path="/home"
				element={
					<PrivateRoute>
						<Home />
					</PrivateRoute>
				}
			/>
			<Route
				path="/wallet"
				element={
					<PrivateRoute>
						<Wallet />
					</PrivateRoute>
				}
			/>
			<Route
				path="/profile"
				element={
					<PrivateRoute>
						<Profile />
					</PrivateRoute>
				}
			/>
			<Route
				path="/battle/create"
				element={
					<PrivateRoute>
						<CreateBattle />
					</PrivateRoute>
				}
			/>
			<Route
				path="/battle/:battleId/room"
				element={
					<PrivateRoute>
						<BattleRoom />
					</PrivateRoute>
				}
			/>
			<Route
				path="/battle/:battleId/result"
				element={
					<PrivateRoute>
						<SubmitResult />
					</PrivateRoute>
				}
			/>
			<Route
				path="/admin"
				element={
					<AdminRoute>
						<AdminDashboard />
					</AdminRoute>
				}
			/>
			<Route
				path="/admin/deposits"
				element={
					<AdminRoute>
						<AdminDeposits />
					</AdminRoute>
				}
			/>
			<Route
				path="/admin/withdrawals"
				element={
					<AdminRoute>
						<AdminWithdrawals />
					</AdminRoute>
				}
			/>
			<Route
				path="/admin/disputes"
				element={
					<AdminRoute>
						<AdminDisputes />
					</AdminRoute>
				}
			/>
			<Route
				path="/admin/battles"
				element={
					<AdminRoute>
						<AdminBattles />
					</AdminRoute>
				}
			/>
			<Route
				path="/admin/users"
				element={
					<AdminRoute>
						<AdminUsers />
					</AdminRoute>
				}
			/>
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}
