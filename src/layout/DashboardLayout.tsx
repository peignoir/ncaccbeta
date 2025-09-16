import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import ApiConfigManager from '../lib/apiConfig'
import { useState, useEffect } from 'react'
import unifiedApi from '../lib/unifiedApi'

export default function DashboardLayout() {
	const { user, logout } = useAuth()
	const navigate = useNavigate()
	const location = useLocation()
	const isRealApiMode = ApiConfigManager.getApiKey() !== 'pofpof'
	const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

	// Statistics state
	const [stats, setStats] = useState({ total: 0, countries: 0, avgProgress: 0 })

	useEffect(() => {
		loadStatistics()
	}, [])

	const loadStatistics = async () => {
		try {
			const response = await unifiedApi.getStartups({ showAll: true })
			if (response.success && response.data) {
				const allStartups = response.data
				const total = allStartups.length
				const countries = new Set(
					allStartups
						.map(s => s.founder_country || s.country || '')
						.filter(Boolean)
				).size
				const avgProgress = allStartups.length > 0
					? Math.round(allStartups.reduce((sum, s) => sum + (s.progress_percent || 0), 0) / allStartups.length)
					: 0
				setStats({ total, countries, avgProgress })
			}
		} catch (error) {
			console.error('Failed to load statistics:', error)
		}
	}

	const handleLogout = () => {
		logout()
		navigate('/login')
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white border-b">
				<div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<div className="text-xl font-bold">nc/acc</div>
							<span className="text-gray-500 hidden sm:inline">Startups Dashboard</span>
						</div>
						<div className="flex items-center gap-3 text-xs text-gray-600 border-l pl-4">
							<div className="flex items-center gap-1">
								<span className="font-bold text-indigo-600">{stats.total}</span>
								<span>Startups</span>
							</div>
							<div className="flex items-center gap-1">
								<span className="font-bold text-green-600">{stats.countries}</span>
								<span>Countries</span>
							</div>
							<div className="flex items-center gap-1">
								<span className="font-bold text-purple-600">{stats.avgProgress}%</span>
								<span>Avg Progress</span>
							</div>
						</div>
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
						<Tab to="/progress" label="🚀 Your Startup" isPrimary currentPath={location.pathname} />
						<Tab to="/circles" label="👥 Your Peer Mentoring Circle" isPrimary isHighlighted currentPath={location.pathname} />
						{/* Admin tabs for pofpof users */}
						{!isRealApiMode && (
							<Tab to="/api-usage" label="📊 API Usage" />
						)}
						{/* Debug tab - uncomment to enable on localhost */}
						{/* {isLocalhost && <Tab to="/debug" label="🔧 Debug" />} */}
					</div>
				</nav>
			</header>
			<main className="max-w-6xl mx-auto p-4">
				<Outlet />
			</main>
		</div>
	)
}

function Tab({ to, label, isPrimary = false, isHighlighted = false, currentPath = '' }: {
	to: string;
	label: string;
	isPrimary?: boolean;
	isHighlighted?: boolean;
	currentPath?: string;
}) {
	const isCirclesTab = to === '/circles';
	const isOnCirclesPage = currentPath === '/circles';
	const shouldHighlight = isHighlighted && isCirclesTab && !isOnCirclesPage;

	return (
		<NavLink
			to={to}
			className={({ isActive }) =>
				`py-4 px-3 border-b-3 -mb-px font-medium transition-all duration-200 relative ${
					isActive
						? isPrimary
							? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg shadow-sm scale-105'
							: 'border-indigo-500 text-indigo-600'
						: isPrimary
							? 'border-transparent text-gray-700 hover:text-indigo-600 hover:bg-white/50 hover:border-indigo-300'
							: 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
				} ${
					isPrimary ? 'text-base' : 'text-sm'
				} ${
					shouldHighlight ? 'bg-gradient-to-r from-purple-200 via-pink-200 to-yellow-200 rounded-t-lg shadow-md transform hover:scale-110' : ''
				}`
			}
		>
			{shouldHighlight && (
				<span className="absolute -top-3 -right-3 flex h-4 w-4">
					<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400"></span>
					<span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
				</span>
			)}
			<span className={shouldHighlight ? 'font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600' : ''}>
				{label}
			</span>
		</NavLink>
	)
}


