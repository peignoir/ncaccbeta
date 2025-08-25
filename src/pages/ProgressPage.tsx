import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import api from '../lib/api'

type Startup = {
	id: string
	npid?: string
	name: string
	startup_name?: string
	website?: string
	founder?: string
	founder_name?: string
	founder_email?: string
	location?: string
	house?: string
	progress: number
	current_progress?: number
	stealth?: boolean | string
	nocap_motivation?: string
}

export default function ProgressPage() {
	const { user } = useAuth()
	const [startups, setStartups] = useState<Startup[]>([])
	const [loading, setLoading] = useState(true)
	const [editingField, setEditingField] = useState<string | null>(null)
	const [editValues, setEditValues] = useState<Record<string, any>>({})
	const [progressFilter, setProgressFilter] = useState<number>(0)
	const [stealthMode, setStealthMode] = useState(false)
	const [sortBy, setSortBy] = useState<'progress' | 'name'>('progress')
	const [myStartup, setMyStartup] = useState<Startup | null>(null)

	useEffect(() => {
		loadStartups()
	}, [])

	const loadStartups = async () => {
		try {
			const data = await api.get('/api/startups')
			const processedData = data.map((s: any) => ({
				...s,
				progress: s.current_progress != null ? Math.round(s.current_progress * 100) : (s.progress || 0),
				stealth: s.stealth === true || s.stealth === 'true' || s.stealth === '1',
				name: s.startup_name || s.name || 'Unknown Startup',
				founder_name: s.founder_name || s.founder || s.name || 'Unknown Founder'
			}))
			setStartups(processedData)
			
			// Find user's startup
			const userStartup = processedData.find((s: Startup) => 
				s.id === user?.startup?.id || 
				s.npid === user?.startup?.id ||
				s.founder_email === user?.email
			)
			if (userStartup) {
				setMyStartup(userStartup)
				setStealthMode(userStartup.stealth as boolean)
				setEditValues({
					progress: userStartup.progress,
					stealth: userStartup.stealth
				})
			}
		} catch (error) {
			console.error('Failed to load startups:', error)
		} finally {
			setLoading(false)
		}
	}

	const handleSave = async (field: string) => {
		if (!myStartup) return
		
		try {
			const updates: Record<string, any> = {}
			
			if (field === 'progress') {
				updates.current_progress = editValues.progress / 100
			} else if (field === 'stealth') {
				updates.stealth = stealthMode
			}
			
			const response = await api.post('/api/startups/update', { 
				id: myStartup.npid || myStartup.id, 
				updates 
			})
			
			if (response.ok) {
				await loadStartups()
			}
		} catch (error) {
			console.error('Failed to save:', error)
		}
		setEditingField(null)
	}

	const filteredStartups = startups
		.filter(s => s.progress >= progressFilter)
		.sort((a, b) => {
			if (sortBy === 'progress') return b.progress - a.progress
			return (a.name || '').localeCompare(b.name || '')
		})

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-gray-500">Loading startups...</div>
			</div>
		)
	}

	return (
		<div className="space-y-8">
			{/* My Startup Section */}
			{myStartup && (
				<div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8 shadow-lg">
					<h2 className="text-3xl font-bold mb-6 text-gray-900">Your Startup</h2>
					
					<div className="bg-white rounded-xl p-6 shadow-sm">
						{stealthMode ? (
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<div>
										<h3 className="text-2xl font-semibold text-gray-400">Stealth Mode</h3>
										<p className="text-gray-400 mt-2">Your startup information is hidden</p>
									</div>
									<button
										onClick={() => {
											setStealthMode(false)
											setEditValues({ ...editValues, stealth: false })
											handleSave('stealth')
										}}
										className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
									>
										Reveal Startup
									</button>
								</div>
							</div>
						) : (
							<div className="space-y-6">
								<div className="flex items-start justify-between">
									<div>
										<h3 className="text-2xl font-semibold text-gray-900">{myStartup.name}</h3>
										{myStartup.website && (
											<a href={`https://${myStartup.website}`} target="_blank" rel="noopener noreferrer" 
												className="text-indigo-600 hover:text-indigo-800 mt-1 inline-block">
												{myStartup.website}
											</a>
										)}
										<p className="text-gray-600 mt-2">Founded by {myStartup.founder_name}</p>
									</div>
									<button
										onClick={() => {
											setStealthMode(true)
											setEditValues({ ...editValues, stealth: true })
											handleSave('stealth')
										}}
										className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
									>
										Go Stealth
									</button>
								</div>

								{/* Progress Section */}
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<span className="text-lg font-medium text-gray-700">Progress</span>
										{editingField === 'progress' ? (
											<div className="flex items-center gap-2">
												<input
													type="range"
													min="0"
													max="100"
													value={editValues.progress || 0}
													onChange={(e) => setEditValues({ ...editValues, progress: parseInt(e.target.value) })}
													className="w-32"
												/>
												<span className="w-12 text-right font-semibold">{editValues.progress}%</span>
												<button
													onClick={() => handleSave('progress')}
													className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
												>
													Save
												</button>
												<button
													onClick={() => setEditingField(null)}
													className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
												>
													Cancel
												</button>
											</div>
										) : (
											<div className="flex items-center gap-3">
												<span className="text-2xl font-bold text-indigo-600">{myStartup.progress}%</span>
												<button
													onClick={() => {
														setEditingField('progress')
														setEditValues({ ...editValues, progress: myStartup.progress })
													}}
													className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
												>
													Edit
												</button>
											</div>
										)}
									</div>
									<div className="w-full bg-gray-200 rounded-full h-3">
										<div
											className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-500"
											style={{ width: `${editingField === 'progress' ? editValues.progress : myStartup.progress}%` }}
										/>
									</div>
								</div>

								{/* Motivation Message */}
								{myStartup.nocap_motivation && (
									<div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
										<p className="text-purple-900 font-medium italic">
											💪 {myStartup.nocap_motivation}
										</p>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* All Startups Section */}
			<div className="bg-white rounded-2xl p-8 shadow-lg">
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-2xl font-bold text-gray-900">All Startups</h2>
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<label className="text-sm text-gray-600">Min Progress:</label>
							<input
								type="range"
								min="0"
								max="100"
								step="10"
								value={progressFilter}
								onChange={(e) => setProgressFilter(parseInt(e.target.value))}
								className="w-24"
							/>
							<span className="text-sm font-semibold w-12">{progressFilter}%</span>
						</div>
						<select
							value={sortBy}
							onChange={(e) => setSortBy(e.target.value as 'progress' | 'name')}
							className="px-3 py-1 border rounded-lg text-sm"
						>
							<option value="progress">Sort by Progress</option>
							<option value="name">Sort by Name</option>
						</select>
					</div>
				</div>

				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{filteredStartups.map((startup) => {
						const isMyStartup = startup.id === myStartup?.id
						const isStealthed = startup.stealth === true || startup.stealth === 'true'
						
						return (
							<div
								key={startup.id}
								className={`p-5 rounded-xl border transition-all hover:shadow-md ${
									isMyStartup ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-white'
								}`}
							>
								{isStealthed ? (
									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<span className="text-gray-400 font-medium">Stealth Startup</span>
											{isMyStartup && (
												<span className="text-xs px-2 py-1 bg-indigo-200 text-indigo-700 rounded-full">
													You
												</span>
											)}
										</div>
										<div className="text-gray-400 text-sm">Information hidden</div>
									</div>
								) : (
									<div className="space-y-3">
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<h3 className="font-semibold text-gray-900 line-clamp-1">
													{startup.name}
												</h3>
												{startup.website && (
													<a
														href={`https://${startup.website}`}
														target="_blank"
														rel="noopener noreferrer"
														className="text-sm text-indigo-600 hover:text-indigo-800 line-clamp-1"
													>
														{startup.website}
													</a>
												)}
											</div>
											{isMyStartup && (
												<span className="text-xs px-2 py-1 bg-indigo-200 text-indigo-700 rounded-full">
													You
												</span>
											)}
										</div>
										
										<div className="space-y-1">
											<div className="flex items-center justify-between text-sm">
												<span className="text-gray-600">Progress</span>
												<span className="font-semibold">{startup.progress}%</span>
											</div>
											<div className="w-full bg-gray-200 rounded-full h-2">
												<div
													className={`h-2 rounded-full transition-all ${
														startup.progress >= 80 ? 'bg-green-500' :
														startup.progress >= 60 ? 'bg-blue-500' :
														startup.progress >= 40 ? 'bg-yellow-500' :
														'bg-red-500'
													}`}
													style={{ width: `${startup.progress}%` }}
												/>
											</div>
										</div>
										
										{startup.founder_name && (
											<p className="text-sm text-gray-600">
												by {startup.founder_name}
											</p>
										)}
										
										{startup.house && (
											<span className={`inline-block text-xs px-2 py-1 rounded-full ${
												startup.house === 'venture' ? 'bg-purple-100 text-purple-700' :
												startup.house === 'lifestyle' ? 'bg-green-100 text-green-700' :
												startup.house === 'side' ? 'bg-blue-100 text-blue-700' :
												'bg-orange-100 text-orange-700'
											}`}>
												{startup.house}
											</span>
										)}
									</div>
								)}
							</div>
						)
					})}
				</div>
			</div>
		</div>
	)
}