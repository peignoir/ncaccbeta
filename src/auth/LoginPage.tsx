import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from './AuthContext'
import ApiConfigManager from '../lib/apiConfig'

export default function LoginPage() {
	const { isAuthenticated, login } = useAuth()
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const [apiKey, setApiKey] = useState(() => {
		// Check URL params first, then localStorage
		const urlApiKey = searchParams.get('apikey') || searchParams.get('api_key')
		if (urlApiKey) return urlApiKey
		const saved = localStorage.getItem('ncacc_api_key')
		return saved || ''
	})
	const [remember, setRemember] = useState<boolean>(() => localStorage.getItem('ncacc_remember') === '1')
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		if (isAuthenticated) navigate('/')
	}, [isAuthenticated, navigate])

	// Auto-login when API key is provided in URL
	useEffect(() => {
		const urlApiKey = searchParams.get('apikey') || searchParams.get('api_key')
		const autoLogin = searchParams.get('auto') === 'true' || searchParams.get('autologin') === 'true'
		
		if (urlApiKey && autoLogin && !isAuthenticated && !loading) {
			handleAutoLogin(urlApiKey)
		}
	}, [searchParams, isAuthenticated, loading])

	const handleAutoLogin = async (urlApiKey: string) => {
		try {
			setLoading(true)
			setError(null)
			
			// Special handling for pofpof
			if (urlApiKey.toLowerCase() === 'pofpof') {
				ApiConfigManager.setMode('mock')
				await login('bG9naW46MTc1MA==', true) // Default mock login
			} else {
				ApiConfigManager.setMode('real')
				ApiConfigManager.updateConfig({ apiKey: urlApiKey.trim() })
				localStorage.setItem('ncacc_api_key', urlApiKey.trim())
				await login('api-auth', true)
			}
		} catch (err) {
			setError('Auto-login failed. Please try logging in manually.')
		} finally {
			setLoading(false)
		}
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError(null)
		
		if (!apiKey || apiKey.trim().length === 0) {
			setError('Please enter your API key')
			return
		}
		
		try {
			setLoading(true)
			
			// Special handling for "pofpof" - use mock mode
			if (apiKey.toLowerCase() === 'pofpof') {
				console.log('[LoginPage] Special key detected - using mock mode')
				ApiConfigManager.setMode('mock')
				// Use a default mock login code
				await login('bG9naW46MTc1MA==', remember) // Franck's code as default
			} else {
				// Normal API key - use real mode
				console.log('[LoginPage] Using real API with key')
				ApiConfigManager.setMode('real')
				ApiConfigManager.updateConfig({ apiKey: apiKey.trim() })
				localStorage.setItem('ncacc_api_key', apiKey.trim())
				await login('api-auth', remember)
			}
			
			navigate('/')
		} catch (err: any) {
			console.error('[LoginPage] Login error:', err)
			setError(err.message || 'Login failed')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-white">
			<div className="w-full max-w-md p-8 bg-gray-50 rounded-md shadow-sm">
				<div className="text-center mb-6">
					<div className="text-3xl font-bold">NC/ACC</div>
					<div className="text-gray-500">No Cap Accelerator</div>
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
					<label className="block text-sm font-medium">API Key</label>
					<input
						type="password"
						placeholder="Enter your API key"
						value={apiKey}
						onChange={(e) => setApiKey(e.target.value)}
						className="w-full rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-primary"
					/>
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
				</form>
			</div>
		</div>
	)
}