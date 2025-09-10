import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from './AuthContext'
import ApiConfigManager from '../lib/apiConfig'

export default function LoginPage() {
	const { isAuthenticated, login } = useAuth()
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const [code, setCode] = useState('')
	const [apiKey, setApiKey] = useState(() => {
		// Check URL params first, then localStorage
		const urlApiKey = searchParams.get('apikey') || searchParams.get('api_key')
		if (urlApiKey) {
			console.log('[LoginPage] Found API key in URL parameters')
			return urlApiKey
		}
		// Try to load saved API key from localStorage
		const saved = localStorage.getItem('ncacc_api_key')
		return saved || ''
	})
	const [remember, setRemember] = useState<boolean>(() => localStorage.getItem('ncacc_remember') === '1')
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	// Always start in 'real' mode by default, hide mock mode completely
	const [apiMode, setApiMode] = useState(() => {
		ApiConfigManager.setMode('real')
		return 'real'
	})
	const [showApiToggle, setShowApiToggle] = useState(false)

	// Check if "pofpof" is entered as API key to enable Mock mode
	useEffect(() => {
		if (apiKey.toLowerCase() === 'pofpof') {
			setShowApiToggle(true)
			// Automatically switch to Mock mode
			if (apiMode !== 'mock') {
				ApiConfigManager.setMode('mock')
				setApiMode('mock')
			}
		}
	}, [apiKey])

	useEffect(() => {
		const unsubscribe = ApiConfigManager.onModeChange((mode) => {
			console.log('[LoginPage] API mode changed to:', mode)
			setApiMode(mode)
			setError(null)
			setCode('')
		})
		return unsubscribe
	}, [])

	useEffect(() => {
		if (isAuthenticated) navigate('/')
	}, [isAuthenticated, navigate])

	// Auto-login when API key is provided in URL
	useEffect(() => {
		const urlApiKey = searchParams.get('apikey') || searchParams.get('api_key')
		const autoLogin = searchParams.get('auto') === 'true' || searchParams.get('autologin') === 'true'
		
		if (urlApiKey && autoLogin && !isAuthenticated && !loading) {
			console.log('[LoginPage] Auto-login with API key from URL')
			// Set to real API mode if API key is provided
			if (apiMode !== 'real') {
				ApiConfigManager.setMode('real')
				setApiMode('real')
			}
			// Trigger login automatically
			handleAutoLogin(urlApiKey)
		}
	}, [searchParams, isAuthenticated, loading])

	const handleAutoLogin = async (urlApiKey: string) => {
		try {
			setLoading(true)
			setError(null)
			
			// Update the API configuration with the URL key
			ApiConfigManager.updateConfig({ apiKey: urlApiKey.trim() })
			localStorage.setItem('ncacc_api_key', urlApiKey.trim())
			
			console.log('[LoginPage] Attempting auto-login with API key from URL')
			await login('api-auth', true) // Remember = true for auto-login
		} catch (err) {
			setError('Auto-login failed. Please try logging in manually.')
		} finally {
			setLoading(false)
		}
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError(null)
		
		// Different validation for different API modes
		if (apiMode === 'mock') {
			if (!code || !/^[-A-Za-z0-9+/=]+$/.test(code)) {
				setError('Please enter a valid BASE64 code')
				return
			}
		} else {
			// Skip API key validation if "pofpof" since it auto-switches to Mock mode
			if (apiKey.toLowerCase() === 'pofpof') {
				// pofpof enables Mock mode, so we need a BASE64 code
				if (!code || !/^[-A-Za-z0-9+/=]+$/.test(code)) {
					setError('Please enter a valid BASE64 code for Mock mode')
					return
				}
			} else {
				// For real API, validate API key
				if (!apiKey || apiKey.trim().length === 0) {
					setError('Please enter your API key')
					return
				}
				// Update the API configuration with user's key
				console.log('[LoginPage] Setting user API key')
				ApiConfigManager.updateConfig({ apiKey: apiKey.trim() })
				localStorage.setItem('ncacc_api_key', apiKey.trim())
			}
		}
		
		try {
			setLoading(true)
			console.log(`[LoginPage] Attempting login with ${apiMode} API`)
			// For real API, pass any value since authentication uses the API key
			const loginCode = apiMode === 'mock' ? code.trim() : 'api-auth'
			await login(loginCode, remember)
			navigate('/')
		} catch (err: any) {
			console.error('[LoginPage] Login error:', err)
			setError(err.message || 'Login failed')
		} finally {
			setLoading(false)
		}
	}

	const toggleApiMode = () => {
		const newMode = apiMode === 'mock' ? 'real' : 'mock'
		console.log('[LoginPage] Switching API mode to:', newMode)
		ApiConfigManager.setMode(newMode)
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-white relative">
			{/* API Mode Indicator - Only show when secret key is entered */}
			{showApiToggle && (
				<div className="absolute top-4 right-4">
					<button
						onClick={toggleApiMode}
						className={`px-4 py-2 rounded-lg font-medium transition-colors ${
							apiMode === 'mock' 
								? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
								: 'bg-green-100 text-green-700 hover:bg-green-200'
						}`}
					>
						API: {apiMode === 'mock' ? 'Mock' : 'Real (Socap.dev)'}
					</button>
				</div>
			)}

			<div className="w-full max-w-md p-8 bg-gray-50 rounded-md shadow-sm">
				<div className="text-center mb-6">
					<div className="text-3xl font-bold">NC/ACC</div>
					<div className="text-gray-500">No Cap Accelerator</div>
					{showApiToggle && (
						<div className="text-xs text-gray-400 mt-2">
							{apiMode === 'mock' ? 'Using Local Mock Data' : 'Using Socap.dev API'}
						</div>
					)}
					{(searchParams.get('apikey') || searchParams.get('api_key')) && (
						<div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
							API key provided via URL
							{searchParams.get('auto') === 'true' || searchParams.get('autologin') === 'true' 
								? ' - Auto-login enabled' 
								: ' - Click login to authenticate'}
						</div>
					)}
				</div>
				<form onSubmit={handleSubmit} className="space-y-4">
					{apiMode === 'mock' ? (
						<>
							<label className="block text-sm font-medium">Authentication Code</label>
							<input
								type="text"
								placeholder="BASE64 code (e.g., bG9naW46MTc1MA==)"
								value={code}
								onChange={(e) => setCode(e.target.value)}
								className="w-full rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-primary"
							/>
						</>
					) : (
						<>
							<label className="block text-sm font-medium">Socap.dev API Key</label>
							<input
								type="password"
								placeholder="Enter your API key (e.g., sCERK6PhSbOU...)"
								value={apiKey}
								onChange={(e) => setApiKey(e.target.value)}
								className="w-full rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-green-500"
							/>
						</>
					)}
					<div className="flex items-center justify-between">
						<label className="inline-flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={remember}
								onChange={(e) => setRemember(e.target.checked)}
								className="rounded"
							/>
							<span>Remember me</span>
						</label>
						<button
							type="submit"
							disabled={loading}
							className="bg-primary text-white px-4 py-2 rounded-md hover:opacity-90 transition disabled:opacity-50"
						>
							{loading ? 'Verifying…' : 'Login'}
						</button>
					</div>
					{error && <div className="text-red-600 text-sm">{error}</div>}
					
					{/* Help text - Only show mock mode help when API toggle is visible */}
					{showApiToggle && apiMode === 'mock' && (
						<div className="text-xs text-gray-500 mt-4 border-t pt-3">
							<div>
								<p className="font-medium text-blue-600">Mock API Mode</p>
								<p className="mt-1">Uses local CSV data. Example codes:</p>
								<ul className="mt-1 space-y-1 text-gray-600">
									<li>• bG9naW46MTc1MA== (NPID 1750 - Franck)</li>
									<li>• bG9naW46MTI3NA== (NPID 1274)</li>
									<li>• bG9naW46MjM0MQ== (NPID 2341)</li>
								</ul>
							</div>
						</div>
					)}
				</form>
			</div>
		</div>
	)
}


