import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../lib/api'
import unifiedApi from '../lib/unifiedApi'
import ApiConfigManager from '../lib/apiConfig'
import { normalizeHouse, getHouseDisplayName, getHouseColorClasses, getHouseGoalDescription } from '../lib/houseNormalizer'
import { ensureAllHousesPresent } from '../lib/sampleHouses'
import logger from '../lib/logger'

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
	telegram_id?: string
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
	raw_event?: any // Raw event data from API
	raw_group?: string
	raw_percent?: number
	raw_details?: any
	[key: string]: any // Allow any additional fields
	circle_description?: string
	wave?: string
}

// Function to get house badge color based on raw house value
function getHouseBadgeClass(house: string | undefined): string {
	return getHouseColorClasses(house || '');
}

// Function to get house goal information
function getHouseGoalInfo(house: string | undefined): { goal: string; description: string } {
	const { title, description } = getHouseGoalDescription(house || '');
	return { goal: title, description };
}

export default function ProgressPage() {
	const { user } = useAuth()
	const [startups, setStartups] = useState<Startup[]>([])
	const [allStartups, setAllStartups] = useState<Startup[]>([]) // Store all startups for stats
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [editingField, setEditingField] = useState<string | null>(null)
	const [editValues, setEditValues] = useState<Record<string, any>>({})
	const [houseFilter, setHouseFilter] = useState<string>('all')
	// Removed stealth filter - no longer needed
	const [sortBy, setSortBy] = useState<'progress' | 'name'>('progress')
	const [myStartup, setMyStartup] = useState<Startup | null>(null)
	const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null)
	const [showModal, setShowModal] = useState(false)
	const [showDebugPanel, setShowDebugPanel] = useState(false)
	const [copiedSection, setCopiedSection] = useState<string | null>(null)

	useEffect(() => {
		loadStartups()
	}, [])

	const loadStartups = async (isRefresh = false) => {
		try {
			if (isRefresh) {
				setRefreshing(true);
			} else {
				setLoading(true);
			}
			logger.log('[ProgressPage] Loading startups with API mode:', ApiConfigManager.isMockApiMode() ? "mock" : "real")

			// Always fetch ALL startups for statistics
			const response = await unifiedApi.getStartups({ showAll: true })
			logger.log('[ProgressPage] Unified API response:', response)
			
			if (!response.success || !response.data) {
				throw new Error(response.error || 'Failed to load startups')
			}
			
			const processedData = response.data
				.map((s: any) => ({
					...s,
					id: String(s.npid || s.id), // Ensure we have an id field for compatibility
					progress: s.progress_percent !== undefined && s.progress_percent !== null 
						? s.progress_percent 
						: (s.current_progress !== undefined && s.current_progress !== null 
							? Math.round(s.current_progress * 100) 
							: (s.progress !== undefined && s.progress !== null ? s.progress : 0)),
					stealth: s.stealth === true || s.stealth === 'true' || s.stealth === '1',
					contact_me: s.contact_me !== false && s.contact_me !== 'false' && s.contact_me !== '0',
					name: s.startup_name || s.name || 'Unknown Startup',
					founder_name: s.username || s.founder_name || s.founder || s.name || 'Unknown Founder'
				}))
				.filter((s: any) => {
					// Don't filter anything here - let the API handle it
					// The API already ensures current user's startup is always included
					return true;
				})
			logger.log(`[ProgressPage] Processed ${processedData.length} startups (after filtering unknown houses)`)
			logger.log('[ProgressPage] All telegram_ids:', processedData.map((s: any) => ({ npid: s.npid, telegram_id: s.telegram_id, name: s.username })))
			setStartups(processedData)
			setAllStartups(processedData) // Store all startups for statistics
			
			// Find user's startup
			// In Real API mode, match by telegram_id from the auth token
			let userStartup;
			if (ApiConfigManager.isMockApiMode() ? "mock" : "real" === 'real') {
				// Try to decode the auth token to get telegram_id
				const token = localStorage.getItem('ncacc_token');
				if (token) {
					try {
						const decoded = JSON.parse(atob(token));
						const userTelegramId = decoded.telegram_id;
						logger.log('[ProgressPage] Decoded token:', decoded);
						logger.log('[ProgressPage] Looking for user with telegram_id:', userTelegramId);
						
						userStartup = processedData.find((s: Startup) => {
							const matches = String(s.telegram_id) === String(userTelegramId);
							if (matches) {
								logger.log(`[ProgressPage] Found match! npid=${s.npid}, telegram_id=${s.telegram_id}`);
							}
							return matches;
						});
						
						if (!userStartup) {
							logger.warn(`[ProgressPage] No startup found for telegram_id ${userTelegramId}`);
							logger.log('[ProgressPage] Available startups:', processedData.map((s: any) => ({
								npid: s.npid,
								telegram_id: s.telegram_id,
								name: s.username
							})));
							// Fallback to first startup that matches isCurrentUser flag
							userStartup = processedData.find((s: any) => s.isCurrentUser === true);
							if (!userStartup && processedData.length > 0) {
								logger.error('[ProgressPage] WARNING: Using first startup as fallback - this is likely wrong!');
								userStartup = processedData[0];
							}
						}
					} catch (e) {
						logger.error('[ProgressPage] Failed to decode token:', e);
					}
				}
			} else {
				// Mock mode - use existing logic
				logger.log('[ProgressPage] Mock mode - looking for user startup');
				logger.log('[ProgressPage] User data:', user);
				logger.log('[ProgressPage] Looking for npid:', user?.startup?.npid || user?.id);
				
				userStartup = processedData.find((s: Startup) => {
					const matches = s.id === String(user?.startup?.npid) || 
						s.npid === String(user?.startup?.npid) ||
						s.id === user?.id ||
						s.npid === user?.id ||
						s.founder_email === user?.email;
					if (matches) {
						logger.log(`[ProgressPage] Found user startup: npid=${s.npid}, id=${s.id}, name=${s.name}`);
					}
					return matches;
				});
				
				if (!userStartup) {
					logger.warn('[ProgressPage] No startup found for user in mock mode');
				}
			}
			if (userStartup) {
				setMyStartup(userStartup)
				setEditValues({
					progress: userStartup.progress,
					stealth: userStartup.stealth,
					contact_me: userStartup.contact_me !== false
				})
				// Set house filter to user's house by default
				const userHouse = normalizeHouse(userStartup.house);
				if (userHouse && userHouse !== 'unknown') {
					setHouseFilter(userHouse);
				}
			}
		} catch (error) {
			logger.error('Failed to load startups:', error)
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}

	const handleSave = async (field: string) => {
		if (!myStartup) return
		
		// Don't allow editing in Real API mode
		if (ApiConfigManager.isMockApiMode() ? "mock" : "real" === 'real') {
			logger.log('[ProgressPage] Editing disabled in Real API mode')
			return
		}
		
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
				name: editValues.startup_name || myStartup.name,
				stealth: editValues.stealth,
				contact_me: editValues.contact_me
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
			logger.log('[ProgressPage] Saving updates with API mode:', ApiConfigManager.isMockApiMode() ? "mock" : "real")
			logger.log('[ProgressPage] Updates:', updates)
			
			const npid = parseInt(myStartup.npid || myStartup.id)
			const response = await unifiedApi.updateStartup(npid, updates)
			logger.log('[ProgressPage] Update response:', response)
			
			if (!response.success) {
				throw new Error(response.error || 'Failed to save')
			}
			
			// Reload data to get the latest from persistence
			await loadStartups()
		} catch (error) {
			logger.error('Failed to save:', error)
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
		// Always use the latest startup data - check both id and npid
		const latestStartup = startups.find(s => 
			(s.id && s.id === startup.id) || 
			(s.npid && s.npid === startup.npid)
		) || startup
		
		
		setSelectedStartup(latestStartup)
		const initialEditValues = {
			progress: latestStartup.progress,
			stealth: latestStartup.stealth === true || latestStartup.stealth === 'true' || latestStartup.stealth === '1',
			contact_me: latestStartup.contact_me !== false
		}
		setEditValues(initialEditValues)
		setShowModal(true)
	}

	const closeModal = () => {
		setShowModal(false)
		setSelectedStartup(null)
		setEditingField(null)
		// Clear edit values when closing
		setEditValues({})
	}

	const copyToClipboard = async (data: any, sectionName: string) => {
		try {
			await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
			setCopiedSection(sectionName)
			setTimeout(() => setCopiedSection(null), 2000)
		} catch (err) {
			logger.error('Failed to copy:', err)
		}
	}

	// Get unique houses from the data
	// Get unique normalized houses for filtering - always show all 4 houses
	const dataHouses = Array.from(new Set(
		startups
			.map(s => normalizeHouse(s.house))
			.filter((h): h is string => h !== null && h !== 'unknown')
	));
	const uniqueHouses = ensureAllHousesPresent(dataHouses);

	// Calculate statistics from ALL startups (not filtered)
	const totalStartups = allStartups.length;
	const uniqueCountries = new Set(
		allStartups
			.map(s => s.founder_country || s.country || '')
			.filter(Boolean)
	).size;
	const averageProgress = allStartups.length > 0
		? Math.round(allStartups.reduce((sum, s) => sum + (s.progress || 0), 0) / allStartups.length)
		: 0;
	const houseDistribution = uniqueHouses.map(house => ({
		house,
		count: startups.filter(s => normalizeHouse(s.house) === house).length
	}));

	const filteredStartups = startups
		.filter(s => {
			const normalizedHouse = normalizeHouse(s.house);
			// Filter out unknown houses unless explicitly showing all
			if (normalizedHouse === 'unknown' && houseFilter !== 'all') return false;
			const houseMatch = houseFilter === 'all' || normalizedHouse === houseFilter
			return houseMatch
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
		<div className="space-y-3">
			{/* Header with Refresh Button */}
			<div className="flex justify-between items-center">
				
				<div className="flex items-center gap-2">
					{/* Debug Button - Only in development */}
					{(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
						<>
							<button
								onClick={() => setShowDebugPanel(!showDebugPanel)}
								className="px-3 py-1.5 rounded-lg flex items-center gap-2 transition text-sm bg-yellow-500 text-white hover:bg-yellow-600"
							>
								🐛 {showDebugPanel ? 'Hide' : 'Show'} Debug
							</button>
							<button
								onClick={() => loadStartups(true)}
								disabled={refreshing}
								className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition text-sm ${
									refreshing
										? 'bg-gray-300 text-gray-500 cursor-not-allowed'
										: 'bg-indigo-600 text-white hover:bg-indigo-700'
								}`}
							>
								<svg
									className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
								{refreshing ? 'Refreshing...' : 'Refresh Data'}
							</button>
						</>
					)}
				</div>
			</div>

			{/* Debug Panel - Only in development */}
			{showDebugPanel && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
				<div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 shadow-lg">
					<h2 className="text-lg font-bold text-yellow-900 mb-3">🐛 Debug Data Panel</h2>
					<div className="space-y-4">
						<details className="bg-white rounded-lg p-3 border border-yellow-200">
							<summary className="cursor-pointer font-semibold text-yellow-800 hover:text-yellow-900">
								All Startups Data ({startups.length} items)
							</summary>
							<div className="mt-3">
								<div className="flex justify-end mb-2">
									<button
										onClick={() => copyToClipboard(startups, 'all-startups')}
										className={`px-3 py-1 text-xs rounded-lg transition ${
											copiedSection === 'all-startups'
												? 'bg-green-500 text-white'
												: 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
										}`}
									>
										{copiedSection === 'all-startups' ? '✓ Copied!' : '📋 Copy JSON'}
									</button>
								</div>
								<div className="max-h-96 overflow-auto bg-gray-50 p-2 rounded">
									<pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
										{JSON.stringify(startups, null, 2)}
									</pre>
								</div>
							</div>
						</details>
						<details className="bg-white rounded-lg p-3 border border-yellow-200">
							<summary className="cursor-pointer font-semibold text-yellow-800 hover:text-yellow-900">
								My Startup Data
							</summary>
							<div className="mt-3">
								<div className="flex justify-end mb-2">
									<button
										onClick={() => copyToClipboard(myStartup, 'my-startup')}
										className={`px-3 py-1 text-xs rounded-lg transition ${
											copiedSection === 'my-startup'
												? 'bg-green-500 text-white'
												: 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
										}`}
									>
										{copiedSection === 'my-startup' ? '✓ Copied!' : '📋 Copy JSON'}
									</button>
								</div>
								<div className="max-h-96 overflow-auto bg-gray-50 p-2 rounded">
									<pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
										{JSON.stringify(myStartup, null, 2)}
									</pre>
								</div>
							</div>
						</details>
						<details className="bg-white rounded-lg p-3 border border-yellow-200">
							<summary className="cursor-pointer font-semibold text-yellow-800 hover:text-yellow-900">
								Filtered Startups ({filteredStartups.length} items)
							</summary>
							<div className="mt-3">
								<div className="flex justify-end mb-2">
									<button
										onClick={() => copyToClipboard(filteredStartups, 'filtered-startups')}
										className={`px-3 py-1 text-xs rounded-lg transition ${
											copiedSection === 'filtered-startups'
												? 'bg-green-500 text-white'
												: 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
										}`}
									>
										{copiedSection === 'filtered-startups' ? '✓ Copied!' : '📋 Copy JSON'}
									</button>
								</div>
								<div className="max-h-96 overflow-auto bg-gray-50 p-2 rounded">
									<pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
										{JSON.stringify(filteredStartups, null, 2)}
									</pre>
								</div>
							</div>
						</details>
					</div>
				</div>
			)}


			{/* My Startup Section */}
			{myStartup && (
				<div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-4 shadow-lg">
					<div className="bg-white rounded-lg p-3 shadow-sm">
						<div className="flex items-center justify-between">
							<div className="flex-1">
								<div className="flex items-center gap-2 mb-1">
									<h3 className="text-xl font-semibold text-gray-900">
										{myStartup.stealth ? 'Stealth Mode' : myStartup.name}
									</h3>
									<button
										onClick={() => openModal(myStartup)}
										className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition text-xs font-medium"
									>
										Open your full profile →
									</button>
								</div>
								<p className="text-gray-600">
									{myStartup.stealth ? 'Information hidden' : `Solo-Founded by ${myStartup.founder_name}`}
								</p>
							</div>
							<div className="flex items-center gap-4">
								<div className="text-right">
									<div className="text-2xl font-bold text-indigo-600">
										{isNaN(myStartup.progress) || myStartup.progress === null || myStartup.progress === undefined ? 'N/A' : `${myStartup.progress}%`}
									</div>
									<div className="text-sm text-gray-500">Progress</div>
								</div>
								{myStartup.house && (
									<span className={`px-3 py-1 rounded-full text-sm font-medium ${getHouseBadgeClass(myStartup.house)}`}>
										{getHouseDisplayName(myStartup.house)}
									</span>
								)}
							</div>
						</div>
					</div>
					{/* House Goal Information */}
					{myStartup.house && myStartup.house.toLowerCase() !== 'unknown' ? (
						<div className={`mt-4 rounded-xl p-4 border ${
							normalizeHouse(myStartup.house) === 'side'
								? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200'
								: normalizeHouse(myStartup.house) === 'venture'
								? 'bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200'
								: normalizeHouse(myStartup.house) === 'karma'
								? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
								: normalizeHouse(myStartup.house) === 'builder'
								? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
								: 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200'
						}`}>
							<div className="space-y-3">
								<div>
									<p className={`text-xs font-medium uppercase tracking-wider ${
										normalizeHouse(myStartup.house) === 'side'
											? 'text-orange-600'
											: normalizeHouse(myStartup.house) === 'venture'
											? 'text-purple-600'
											: normalizeHouse(myStartup.house) === 'karma'
											? 'text-green-600'
											: normalizeHouse(myStartup.house) === 'builder'
											? 'text-blue-600'
											: 'text-indigo-600'
									}`}>
										YOUR {myStartup.house.toUpperCase()} HOUSE GOAL: {getHouseGoalInfo(myStartup.house).goal.toUpperCase()}
									</p>
								</div>
								<p className={`text-sm leading-relaxed ${
									normalizeHouse(myStartup.house) === 'side'
										? 'text-orange-800'
										: normalizeHouse(myStartup.house) === 'venture'
										? 'text-purple-800'
										: normalizeHouse(myStartup.house) === 'karma'
										? 'text-green-800'
										: normalizeHouse(myStartup.house) === 'builder'
										? 'text-blue-800'
										: 'text-indigo-800'
								}`}>
									{getHouseGoalInfo(myStartup.house).description}
								</p>
								<div className={`pt-2 border-t ${
									normalizeHouse(myStartup.house) === 'side'
										? 'border-orange-200'
										: normalizeHouse(myStartup.house) === 'venture'
										? 'border-purple-200'
										: normalizeHouse(myStartup.house) === 'karma'
										? 'border-green-200'
										: normalizeHouse(myStartup.house) === 'builder'
										? 'border-blue-200'
										: 'border-indigo-200'
								}`}>
									<p className={`font-semibold italic ${
										normalizeHouse(myStartup.house) === 'side'
											? 'text-orange-900'
											: normalizeHouse(myStartup.house) === 'venture'
											? 'text-purple-900'
											: normalizeHouse(myStartup.house) === 'karma'
											? 'text-green-900'
											: normalizeHouse(myStartup.house) === 'builder'
											? 'text-blue-900'
											: 'text-indigo-900'
									}`}>
										💪 {isNaN(myStartup.progress) || myStartup.progress === null || myStartup.progress === undefined
											? `Ready to start? Talk to No Cap to set your goals and get personalized guidance on your first steps toward your ${myStartup.house} milestone!`
											: myStartup.progress >= 80 
											? `Amazing progress at ${myStartup.progress}%! You're close to achieving your ${myStartup.house} goal!`
											: myStartup.progress >= 60
											? `Strong momentum at ${myStartup.progress}%! Keep pushing toward your ${myStartup.house} milestone.`
											: myStartup.progress >= 40
											? `Good progress at ${myStartup.progress}%! Halfway to your ${myStartup.house} goal.`
											: myStartup.progress >= 20
											? `${myStartup.progress}% and climbing! Building toward your ${myStartup.house} goal.`
											: `${myStartup.progress}% - Let's build momentum toward your ${myStartup.house} goal!`
										}
									</p>
								</div>
							</div>
						</div>
					) : (
						<div className="mt-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
							<div className="space-y-3">
								<div>
									<p className="text-sm text-orange-600 font-medium uppercase tracking-wide">Getting Started</p>
									<p className="text-lg font-bold text-orange-900 mt-1">
										Your House Assignment is Coming Soon!
									</p>
								</div>
								<p className="text-sm text-orange-800 leading-relaxed">
									Talk to No Cap to complete your onboarding and get assigned to the perfect house for your startup journey. 
									Each house has unique goals and support systems tailored to different types of founders.
								</p>
								<div className="pt-2 border-t border-orange-200">
									<p className="text-orange-900 font-semibold italic">
										🚀 Ready to begin? Chat with No Cap to explore which house aligns with your vision!
									</p>
								</div>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Startups Table */}
			<div className="bg-white rounded-xl p-4 shadow-lg">
				<div className="flex items-center justify-between mb-3">
					
					<div className="flex items-center gap-2">
						{houseFilter !== 'all' && (
							<button
								onClick={() => setHouseFilter('all')}
								className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition text-sm font-medium"
							>
								Show All Houses
							</button>
						)}
						<select
							value={houseFilter}
							onChange={(e) => setHouseFilter(e.target.value)}
							className="px-3 py-1 border rounded-lg text-sm"
						>
							<option value="all">All Houses</option>
								{uniqueHouses.map(house => (
									<option key={house} value={house}>{getHouseDisplayName(house)}</option>
								))}
							</select>
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
								<th className="text-left py-3 px-4 text-sm font-semibold text-gray-600" style={{ width: '30%' }}>Startup</th>
								<th className="text-left py-3 px-4 text-sm font-semibold text-gray-600" style={{ width: '20%' }}>Founder</th>
								<th className="text-left py-3 px-4 text-sm font-semibold text-gray-600" style={{ width: '15%' }}>House</th>
								<th className="text-left py-3 px-4 text-sm font-semibold text-gray-600" style={{ width: '35%' }}>Progress</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{filteredStartups.map((startup) => {
								const isMyStartup = startup.id === myStartup?.id
								const isStealthed = startup.stealth === true || startup.stealth === 'true' || startup.stealth === '1'
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
										<td className="py-4 px-4" style={{ width: '30%' }}>
											<div className="flex items-center gap-2">
												<div>
													<div className="font-medium text-gray-900 flex items-center gap-2">
														{isStealthed ? 'Stealth Startup' : startup.name}
														{!isStealthed && (startup.pitch_video_url || startup.demo_video_url) && (
															<span className="inline-flex items-center px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium" title="Video available">
																📹
															</span>
														)}
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
										<td className="py-4 px-4 text-gray-600" style={{ width: '20%' }}>
											{isStealthed ? '-' :
												(startup.contact_me === false && !isMyStartup ? 'Contact Hidden' : startup.founder_name)
											}
										</td>
										<td className="py-4 px-4" style={{ width: '15%' }}>
											{startup.house ? (
												<span className={`px-2 py-1 rounded-full text-xs font-medium ${getHouseBadgeClass(startup.house)}`}>
													{getHouseDisplayName(startup.house)}
												</span>
											) : (
												<span className="text-gray-400">-</span>
											)}
										</td>
										<td className="py-4 px-4" style={{ width: '35%' }}>
											<div className="flex items-center gap-3">
												<div className="flex-1" style={{ maxWidth: '200px' }}>
													<div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
														<div
															className={`h-2.5 rounded-full transition-all duration-500 ${
																startup.progress >= 90 ? 'bg-green-500' :
																startup.progress >= 70 ? 'bg-emerald-400' :
																startup.progress >= 50 ? 'bg-blue-400' :
																startup.progress >= 30 ? 'bg-sky-400' :
																startup.progress >= 10 ? 'bg-amber-400' :
																'bg-orange-400'
															}`}
															style={{ width: `${isNaN(startup.progress) || startup.progress === null || startup.progress === undefined ? 0 : startup.progress}%` }}
														/>
													</div>
												</div>
												<span className="text-sm font-semibold text-gray-700 min-w-[45px] text-right">
													{isNaN(startup.progress) || startup.progress === null || startup.progress === undefined ? 'N/A' : `${startup.progress}%`}
												</span>
											</div>
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
									{selectedStartup.id === myStartup?.id && editingField !== 'modal' && ApiConfigManager.isMockApiMode() ? "mock" : "real" !== 'real' && (
										<button
											onClick={() => {
												setEditingField('modal')
												// Get the latest startup data
												const latestStartup = startups.find(s => s.id === selectedStartup.id) || selectedStartup
												// Initialize edit values with current startup data
												const fullEditValues = {
													progress: latestStartup.progress,
													stealth: latestStartup.stealth === true || latestStartup.stealth === 'true' || latestStartup.stealth === '1',
													contact_me: latestStartup.contact_me !== false,
													startup_name: latestStartup.startup_name || latestStartup.name,
													website: latestStartup.website || '',
													founder_name: latestStartup.founder_name || '',
													founder_email: latestStartup.founder_email || '',
													founder_telegram: latestStartup.founder_telegram || '',
													founder_linkedin_url: latestStartup.founder_linkedin_url || '',
													long_pitch: latestStartup.long_pitch || '',
													traction: latestStartup.traction || '',
													pitch_video_url: latestStartup.pitch_video_url || latestStartup.demo_video_url || '',
													bio: latestStartup.bio || '',
													motivation: latestStartup.motivation || '',
													founder_city: latestStartup.founder_city || '',
													founder_country: latestStartup.founder_country || '',
													founder_time_commitment_pct: latestStartup.founder_time_commitment_pct || '',
													proof_of_concept: latestStartup.proof_of_concept || '',
													dataroom_url: latestStartup.dataroom_url || ''
												}
												setEditValues(fullEditValues)
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
							{/* nc/acc Edit Notice */}
							{selectedStartup.id === myStartup?.id && (
								<div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-300 shadow-sm">
									<p className="text-sm text-gray-700 leading-relaxed">
										<span className="font-semibold text-gray-900">💬 Want to update this information?</span>{' '}
										<span className="text-gray-800">Talk to No Cap!</span>{' '}
										She'll help you refine your startup details, track your progress, and provide personalized guidance based on your {myStartup.house} house goals.
									</p>
								</div>
							)}
							
							{/* Pitch Video at Top */}
							{(() => {
								const isEditing = editingField === 'modal' && selectedStartup.id === myStartup?.id
								const videoUrl = isEditing
									? editValues.pitch_video_url
									: (selectedStartup.pitch_video_url || selectedStartup.demo_video_url)

								// Support multiple video platforms
								let videoId = ''
								let videoType = 'youtube' // youtube, vimeo, loom, or direct

								if (videoUrl && typeof videoUrl === 'string') {
									const url = videoUrl.trim()

									// YouTube detection
									if (url.includes('youtube.com/watch?v=')) {
										videoId = url.split('v=')[1]?.split('&')[0] || ''
										videoType = 'youtube'
									} else if (url.includes('youtu.be/')) {
										videoId = url.split('youtu.be/')[1]?.split('?')[0] || ''
										videoType = 'youtube'
									} else if (url.includes('youtube.com/embed/')) {
										videoId = url.split('youtube.com/embed/')[1]?.split('?')[0] || ''
										videoType = 'youtube'
									} else if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
										// Looks like a YouTube video ID (11 characters)
										videoId = url
										videoType = 'youtube'
									}
									// Vimeo detection
									else if (url.includes('vimeo.com/')) {
										videoId = url.split('vimeo.com/')[1]?.split('?')[0]?.split('/')[0] || ''
										videoType = 'vimeo'
									}
									// Loom detection
									else if (url.includes('loom.com/share/') || url.includes('loom.com/embed/')) {
										videoId = url.split('/share/')[1]?.split('?')[0] || url.split('/embed/')[1]?.split('?')[0] || ''
										videoType = 'loom'
									}
									// Direct video URL (mp4, webm, etc)
									else if (url.match(/\.(mp4|webm|ogg)$/i)) {
										videoId = url
										videoType = 'direct'
									}
								}

								if (!videoUrl && !isEditing) return null

								return (
									<div className="bg-gray-50 rounded-xl p-4">
										<h3 className="text-center text-lg font-semibold text-gray-900 mb-3">
											{selectedStartup.demo_video_url && !selectedStartup.pitch_video_url ? 'Product Demo Video' : 'My 90s presentation (who i am, what i build, why now...)'}
										</h3>
										{isEditing && (
											<div className="mb-4 max-w-2xl mx-auto">
												<label className="text-sm text-gray-500">Video URL (YouTube, Vimeo, Loom, or direct link)</label>
												<input
													type="text"
													value={editValues.pitch_video_url || ''}
													onChange={(e) => setEditValues({ ...editValues, pitch_video_url: e.target.value })}
													className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
													placeholder="https://www.youtube.com/watch?v=xvFZjo5PgG0"
												/>
												{!videoId && (
													<p className="text-sm text-gray-500 mt-2">Enter a video URL to preview (supports YouTube, Vimeo, Loom, or direct video files)</p>
												)}
											</div>
										)}
										{videoId && (
											<div className="max-w-2xl mx-auto">
												{videoType === 'youtube' && (
													<div className="relative w-full" style={{ paddingBottom: '42%' }}>
														<iframe
															className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
															src={`https://www.youtube.com/embed/${videoId}?rel=0`}
															title="Video presentation"
															allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
															allowFullScreen
															loading="lazy"
														/>
													</div>
												)}
												{videoType === 'vimeo' && (
													<div className="relative w-full" style={{ paddingBottom: '42%' }}>
														<iframe
															className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
															src={`https://player.vimeo.com/video/${videoId}`}
															title="Video presentation"
															allow="autoplay; fullscreen; picture-in-picture"
															allowFullScreen
															loading="lazy"
														/>
													</div>
												)}
												{videoType === 'loom' && (
													<div className="relative w-full" style={{ paddingBottom: '42%' }}>
														<iframe
															className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
															src={`https://www.loom.com/embed/${videoId}`}
															title="Video presentation"
															allowFullScreen
															loading="lazy"
														/>
													</div>
												)}
												{videoType === 'direct' && (
													<video
														className="w-full rounded-lg shadow-lg"
														controls
														src={videoId}
													>
														Your browser does not support the video tag.
													</video>
												)}
											</div>
										)}
										{!videoId && videoUrl && (
											<div className="max-w-2xl mx-auto p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
												<p className="text-sm text-yellow-800">
													Video URL detected but cannot be embedded.
													<a href={videoUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:text-blue-800 underline">
														Open in new tab →
													</a>
												</p>
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
														style={{ width: `${isNaN(selectedStartup.progress) || selectedStartup.progress === null || selectedStartup.progress === undefined ? 0 : selectedStartup.progress}%` }}
													/>
												</div>
											</div>
											<span className="text-xl font-bold text-indigo-600">
												{isNaN(selectedStartup.progress) || selectedStartup.progress === null || selectedStartup.progress === undefined ? 'N/A' : `${selectedStartup.progress}%`}
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

										{/* Additional overview fields only for user's own startup */}
										{selectedStartup.id === myStartup?.id && (
											<>
												{selectedStartup.startup_idea && (
													<div>
														<span className="text-sm text-gray-500">Startup Idea</span>
														<p className="text-gray-900 mt-1">{selectedStartup.startup_idea}</p>
													</div>
												)}
												{selectedStartup.background && (
													<div>
														<span className="text-sm text-gray-500">Background</span>
														<p className="text-gray-900 mt-1">{selectedStartup.background}</p>
													</div>
												)}
												{selectedStartup.commitment && (
													<div>
														<span className="text-sm text-gray-500">Commitment</span>
														<p className="text-gray-900 mt-1">{selectedStartup.commitment}</p>
													</div>
												)}
												{selectedStartup.problem && (
													<div>
														<span className="text-sm text-gray-500">Problem</span>
														<p className="text-gray-900 mt-1">{selectedStartup.problem}</p>
													</div>
												)}
												{selectedStartup.concern && (
													<div>
														<span className="text-sm text-gray-500">Concerns</span>
														<p className="text-gray-900 mt-1">{selectedStartup.concern}</p>
													</div>
												)}
											</>
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
											<p className="font-medium text-gray-900">{selectedStartup.founder_name || selectedStartup.name || selectedStartup.username || '-'}</p>
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
												<p className="font-medium text-gray-900">{selectedStartup.founder_email || selectedStartup.email || '-'}</p>
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
											<p className="font-medium text-gray-900">
												{selectedStartup.location ||
												 (selectedStartup.founder_city && selectedStartup.founder_country
												   ? `${selectedStartup.founder_city}, ${selectedStartup.founder_country}`
												   : selectedStartup.founder_city || selectedStartup.founder_country || '-')}
											</p>
										)}
									</div>
									<div>
										<span className="text-sm text-gray-500">House</span>
										<p>
											{selectedStartup.house ? (
												<span className={`px-2 py-1 rounded-full text-xs font-medium ${getHouseBadgeClass(selectedStartup.house)}`}>
													{getHouseDisplayName(selectedStartup.house)}
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

							{/* Product & Business - Enhanced for user's own startup */}
							<div className="border-t pt-6">
								<h3 className="text-lg font-semibold text-gray-900 mb-4">Product & Business</h3>
								<div className="space-y-4">
									{selectedStartup.product && (
										<div>
											<span className="text-sm text-gray-500">Product</span>
											<p className="text-gray-900 mt-1">{selectedStartup.product}</p>
										</div>
									)}
									{selectedStartup.Business_model_explained && (
										<div>
											<span className="text-sm text-gray-500">Business Model</span>
											<p className="text-gray-900 mt-1">{selectedStartup.Business_model_explained}</p>
										</div>
									)}

									{/* Additional details only for user's own startup */}
									{selectedStartup.id === myStartup?.id && (
										<>
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
											{selectedStartup.value_proposition && (
												<div>
													<span className="text-sm text-gray-500">Value Proposition</span>
													<p className="text-gray-900 mt-1">{selectedStartup.value_proposition}</p>
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
											{selectedStartup.current_workaround && (
												<div>
													<span className="text-sm text-gray-500">Current Workaround</span>
													<p className="text-gray-900 mt-1">{selectedStartup.current_workaround}</p>
												</div>
											)}
											{selectedStartup.product_job_to_be_done && (
												<div>
													<span className="text-sm text-gray-500">Job to be Done</span>
													<p className="text-gray-900 mt-1">{selectedStartup.product_job_to_be_done}</p>
												</div>
											)}
										</>
									)}
								</div>
							</div>

							{/* Current Status & Progress - Only for user's own startup */}
							{selectedStartup.id === myStartup?.id && (
								<div className="border-t pt-6">
									<h3 className="text-lg font-semibold text-gray-900 mb-4">Current Status & Activity</h3>
									<div className="space-y-4">
										{selectedStartup.status && (
											<div>
												<span className="text-sm text-gray-500">Status</span>
												<p className="text-gray-900 mt-1">{selectedStartup.status}</p>
											</div>
										)}
										{selectedStartup.current_state && (
											<div>
												<span className="text-sm text-gray-500">Current State</span>
												<p className="text-gray-900 mt-1">{selectedStartup.current_state}</p>
											</div>
										)}
										{selectedStartup.current_concern && (
											<div>
												<span className="text-sm text-gray-500">Current Concerns</span>
												<p className="text-gray-900 mt-1">{selectedStartup.current_concern}</p>
											</div>
										)}
										{selectedStartup.first_experiment && (
											<div>
												<span className="text-sm text-gray-500">First Experiment</span>
												<p className="text-gray-900 mt-1">{selectedStartup.first_experiment}</p>
											</div>
										)}
										{selectedStartup.immediate_build_priority && (
											<div>
												<span className="text-sm text-gray-500">Immediate Build Priority</span>
												<p className="text-gray-900 mt-1">{selectedStartup.immediate_build_priority}</p>
											</div>
										)}
										{selectedStartup.tracking_metric && (
											<div>
												<span className="text-sm text-gray-500">Tracking Metric</span>
												<p className="text-gray-900 mt-1">{selectedStartup.tracking_metric}</p>
											</div>
										)}
										{selectedStartup.stage && (
											<div>
												<span className="text-sm text-gray-500">Stage</span>
												<p className="text-gray-900 mt-1">{selectedStartup.stage}</p>
											</div>
										)}
									</div>
								</div>
							)}

							{/* Additional Insights - Only for user's own startup */}
							{selectedStartup.id === myStartup?.id && (
								selectedStartup.breakthrough_insight ||
								selectedStartup.user_problem_focus ||
								selectedStartup.deprioritized_items ||
								selectedStartup.pain_point_identified ||
								selectedStartup.target_customers ||
								selectedStartup.session_materials ||
								selectedStartup.kickoff_preference
							) && (
								<div className="border-t pt-6">
									<h3 className="text-lg font-semibold text-gray-900 mb-4">Insights & Strategy</h3>
									<div className="space-y-4">
										{selectedStartup.breakthrough_insight && (
											<div>
												<span className="text-sm text-gray-500">Breakthrough Insight</span>
												<p className="text-gray-900 mt-1">{selectedStartup.breakthrough_insight}</p>
											</div>
										)}
										{selectedStartup.user_problem_focus && (
											<div>
												<span className="text-sm text-gray-500">User Problem Focus</span>
												<p className="text-gray-900 mt-1">{selectedStartup.user_problem_focus}</p>
											</div>
										)}
										{selectedStartup.deprioritized_items && (
											<div>
												<span className="text-sm text-gray-500">Deprioritized Items</span>
												<p className="text-gray-900 mt-1">{selectedStartup.deprioritized_items}</p>
											</div>
										)}
										{selectedStartup.pain_point_identified && (
											<div>
												<span className="text-sm text-gray-500">Pain Point Identified</span>
												<p className="text-gray-900 mt-1">{selectedStartup.pain_point_identified}</p>
											</div>
										)}
										{selectedStartup.target_customers && (
											<div>
												<span className="text-sm text-gray-500">Target Customers</span>
												<p className="text-gray-900 mt-1">{selectedStartup.target_customers}</p>
											</div>
										)}
										{selectedStartup.session_materials && (
											<div>
												<span className="text-sm text-gray-500">Session Materials</span>
												<p className="text-gray-900 mt-1">{selectedStartup.session_materials}</p>
											</div>
										)}
										{selectedStartup.kickoff_preference && (
											<div>
												<span className="text-sm text-gray-500">Kickoff Preference</span>
												<p className="text-gray-900 mt-1">{selectedStartup.kickoff_preference}</p>
											</div>
										)}
									</div>
								</div>
							)}

							{/* Website */}
							{selectedStartup.website && (
								<div className="border-t pt-6">
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
								</div>
							)}

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
							
							{/* Debug Data - Only shown in development */}
							{(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
								<div className="border-t pt-6">
									<details className="group">
										<summary className="cursor-pointer text-lg font-semibold text-gray-900 mb-4 hover:text-indigo-600 flex items-center gap-2">
											🐛 Debug: All Data Fields
											<span className="text-xs text-gray-500 font-normal">(Development Only)</span>
										</summary>
										<div className="mt-4">
											<div className="flex justify-end mb-2">
												<button
													onClick={() => copyToClipboard(selectedStartup, 'modal-startup')}
													className={`px-3 py-1 text-xs rounded-lg transition ${
														copiedSection === 'modal-startup'
															? 'bg-green-500 text-white'
															: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
													}`}
												>
													{copiedSection === 'modal-startup' ? '✓ Copied!' : '📋 Copy JSON'}
												</button>
											</div>
											<div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
												<pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
													{JSON.stringify(selectedStartup, null, 2)}
												</pre>
											</div>
										</div>
									</details>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	)
}