import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import LoginPage from './auth/LoginPage'
import DashboardLayout from './layout/DashboardLayout'
import ProgressPage from './pages/ProgressPage'
import CirclesPage from './pages/CirclesPage'

function ProtectedRoute({ children }: { children: JSX.Element }) {
	const { isAuthenticated } = useAuth()
	if (!isAuthenticated) return <Navigate to="/login" replace />
	return children
}

export default function App() {
	return (
		<AuthProvider>
			<Routes>
				<Route path="/login" element={<LoginPage />} />
				<Route
					path="/"
					element={
						<ProtectedRoute>
							<DashboardLayout />
						</ProtectedRoute>
					}
				>
					<Route index element={<ProgressPage />} />
					<Route path="progress" element={<ProgressPage />} />
					<Route path="circles" element={<CirclesPage />} />
				</Route>
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</AuthProvider>
	)
}


