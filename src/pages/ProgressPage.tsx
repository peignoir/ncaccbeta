import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../lib/api'

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
	pitch?: string
	value_prop?: string
	why_now?: string
	github?: string
	proof_of_traction?: string
	telegram?: string
	linkedin?: string
	team_size?: string
	funding_stage?: string
	revenue?: string
	customers?: string
}

export default function ProgressPage() {
	const { user } = useAuth()
	const [startups, setStartups] = useState<Startup[]>([])
	const [loading, setLoading] = useState(true)
	const [editingField, setEditingField] = useState<string | null>(null)
	const [editValues, setEditValues] = useState<Record<string, any>>({})
	const [progressFilter, setProgressFilter] = useState<number>(0)
	const [sortBy, setSortBy] = useState<'progress' | 'name'>('progress')
	const [myStartup, setMyStartup] = useState<Startup | null>(null)
	const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null)
	const [showModal, setShowModal] = useState(false)

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
				updates.stealth = editValues.stealth
			}
			
			const response = await api.post('/api/startups/update', { 
				id: myStartup.npid || myStartup.id, 
				updates 
			})
			
			if (response.ok) {
				await loadStartups()
				if (selectedStartup?.id === myStartup.id) {
					const updated = startups.find(s => s.id === myStartup.id)
					if (updated) setSelectedStartup(updated)
				}
			}
		} catch (error) {
			console.error('Failed to save:', error)
		}
		setEditingField(null)
	}

	const openModal = (startup: Startup) => {
		if (startup.stealth && startup.id !== myStartup?.id) return
		setSelectedStartup(startup)
		setEditValues({
			progress: startup.progress,
			stealth: startup.stealth
		})
		setShowModal(true)
	}

	const closeModal = () => {
		setShowModal(false)
		setSelectedStartup(null)
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
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-3xl font-bold text-gray-900">Your Startup</h2>
						<button
							onClick={() => openModal(myStartup)}
							className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
						>
							View Details
						</button>
					</div>
					
					<div className="bg-white rounded-xl p-6 shadow-sm">
						<div className="flex items-center justify-between">
							<div className="flex-1">
								<h3 className="text-xl font-semibold text-gray-900">
									{myStartup.stealth ? 'Stealth Mode' : myStartup.name}
								</h3>
								<p className="text-gray-600">
									{myStartup.stealth ? 'Information hidden' : `Founded by ${myStartup.founder_name}`}
								</p>
							</div>
							<div className="flex items-center gap-4">
								<div className="text-right">
									<div className="text-2xl font-bold text-indigo-600">{myStartup.progress}%</div>
									<div className="text-sm text-gray-500">Progress</div>
								</div>
								{myStartup.house && (
									<span className={`px-3 py-1 rounded-full text-sm font-medium ${
										myStartup.house === 'venture' ? 'bg-purple-100 text-purple-700' :
										myStartup.house === 'lifestyle' ? 'bg-green-100 text-green-700' :
										myStartup.house === 'side' ? 'bg-blue-100 text-blue-700' :
										'bg-orange-100 text-orange-700'
									}`}>
										{myStartup.house}
									</span>
								)}
							</div>
						</div>
						{myStartup.nocap_motivation && (
							<div className="mt-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-200">
								<p className="text-purple-900 font-medium italic text-sm">
									💪 {myStartup.nocap_motivation}
								</p>
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

				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="border-b border-gray-200">
							<tr>
								<th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Startup</th>
								<th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Founder</th>
								<th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">House</th>
								<th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Progress</th>
								<th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{filteredStartups.map((startup) => {
								const isMyStartup = startup.id === myStartup?.id
								const isStealthed = startup.stealth === true || startup.stealth === 'true'
								const canViewDetails = !isStealthed || isMyStartup
								
								return (
									<tr
										key={startup.id}
										className={`hover:bg-gray-50 transition-colors ${
											isMyStartup ? 'bg-indigo-50 hover:bg-indigo-100' : ''
										} ${
											canViewDetails ? 'cursor-pointer' : ''
										}`}
										onClick={() => canViewDetails && openModal(startup)}
									>
										<td className="py-4 px-4">
											<div className="flex items-center gap-2">
												<div>
													<div className="font-medium text-gray-900">
														{isStealthed && !isMyStartup ? 'Stealth Startup' : startup.name}
													</div>
													{!isStealthed && startup.website && (
														<a
															href={`https://${startup.website}`}
															target="_blank"
															rel="noopener noreferrer"
															className="text-sm text-indigo-600 hover:text-indigo-800"
															onClick={(e) => e.stopPropagation()}
														>
															{startup.website}
														</a>
													)}
												</div>
												{isMyStartup && (
													<span className="px-2 py-1 bg-indigo-200 text-indigo-700 rounded-full text-xs font-medium">
														You
													</span>
												)}
											</div>
										</td>
										<td className="py-4 px-4 text-gray-600">
											{isStealthed && !isMyStartup ? '-' : startup.founder_name}
										</td>
										<td className="py-4 px-4">
											{startup.house && !isStealthed ? (
												<span className={`px-2 py-1 rounded-full text-xs font-medium ${
													startup.house === 'venture' ? 'bg-purple-100 text-purple-700' :
													startup.house === 'lifestyle' ? 'bg-green-100 text-green-700' :
													startup.house === 'side' ? 'bg-blue-100 text-blue-700' :
													'bg-orange-100 text-orange-700'
												}`}>
													{startup.house}
												</span>
											) : (
												<span className="text-gray-400">-</span>
											)}
										</td>
										<td className="py-4 px-4">
											<div className="flex items-center gap-3">
												<div className="flex-1">
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
												<span className="text-sm font-semibold text-gray-700 w-12">
													{startup.progress}%
												</span>
											</div>
										</td>
										<td className="py-4 px-4 text-center">
											{canViewDetails ? (
												<button
													onClick={(e) => {
														e.stopPropagation()
														openModal(startup)
													}}
													className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
												>
													View Details
												</button>
											) : (
												<span className="text-gray-400 text-sm">Hidden</span>
											)}
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			</div>

			{/* Modal */}
			{showModal && selectedStartup && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
					<div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
						<div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
							<h2 className="text-2xl font-bold text-gray-900">
								{selectedStartup.name}
							</h2>
							<button
								onClick={closeModal}
								className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
							>
								×
							</button>
						</div>

						<div className="px-8 py-6 space-y-8">
							{/* Progress Section - Only editable for user's startup */}
							{selectedStartup.id === myStartup?.id && (
								<div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
									<div className="flex items-center justify-between mb-4">
										<h3 className="text-lg font-semibold text-gray-900">Your Progress</h3>
										<div className="flex items-center gap-2">
											<span className="text-sm text-gray-600">Stealth Mode:</span>
											<button
												onClick={() => {
													const newStealth = !editValues.stealth
													setEditValues({ ...editValues, stealth: newStealth })
													handleSave('stealth')
												}}
												className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
													editValues.stealth ? 'bg-indigo-600' : 'bg-gray-200'
												}`}
											>
												<span
													className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
														editValues.stealth ? 'translate-x-6' : 'translate-x-1'
													}`}
												/>
											</button>
										</div>
									</div>
									
									<div className="space-y-3">
										{editingField === 'progress' ? (
											<div className="space-y-2">
												<div className="flex items-center gap-3">
													<input
														type="range"
														min="0"
														max="100"
														value={editValues.progress || 0}
														onChange={(e) => setEditValues({ ...editValues, progress: parseInt(e.target.value) })}
														className="flex-1"
													/>
													<span className="text-xl font-bold text-indigo-600 w-16 text-right">
														{editValues.progress}%
													</span>
												</div>
												<div className="flex gap-2">
													<button
														onClick={() => handleSave('progress')}
														className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
													>
														Save Progress
													</button>
													<button
														onClick={() => {
															setEditingField(null)
															setEditValues({ ...editValues, progress: selectedStartup.progress })
														}}
														className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
													>
														Cancel
													</button>
												</div>
											</div>
										) : (
											<div className="space-y-2">
												<div className="flex items-center gap-3">
													<div className="flex-1">
														<div className="w-full bg-gray-200 rounded-full h-4">
															<div
																className="bg-gradient-to-r from-indigo-500 to-purple-600 h-4 rounded-full transition-all"
																style={{ width: `${selectedStartup.progress}%` }}
															/>
														</div>
													</div>
													<span className="text-xl font-bold text-indigo-600">
														{selectedStartup.progress}%
													</span>
													<button
														onClick={() => {
															setEditingField('progress')
															setEditValues({ ...editValues, progress: selectedStartup.progress })
														}}
														className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
													>
														Edit
													</button>
												</div>
											</div>
										)}
									</div>

									{selectedStartup.nocap_motivation && (
										<div className="mt-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-200">
											<p className="text-purple-900 font-medium italic">
												💪 {selectedStartup.nocap_motivation}
											</p>
										</div>
									)}
								</div>
							)}

							{/* Founder Information */}
							<div className="border-t pt-6">
								<h3 className="text-lg font-semibold text-gray-900 mb-4">Founder Information</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<span className="text-sm text-gray-500">Name</span>
										<p className="font-medium text-gray-900">{selectedStartup.founder_name || '-'}</p>
									</div>
									<div>
										<span className="text-sm text-gray-500">Email</span>
										<p className="font-medium text-gray-900">{selectedStartup.founder_email || '-'}</p>
									</div>
									<div>
										<span className="text-sm text-gray-500">Location</span>
										<p className="font-medium text-gray-900">{selectedStartup.location || '-'}</p>
									</div>
									<div>
										<span className="text-sm text-gray-500">House</span>
										<p>
											{selectedStartup.house ? (
												<span className={`px-2 py-1 rounded-full text-xs font-medium ${
													selectedStartup.house === 'venture' ? 'bg-purple-100 text-purple-700' :
													selectedStartup.house === 'lifestyle' ? 'bg-green-100 text-green-700' :
													selectedStartup.house === 'side' ? 'bg-blue-100 text-blue-700' :
													'bg-orange-100 text-orange-700'
												}`}>
													{selectedStartup.house}
												</span>
											) : '-'}
										</p>
									</div>
									{selectedStartup.telegram && (
										<div>
											<span className="text-sm text-gray-500">Telegram</span>
											<p>
												<a
													href={`https://t.me/${selectedStartup.telegram.replace('@', '')}`}
													target="_blank"
													rel="noopener noreferrer"
													className="text-blue-600 hover:text-blue-800"
												>
													{selectedStartup.telegram}
												</a>
											</p>
										</div>
									)}
									{selectedStartup.linkedin && (
										<div>
											<span className="text-sm text-gray-500">LinkedIn</span>
											<p>
												<a
													href={`https://linkedin.com/in/${selectedStartup.linkedin}`}
													target="_blank"
													rel="noopener noreferrer"
													className="text-blue-600 hover:text-blue-800"
												>
													{selectedStartup.linkedin}
												</a>
											</p>
										</div>
									)}
								</div>
							</div>

							{/* Startup Details */}
							<div className="border-t pt-6">
								<h3 className="text-lg font-semibold text-gray-900 mb-4">Startup Details</h3>
								<div className="space-y-4">
									{selectedStartup.website && (
										<div>
											<span className="text-sm text-gray-500">Website</span>
											<p>
												<a
													href={`https://${selectedStartup.website}`}
													target="_blank"
													rel="noopener noreferrer"
													className="text-indigo-600 hover:text-indigo-800"
												>
													{selectedStartup.website}
												</a>
											</p>
										</div>
									)}
									{selectedStartup.pitch && (
										<div>
											<span className="text-sm text-gray-500">Pitch</span>
											<p className="text-gray-900 mt-1">{selectedStartup.pitch}</p>
										</div>
									)}
									{selectedStartup.value_prop && (
										<div>
											<span className="text-sm text-gray-500">Value Proposition</span>
											<p className="text-gray-900 mt-1">{selectedStartup.value_prop}</p>
										</div>
									)}
									{selectedStartup.why_now && (
										<div>
											<span className="text-sm text-gray-500">Why Now?</span>
											<p className="text-gray-900 mt-1">{selectedStartup.why_now}</p>
										</div>
									)}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										{selectedStartup.team_size && (
											<div>
												<span className="text-sm text-gray-500">Team Size</span>
												<p className="font-medium text-gray-900">{selectedStartup.team_size}</p>
											</div>
										)}
										{selectedStartup.funding_stage && (
											<div>
												<span className="text-sm text-gray-500">Funding Stage</span>
												<p className="font-medium text-gray-900">{selectedStartup.funding_stage}</p>
											</div>
										)}
										{selectedStartup.revenue && (
											<div>
												<span className="text-sm text-gray-500">Revenue</span>
												<p className="font-medium text-gray-900">{selectedStartup.revenue}</p>
											</div>
										)}
										{selectedStartup.customers && (
											<div>
												<span className="text-sm text-gray-500">Customers</span>
												<p className="font-medium text-gray-900">{selectedStartup.customers}</p>
											</div>
										)}
									</div>
								</div>
							</div>

							{/* Due Diligence */}
							<div className="border-t pt-6">
								<h3 className="text-lg font-semibold text-gray-900 mb-4">Due Diligence</h3>
								<div className="space-y-4">
									{selectedStartup.github && (
										<div>
											<span className="text-sm text-gray-500">GitHub</span>
											<p>
												<a
													href={`https://github.com/${selectedStartup.github}`}
													target="_blank"
													rel="noopener noreferrer"
													className="text-gray-900 hover:text-gray-700 font-mono"
												>
													{selectedStartup.github}
												</a>
											</p>
										</div>
									)}
									{selectedStartup.proof_of_traction && (
										<div>
											<span className="text-sm text-gray-500">Proof of Traction</span>
											<p className="text-gray-900 mt-1">{selectedStartup.proof_of_traction}</p>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}