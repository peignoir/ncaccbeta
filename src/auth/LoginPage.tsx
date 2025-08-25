import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function LoginPage() {
	const { isAuthenticated, login } = useAuth()
	const navigate = useNavigate()
	const [code, setCode] = useState('')
	const [remember, setRemember] = useState<boolean>(() => localStorage.getItem('ncacc_remember') === '1')
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		if (isAuthenticated) navigate('/')
	}, [isAuthenticated, navigate])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError(null)
		if (!code || !/^[-A-Za-z0-9+/=]+$/.test(code)) {
			setError('Please enter a valid BASE64 code')
			return
		}
		try {
			setLoading(true)
			await login(code.trim(), remember)
			navigate('/')
		} catch (err: any) {
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
				</div>
				<form onSubmit={handleSubmit} className="space-y-4">
					<label className="block text-sm font-medium">Authentication Code</label>
					<input
						type="text"
						placeholder="BASE64 code"
						value={code}
						onChange={(e) => setCode(e.target.value)}
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


