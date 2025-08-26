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
	founder_telegram?: string
	founder_linkedin_url?: string
	location?: string
	founder_city?: string
	founder_country?: string
	house?: string
	progress: number
	current_progress?: number
	stealth?: boolean | string
	nocap_motivation?: string
	bio?: string
	motivation?: string
	traction?: string
	product?: string
	long_pitch?: string
	demo_video_url?: string
	one_pager_url?: string
	github_repos?: string
	problem_statement?: string
	customer?: string
	product_job_to_be_done?: string
	value_proposition?: string
	current_workaround?: string
	why_now_catalyst?: string
	key_differentiator?: string
	founder_time_commitment_pct?: string
	competitors_urls?: string
	Business_model_explained?: string
	proof_of_concept?: string
	dataroom_url?: string
	pitch_video_url?: string
	contact_me?: boolean | string
	circle?: string
	circle_name?: string
	circle_description?: string
	wave?: string
}

export default function ProgressPage() {
	const { user } = useAuth()
	const [startups, setStartups] = useState<Startup[]>([])
	const [loading, setLoading] = useState(true)
	const [editingField, setEditingField] = useState<string | null>(null)
	const [editValues, setEditValues] = useState<Record<string, any>>({})
	const [houseFilter, setHouseFilter] = useState<string>('all')
	const [stealthFilter, setStealthFilter] = useState<'all' | 'show' | 'hide'>('all')
	const [sortBy, setSortBy] = useState<'progress' | 'name'>('progress')
	const [contactFilter, setContactFilter] = useState<boolean>(false)
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
				contact_me: s.contact_me !== false && s.contact_me !== 'false' && s.contact_me !== '0',
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
					stealth: userStartup.stealth,
					contact_me: userStartup.contact_me !== false
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
			} else if (field === 'contact_me') {
				updates.contact_me = editValues.contact_me
			} else if (field === 'all') {
				// Save all edited fields
				updates.stealth = editValues.stealth
				updates.contact_me = editValues.contact_me
				updates.startup_name = editValues.startup_name
				updates.website = editValues.website
				updates.founder_name = editValues.founder_name
				updates.founder_email = editValues.founder_email
				updates.founder_telegram = editValues.founder_telegram
				updates.founder_linkedin_url = editValues.founder_linkedin_url
				updates.long_pitch = editValues.long_pitch
				updates.traction = editValues.traction
				updates.pitch_video_url = editValues.pitch_video_url
				updates.bio = editValues.bio
				updates.motivation = editValues.motivation
				updates.founder_city = editValues.founder_city
				updates.founder_country = editValues.founder_country
				updates.founder_time_commitment_pct = editValues.founder_time_commitment_pct
				updates.proof_of_concept = editValues.proof_of_concept
				updates.dataroom_url = editValues.dataroom_url
			}
			
			// Update local state immediately for instant UI feedback
			const updatedStartup = field === 'all' ? {
				...myStartup,
				...editValues,
				name: editValues.startup_name || myStartup.name
			} : {
				...myStartup,
				stealth: field === 'stealth' ? editValues.stealth : myStartup.stealth,
				contact_me: field === 'contact_me' ? editValues.contact_me : myStartup.contact_me,
				progress: field === 'progress' ? editValues.progress : myStartup.progress
			}
			
			// Update my startup immediately
			setMyStartup(updatedStartup)
			
			// Update in the startups list immediately
			setStartups(prev => prev.map(s => 
				s.id === myStartup.id ? updatedStartup : s
			))
			
			// Update selected startup if it's the same
			if (selectedStartup?.id === myStartup.id) {
				setSelectedStartup(updatedStartup)
			}
			
			// Save to backend
			const response = await api.post('/api/startups/update', { 
				id: myStartup.npid || myStartup.id, 
				updates 
			})
			
			if (!response.ok) {
				// Revert on failure
				await loadStartups()
			}
		} catch (error) {
			console.error('Failed to save:', error)
			// Revert on error
			await loadStartups()
		}
		// Don't close edit mode when saving 'all' - that's handled by the Save button
		if (field !== 'all') {
			setEditingField(null)
		}
	}

	const openModal = (startup: Startup) => {
		if (startup.stealth && startup.id !== myStartup?.id) return
		setSelectedStartup(startup)
		setEditValues({
			progress: startup.progress,
			stealth: startup.stealth,
			contact_me: startup.contact_me !== false
		})
		setShowModal(true)
	}

	const closeModal = () => {
		setShowModal(false)
		setSelectedStartup(null)
		setEditingField(null)
	}

	const filteredStartups = startups
		.filter(s => {
			const houseMatch = houseFilter === 'all' || s.house === houseFilter
			const stealthMatch = stealthFilter === 'all' || 
				(stealthFilter === 'show' && s.stealth === true) ||
				(stealthFilter === 'hide' && s.stealth !== true)
			const contactMatch = !contactFilter || 
				(s.contact_me !== false && (s.founder_email || s.founder_telegram))
			return houseMatch && stealthMatch && contactMatch
		})
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
					</div>
					<div className="mt-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
						<p className="text-indigo-900 font-semibold italic">
							💪 {myStartup.progress >= 80 
								? `Amazing progress at ${myStartup.progress}%! This week: Close 2 deals and prepare for launch.`
								: myStartup.progress >= 60
								? `Strong momentum at ${myStartup.progress}%! This week: Talk to 5 customers and iterate on their feedback.`
								: myStartup.progress >= 40
								? `Good progress at ${myStartup.progress}%! This week: Ship that feature and get 3 user testimonials.`
								: myStartup.progress >= 20
								? `${myStartup.progress}% and climbing! This week: Launch your MVP and get feedback from 10 beta users.`
								: `${myStartup.progress}% - Let's build momentum! This week: Validate your idea with 5 potential customers.`
							}
						</p>
					</div>
				</div>
			)}

			{/* All Startups Section */}
			<div className="bg-white rounded-2xl p-8 shadow-lg">
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-2xl font-bold text-gray-900">All Startups</h2>
					<div className="flex items-center gap-4">
						<select
							value={houseFilter}
							onChange={(e) => setHouseFilter(e.target.value)}
							className="px-3 py-1 border rounded-lg text-sm"
						>
							<option value="all">All Houses</option>
							<option value="venture">Venture</option>
							<option value="lifestyle">Lifestyle</option>
							<option value="side">Side</option>
							<option value="karma">Karma</option>
						</select>
						<select
							value={stealthFilter}
							onChange={(e) => setStealthFilter(e.target.value as 'all' | 'show' | 'hide')}
							className="px-3 py-1 border rounded-lg text-sm"
						>
							<option value="all">All Startups</option>
							<option value="hide">Non-Stealth</option>
							<option value="show">Stealth Only</option>
						</select>
						<select
							value={sortBy}
							onChange={(e) => setSortBy(e.target.value as 'progress' | 'name')}
							className="px-3 py-1 border rounded-lg text-sm"
						>
							<option value="progress">Sort by Progress</option>
							<option value="name">Sort by Name</option>
						</select>
						<button
							onClick={() => setContactFilter(!contactFilter)}
							className={`px-3 py-1 rounded-lg text-sm transition ${
								contactFilter 
									? 'bg-green-600 text-white border border-green-600' 
									: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
							}`}
						>
							{contactFilter ? '✓ ' : ''}It's OK to contact me
						</button>
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
								<th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Reachable</th>
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
														{isStealthed ? 'Stealth Startup' : startup.name}
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
											{isStealthed ? '-' : 
												(startup.contact_me === false && !isMyStartup ? 'Contact Hidden' : startup.founder_name)
											}
										</td>
										<td className="py-4 px-4">
											{startup.house ? (
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
											{!isStealthed && startup.contact_me !== false && (startup.founder_email || startup.founder_telegram) ? (
												<span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
													✓ Yes
												</span>
											) : (
												<span className="text-gray-400 text-xs">-</span>
											)}
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
					<div className={`rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl transition-all ${
						editingField === 'modal' && selectedStartup.id === myStartup?.id 
							? 'bg-yellow-50 ring-4 ring-yellow-400' 
							: 'bg-white'
					}`}>
						<div className={`sticky top-0 border-b px-8 py-6 transition-all ${
							editingField === 'modal' && selectedStartup.id === myStartup?.id
								? 'bg-yellow-100 border-yellow-300'
								: 'bg-white border-gray-200'
						}`}>
							<div className="flex items-center justify-between">
								<div>
									<h2 className="text-2xl font-bold text-gray-900">
										{selectedStartup.name}
									</h2>
									{editingField === 'modal' && selectedStartup.id === myStartup?.id && (
										<p className="text-sm text-yellow-700 mt-1">
											✏️ Edit Mode - Make changes and click Save when done
										</p>
									)}
								</div>
								<div className="flex items-center gap-4">
									{selectedStartup.id === myStartup?.id && editingField === 'modal' && (
										<>
											<div className="flex items-center gap-2">
												<span className="text-sm text-gray-600">Contact Me:</span>
												<button
													onClick={() => {
														const newContactMe = !editValues.contact_me
														setEditValues({ ...editValues, contact_me: newContactMe })
														// Don't auto-save when in edit mode
													}}
													className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
														editValues.contact_me ? 'bg-green-600' : 'bg-gray-200'
													}`}
												>
													<span
														className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
															editValues.contact_me ? 'translate-x-6' : 'translate-x-1'
														}`}
													/>
												</button>
											</div>
											<div className="flex items-center gap-2">
												<span className="text-sm text-gray-600">Stealth Mode:</span>
												<button
													onClick={() => {
														const newStealth = !editValues.stealth
														setEditValues({ ...editValues, stealth: newStealth })
														// Don't auto-save when in edit mode
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
											<button
												onClick={() => {
													// Save all changes
													handleSave('all')
													setEditingField(null)
												}}
												className="px-4 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
											>
												Save Changes
											</button>
											<button
												onClick={() => {
													setEditingField(null)
													// Reset edit values
													setEditValues({
														progress: selectedStartup.progress,
														stealth: selectedStartup.stealth,
														contact_me: selectedStartup.contact_me !== false
													})
												}}
												className="px-4 py-1 text-sm bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition"
											>
												Cancel
											</button>
										</>
									)}
									{selectedStartup.id === myStartup?.id && editingField !== 'modal' && (
										<button
											onClick={() => {
												setEditingField('modal')
												// Initialize edit values with current startup data
												setEditValues({
													progress: selectedStartup.progress,
													stealth: selectedStartup.stealth,
													contact_me: selectedStartup.contact_me !== false,
													startup_name: selectedStartup.startup_name || selectedStartup.name,
													website: selectedStartup.website || '',
													founder_name: selectedStartup.founder_name || '',
													founder_email: selectedStartup.founder_email || '',
													founder_telegram: selectedStartup.founder_telegram || '',
													founder_linkedin_url: selectedStartup.founder_linkedin_url || '',
													long_pitch: selectedStartup.long_pitch || '',
													traction: selectedStartup.traction || '',
													pitch_video_url: selectedStartup.pitch_video_url || selectedStartup.demo_video_url || '',
													bio: selectedStartup.bio || '',
													motivation: selectedStartup.motivation || '',
													founder_city: selectedStartup.founder_city || '',
													founder_country: selectedStartup.founder_country || '',
													founder_time_commitment_pct: selectedStartup.founder_time_commitment_pct || '',
													proof_of_concept: selectedStartup.proof_of_concept || '',
													dataroom_url: selectedStartup.dataroom_url || ''
												})
											}}
											className="px-3 py-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
										>
											Edit Details
										</button>
									)}
									<button
										onClick={closeModal}
										className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
									>
										×
									</button>
								</div>
							</div>
						</div>

						<div className="px-8 py-6 space-y-8">
							{/* Pitch Video at Top */}
							{(() => {
								const isEditing = editingField === 'modal' && selectedStartup.id === myStartup?.id
								const videoUrl = isEditing 
									? editValues.pitch_video_url 
									: (selectedStartup.pitch_video_url || selectedStartup.demo_video_url)
								
								// Extract video ID from YouTube URL
								let videoId = ''
								if (videoUrl) {
									if (videoUrl.includes('youtube.com/watch?v=')) {
										videoId = videoUrl.split('v=')[1]?.split('&')[0]
									} else if (videoUrl.includes('youtu.be/')) {
										videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0]
									} else {
										// Assume it's already a video ID
										videoId = videoUrl
									}
								}
								
								if (!videoUrl && !isEditing) return null
								
								return (
									<div className="bg-gray-50 rounded-xl p-4">
										<h3 className="text-center text-lg font-semibold text-gray-900 mb-3">My 90s presentation (who i am, what i build, why now...)</h3>
										{isEditing && (
											<div className="mb-4 max-w-2xl mx-auto">
												<label className="text-sm text-gray-500">YouTube Video URL</label>
												<input
													type="text"
													value={editValues.pitch_video_url || ''}
													onChange={(e) => setEditValues({ ...editValues, pitch_video_url: e.target.value })}
													className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
													placeholder="https://www.youtube.com/watch?v=xvFZjo5PgG0"
												/>
												{!videoId && (
													<p className="text-sm text-gray-500 mt-2">Enter a YouTube URL to preview the video</p>
												)}
											</div>
										)}
										{videoId && (
											<div className="max-w-2xl mx-auto">
												<div className="relative w-full" style={{ paddingBottom: '42%' }}>
													<iframe
														className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
														src={`https://www.youtube.com/embed/${videoId}`}
														title="My 90s presentation"
														allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
														allowFullScreen
													/>
												</div>
											</div>
										)}
									</div>
								)
							})()}

							{/* Progress Display - Show for user's startup */}
							{selectedStartup.id === myStartup?.id && (
								<div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
									<div className="mb-4">
										<h3 className="text-lg font-semibold text-gray-900">Your Progress</h3>
									</div>
									
									<div className="space-y-3">
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
										</div>
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

							{/* Overview Section */}
							{(selectedStartup.bio || selectedStartup.motivation || selectedStartup.long_pitch || editingField === 'modal') && (
								<div className="border-t pt-6">
									<h3 className="text-lg font-semibold text-gray-900 mb-4">Overview</h3>
									<div className="space-y-4">
										{(selectedStartup.website || editingField === 'modal') && (
											<div>
												<span className="text-sm text-gray-500">Website</span>
												{editingField === 'modal' && selectedStartup.id === myStartup?.id ? (
													<input
														type="text"
														value={editValues.website || ''}
														onChange={(e) => setEditValues({ ...editValues, website: e.target.value })}
														className="mt-1 w-full px-2 py-1 border rounded text-gray-900"
														placeholder="example.com"
													/>
												) : (
													<p>
														<a
															href={`https://${selectedStartup.website}`}
															target="_blank"
															rel="noopener noreferrer"
															className="text-blue-600 hover:text-blue-800"
														>
															{selectedStartup.website}
														</a>
													</p>
												)}
											</div>
										)}
										{(selectedStartup.long_pitch || editingField === 'modal') && (
											<div>
												<span className="text-sm text-gray-500">Pitch</span>
												{editingField === 'modal' && selectedStartup.id === myStartup?.id ? (
													<textarea
														value={editValues.long_pitch || ''}
														onChange={(e) => setEditValues({ ...editValues, long_pitch: e.target.value })}
														className="mt-1 w-full px-2 py-1 border rounded text-gray-900"
														rows={4}
													/>
												) : (
													<p className="text-gray-900 mt-1 whitespace-pre-wrap">{selectedStartup.long_pitch}</p>
												)}
											</div>
										)}
										{(selectedStartup.bio || editingField === 'modal') && (
											<div>
												<span className="text-sm text-gray-500">Founder Bio</span>
												{editingField === 'modal' && selectedStartup.id === myStartup?.id ? (
													<textarea
														value={editValues.bio || ''}
														onChange={(e) => setEditValues({ ...editValues, bio: e.target.value })}
														className="mt-1 w-full px-2 py-1 border rounded text-gray-900"
														rows={3}
													/>
												) : (
													<p className="text-gray-900 mt-1">{selectedStartup.bio}</p>
												)}
											</div>
										)}
										{(selectedStartup.motivation || editingField === 'modal') && (
											<div>
												<span className="text-sm text-gray-500">Motivation</span>
												{editingField === 'modal' && selectedStartup.id === myStartup?.id ? (
													<input
														type="text"
														value={editValues.motivation || ''}
														onChange={(e) => setEditValues({ ...editValues, motivation: e.target.value })}
														className="mt-1 w-full px-2 py-1 border rounded text-gray-900"
													/>
												) : (
													<p className="text-gray-900 mt-1">{selectedStartup.motivation}</p>
												)}
											</div>
										)}
									</div>
								</div>
							)}

							{/* Founder Information */}
							<div className="border-t pt-6">
								<h3 className="text-lg font-semibold text-gray-900 mb-4">Founder Information</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<span className="text-sm text-gray-500">Name</span>
										{editingField === 'modal' && selectedStartup.id === myStartup?.id ? (
											<input
												type="text"
												value={editValues.founder_name || ''}
												onChange={(e) => setEditValues({ ...editValues, founder_name: e.target.value })}
												className="mt-1 w-full px-2 py-1 border rounded text-gray-900"
											/>
										) : (
											<p className="font-medium text-gray-900">{selectedStartup.founder_name || '-'}</p>
										)}
									</div>
									{selectedStartup.contact_me !== false && (
										<div>
											<span className="text-sm text-gray-500">Email</span>
											{editingField === 'modal' && selectedStartup.id === myStartup?.id ? (
												<input
													type="email"
													value={editValues.founder_email || ''}
													onChange={(e) => setEditValues({ ...editValues, founder_email: e.target.value })}
													className="mt-1 w-full px-2 py-1 border rounded text-gray-900"
												/>
											) : (
												<p className="font-medium text-gray-900">{selectedStartup.founder_email || '-'}</p>
											)}
										</div>
									)}
									<div>
										<span className="text-sm text-gray-500">Location</span>
										{editingField === 'modal' && selectedStartup.id === myStartup?.id ? (
											<div className="flex gap-2">
												<input
													type="text"
													value={editValues.founder_city || ''}
													onChange={(e) => setEditValues({ ...editValues, founder_city: e.target.value })}
													className="mt-1 flex-1 px-2 py-1 border rounded text-gray-900"
													placeholder="City"
												/>
												<input
													type="text"
													value={editValues.founder_country || ''}
													onChange={(e) => setEditValues({ ...editValues, founder_country: e.target.value })}
													className="mt-1 flex-1 px-2 py-1 border rounded text-gray-900"
													placeholder="Country"
												/>
											</div>
										) : (
											<p className="font-medium text-gray-900">{selectedStartup.location || '-'}</p>
										)}
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
									{(selectedStartup.founder_time_commitment_pct || editingField === 'modal') && (
										<div>
											<span className="text-sm text-gray-500">Time Commitment (%)</span>
											{editingField === 'modal' && selectedStartup.id === myStartup?.id ? (
												<input
													type="number"
													value={editValues.founder_time_commitment_pct || ''}
													onChange={(e) => setEditValues({ ...editValues, founder_time_commitment_pct: e.target.value })}
													className="mt-1 w-full px-2 py-1 border rounded text-gray-900"
													placeholder="100"
													min="0"
													max="100"
												/>
											) : (
												<p className="font-medium text-gray-900">{selectedStartup.founder_time_commitment_pct}%</p>
											)}
										</div>
									)}
									{(selectedStartup.founder_telegram || editingField === 'modal') && selectedStartup.contact_me !== false && (
										<div>
											<span className="text-sm text-gray-500">Telegram</span>
											{editingField === 'modal' && selectedStartup.id === myStartup?.id ? (
												<input
													type="text"
													value={editValues.founder_telegram || ''}
													onChange={(e) => setEditValues({ ...editValues, founder_telegram: e.target.value })}
													className="mt-1 w-full px-2 py-1 border rounded text-gray-900"
													placeholder="@username"
												/>
											) : selectedStartup.founder_telegram ? (
												<p>
													<a
														href={`https://t.me/${selectedStartup.founder_telegram.replace('@', '')}`}
														target="_blank"
														rel="noopener noreferrer"
														className="text-blue-600 hover:text-blue-800"
													>
														{selectedStartup.founder_telegram}
													</a>
												</p>
											) : null}
										</div>
									)}
									{(selectedStartup.founder_linkedin_url || editingField === 'modal') && selectedStartup.contact_me !== false && (
										<div>
											<span className="text-sm text-gray-500">LinkedIn URL</span>
											{editingField === 'modal' && selectedStartup.id === myStartup?.id ? (
												<input
													type="text"
													value={editValues.founder_linkedin_url || ''}
													onChange={(e) => setEditValues({ ...editValues, founder_linkedin_url: e.target.value })}
													className="mt-1 w-full px-2 py-1 border rounded text-gray-900"
													placeholder="https://linkedin.com/in/username"
												/>
											) : (
												<p>
													<a
														href={selectedStartup.founder_linkedin_url}
														target="_blank"
														rel="noopener noreferrer"
														className="text-blue-600 hover:text-blue-800"
													>
														View Profile
													</a>
												</p>
											)}
										</div>
									)}
								</div>
							</div>

							{/* Product & Business */}
							<div className="border-t pt-6">
								<h3 className="text-lg font-semibold text-gray-900 mb-4">Product & Business</h3>
								<div className="space-y-4">
									{selectedStartup.product && (
										<div>
											<span className="text-sm text-gray-500">Product</span>
											<p className="text-gray-900 mt-1">{selectedStartup.product}</p>
										</div>
									)}
									{selectedStartup.problem_statement && (
										<div>
											<span className="text-sm text-gray-500">Problem Statement</span>
											<p className="text-gray-900 mt-1">{selectedStartup.problem_statement}</p>
										</div>
									)}
									{selectedStartup.customer && (
										<div>
											<span className="text-sm text-gray-500">Target Customer</span>
											<p className="text-gray-900 mt-1">{selectedStartup.customer}</p>
										</div>
									)}
									{selectedStartup.product_job_to_be_done && (
										<div>
											<span className="text-sm text-gray-500">Job to be Done</span>
											<p className="text-gray-900 mt-1">{selectedStartup.product_job_to_be_done}</p>
										</div>
									)}
									{selectedStartup.value_proposition && (
										<div>
											<span className="text-sm text-gray-500">Value Proposition</span>
											<p className="text-gray-900 mt-1">{selectedStartup.value_proposition}</p>
										</div>
									)}
									{selectedStartup.current_workaround && (
										<div>
											<span className="text-sm text-gray-500">Current Workaround</span>
											<p className="text-gray-900 mt-1">{selectedStartup.current_workaround}</p>
										</div>
									)}
									{selectedStartup.key_differentiator && (
										<div>
											<span className="text-sm text-gray-500">Key Differentiator</span>
											<p className="text-gray-900 mt-1">{selectedStartup.key_differentiator}</p>
										</div>
									)}
									{selectedStartup.why_now_catalyst && (
										<div>
											<span className="text-sm text-gray-500">Why Now?</span>
											<p className="text-gray-900 mt-1">{selectedStartup.why_now_catalyst}</p>
										</div>
									)}
									{selectedStartup.Business_model_explained && (
										<div>
											<span className="text-sm text-gray-500">Business Model</span>
											<p className="text-gray-900 mt-1">{selectedStartup.Business_model_explained}</p>
										</div>
									)}
								</div>
							</div>

							{/* Due Diligence */}
							<div className="border-t pt-6">
								<h3 className="text-lg font-semibold text-gray-900 mb-4">Due Diligence & Resources</h3>
								<div className="space-y-4">
									{(selectedStartup.traction || editingField === 'modal') && (
										<div>
											<span className="text-sm text-gray-500">Traction</span>
											{editingField === 'modal' && selectedStartup.id === myStartup?.id ? (
												<input
													type="text"
													value={editValues.traction || ''}
													onChange={(e) => setEditValues({ ...editValues, traction: e.target.value })}
													className="mt-1 w-full px-2 py-1 border rounded text-gray-900"
												/>
											) : (
												<p className="text-gray-900 mt-1">{selectedStartup.traction}</p>
											)}
										</div>
									)}
									{(selectedStartup.proof_of_concept || editingField === 'modal') && (
										<div>
											<span className="text-sm text-gray-500">Source Code URL</span>
											{editingField === 'modal' && selectedStartup.id === myStartup?.id ? (
												<input
													type="text"
													value={editValues.proof_of_concept || ''}
													onChange={(e) => setEditValues({ ...editValues, proof_of_concept: e.target.value })}
													className="mt-1 w-full px-2 py-1 border rounded text-gray-900"
													placeholder="https://github.com/username/repo"
												/>
											) : (
												<p>
													<a
														href={selectedStartup.proof_of_concept}
														target="_blank"
														rel="noopener noreferrer"
														className="text-indigo-600 hover:text-indigo-800 font-mono"
													>
														View Source Code
													</a>
												</p>
											)}
										</div>
									)}
									{(selectedStartup.dataroom_url || editingField === 'modal') && (
										<div>
											<span className="text-sm text-gray-500">Data Room URL</span>
											{editingField === 'modal' && selectedStartup.id === myStartup?.id ? (
												<input
													type="text"
													value={editValues.dataroom_url || ''}
													onChange={(e) => setEditValues({ ...editValues, dataroom_url: e.target.value })}
													className="mt-1 w-full px-2 py-1 border rounded text-gray-900"
													placeholder="https://dataroom.example.com"
												/>
											) : (
												<p>
													<a
														href={selectedStartup.dataroom_url}
														target="_blank"
														rel="noopener noreferrer"
														className="text-indigo-600 hover:text-indigo-800"
													>
														Access Data Room
													</a>
												</p>
											)}
										</div>
									)}
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
									{selectedStartup.one_pager_url && (
										<div>
											<span className="text-sm text-gray-500">One Pager</span>
											<p>
												<a
													href={selectedStartup.one_pager_url}
													target="_blank"
													rel="noopener noreferrer"
													className="text-indigo-600 hover:text-indigo-800"
												>
													View One Pager
												</a>
											</p>
										</div>
									)}
									{selectedStartup.github_repos && (
										<div>
											<span className="text-sm text-gray-500">GitHub Repository</span>
											<p>
												<a
													href={selectedStartup.github_repos}
													target="_blank"
													rel="noopener noreferrer"
													className="text-gray-900 hover:text-gray-700 font-mono"
												>
													View Repository
												</a>
											</p>
										</div>
									)}
									{selectedStartup.competitors_urls && (
										<div>
											<span className="text-sm text-gray-500">Competitors</span>
											<p className="text-gray-900 mt-1">{selectedStartup.competitors_urls}</p>
										</div>
									)}
								</div>
							</div>

							{/* Wave Information */}
							{selectedStartup.wave && (
								<div className="border-t pt-6">
									<h3 className="text-lg font-semibold text-gray-900 mb-4">Wave</h3>
									<div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
										<div className="flex items-center justify-between">
											<h4 className="font-semibold text-blue-900">
												{selectedStartup.wave === 'wave1' ? 'Wave 1' : selectedStartup.wave}
											</h4>
											<span className="text-blue-700 text-sm font-medium">
												{selectedStartup.wave === 'wave1' ? 'Sept 13, 2025' : ''}
											</span>
										</div>
										{selectedStartup.circle_name && (
											<div className="mt-3">
												<p className="text-blue-800 font-medium">{selectedStartup.circle_name}</p>
												{selectedStartup.circle_description && (
													<p className="text-blue-700 mt-1 text-sm">{selectedStartup.circle_description}</p>
												)}
											</div>
										)}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	)
}