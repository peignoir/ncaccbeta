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
				<nav className="bg-gradient-to-r from-indigo-50 to-purple-50 border-t border-gray-100">
					<div className="max-w-6xl mx-auto px-4 flex gap-6">
						<Tab to="/progress" label="🚀 Your Startup" isPrimary />
						<Tab to="/circles" label="👥 Your Peer Mentoring Circle" isPrimary />
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

function Tab({ to, label, isPrimary = false }: { to: string; label: string; isPrimary?: boolean }) {
	return (
		<NavLink
			to={to}
			className={({ isActive }) =>
				`py-4 px-2 border-b-3 -mb-px font-medium transition-all duration-200 ${
					isActive 
						? isPrimary 
							? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg shadow-sm scale-105' 
							: 'border-indigo-500 text-indigo-600'
						: isPrimary
							? 'border-transparent text-gray-700 hover:text-indigo-600 hover:bg-white/50 hover:border-indigo-300'
							: 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
				} ${
					isPrimary ? 'text-base' : 'text-sm'
				}`
			}
		>
			{label}
		</NavLink>
	)
}


