import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import ApiConfigManager from '../lib/apiConfig'

export default function DashboardLayout() {
	const { user, logout } = useAuth()
	const navigate = useNavigate()
	const isRealApiMode = ApiConfigManager.getApiKey() !== 'pofpof'

	const handleLogout = () => {
		logout()
		navigate('/login')
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white border-b">
				<div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="text-xl font-bold">NC/ACC</div>
						<span className="text-gray-500 hidden sm:inline">Startups Dashboard</span>
					</div>
					<div className="flex items-center gap-3">
						<div className="text-right hidden sm:block">
							<div className="font-medium">{user?.name}</div>
							<div className="text-xs text-gray-500">{user?.startup?.name || user?.house}</div>
						</div>
						<button
							onClick={handleLogout}
							className="px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-sm"
						>
							Logout
						</button>
					</div>
				</div>
				<nav className="bg-white">
					<div className="max-w-6xl mx-auto px-4 flex gap-4">
						<Tab to="/progress" label="Your Startup" />
						<Tab to="/circles" label="Your Peer Mentoring Circle" />
						{isRealApiMode && <Tab to="/debug" label="Debug" />}
					</div>
				</nav>
			</header>
			<main className="max-w-6xl mx-auto p-4">
				<Outlet />
			</main>
		</div>
	)
}

function Tab({ to, label }: { to: string; label: string }) {
	return (
		<NavLink
			to={to}
			className={({ isActive }) =>
				`py-3 border-b-2 -mb-px ${
					isActive ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-black'
				}`
			}
		>
			{label}
		</NavLink>
	)
}


