// Lightweight dev-time API mock leveraging Vite dev server proxy via fetch handlers
// This runs only in development to simulate endpoints using CSV/JSON in public/

import Papa from 'papaparse'
import { mockPersistence } from './mockPersistence'

type Startup = {
	id: string
	name: string
	website?: string
	location?: string
	house?: string
	progress: number
	stealth?: boolean
	loginCode?: string
	circle?: string
	circle_name?: string
	circle_description?: string
	wave?: string
	[tag: string]: any
}

type CsvOverrides = Record<string, any>
let csvOverrides: CsvOverrides | null = null

function getOverrides(): CsvOverrides {
	if (csvOverrides) return csvOverrides
	try {
		const raw = localStorage.getItem('mockCsvOverrides')
		csvOverrides = raw ? (JSON.parse(raw) as CsvOverrides) : {}
	} catch {
		csvOverrides = {}
	}
	return csvOverrides!
}

function saveOverrides(next: CsvOverrides) {
	csvOverrides = next
	try {
		localStorage.setItem('mockCsvOverrides', JSON.stringify(next))
	} catch {}
}

async function loadStartups(): Promise<Startup[]> {
	// Prefer user-provided sample.csv if available, else fallback to bundled CSV
	const text = await loadCsvText()
	const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
	const rows = (parsed.data as any[]).filter(Boolean)
	
	// Apply persisted data from our new persistence layer
	const withPersistence = rows.map((r: any) => {
		const id = String(r.npid || r.id || '')
		if (!id) return r
		
		// Check if we have persisted data for this startup
		const persisted = mockPersistence.getStartup(id)
		if (persisted) {
			console.log(`[MockServer] Applying persisted data for ${id}:`, persisted)
			// Return the persisted data, which completely replaces the CSV row
			return persisted
		}
		
		return r
	})
	
	return withPersistence.map((r, idx) => mapRowToStartup(r, idx))
}

async function loadCsvText(): Promise<string> {
	// Try fetching sample.csv from public folder (works on both dev and production)
	try {
		const res = await fetch('/sample.csv', { cache: 'no-cache' })
		if (res.ok) {
			const txt = await res.text()
			if (txt && txt.length > 0) return txt
		}
	} catch (e) {
		console.error('Failed to load /sample.csv:', e)
	}
	
	// Fallback to bundled sample in public/data if sample.csv not found
	try {
		const res = await fetch('/data/startups.csv', { cache: 'no-cache' })
		if (res.ok) {
			return await res.text()
		}
	} catch (e) {
		console.error('Failed to load /data/startups.csv:', e)
	}
	
	// Return empty CSV as last resort
	return 'id,name,website,location,house,progress,founder'
}

function mapRowToStartup(r: any, idx: number): Startup {
	// Map columns from the actual CSV structure
	const normalizedHouse = normalizeHouse(r.house)
	const details = parseDetails(r.details)
	const startupName = r.startup_name || r.startup || details?.startup || r.name || `Startup ${idx + 1}`
	const website = r.website || details?.website || ''
	const location = (r.founder_city || r.founder_country)
		? [r.founder_city, r.founder_country].filter(Boolean).join(', ')
		: (r.location || details?.location || '')
	const progress = r.current_progress != null && r.current_progress !== '' ? Math.round(Number(r.current_progress) * 100) : Number(r.progress || 0)

	let founderCity = ''
	let founderCountry = ''
	if (typeof location === 'string' && location.trim().length > 0) {
		const parts = location.split(',').map((s: string) => s.trim()).filter(Boolean)
		founderCity = parts[0] || ''
		founderCountry = parts[1] || ''
	}

	const founderBio = (typeof r.bio === 'string' && r.bio.trim().length > 0)
		? r.bio
		: (typeof r.summary === 'string' && r.summary.trim().length > 0 ? r.summary : (details?.bio || ''))
	const founderMotivation = (typeof r.motivation === 'string' && r.motivation.trim().length > 0)
		? r.motivation
		: (typeof r.classification_reason === 'string' && r.classification_reason.trim().length > 0 ? r.classification_reason : (details?.motivation || ''))

	// Process stealth - check for boolean first (from overrides), then string values
	let stealth = false
	if (typeof r.stealth === 'boolean') {
		stealth = r.stealth
	} else if (r.stealth !== undefined && r.stealth !== null) {
		const stealthFlag = String(r.stealth).toLowerCase().trim()
		stealth = stealthFlag === 'true' || stealthFlag === '1' || stealthFlag === 'yes'
	}
	
	// Process contact_me - default to true if not specified
	let contact_me = true
	if (typeof r.contact_me === 'boolean') {
		contact_me = r.contact_me
	} else if (r.contact_me !== undefined && r.contact_me !== null && r.contact_me !== '') {
		const contactFlag = String(r.contact_me).toLowerCase().trim()
		contact_me = contactFlag === 'true' || contactFlag === '1' || contactFlag === 'yes'
	}
	
	const id = String(r.npid || r.id || `startup_${idx}`)
	const loginCode = r.login_code || r.loginCode || computeLoginCode(id)

	// Build the startup object with spread FIRST, then our processed values
	const result = {
		...r, // Spread first to include all CSV fields
		id,
		name: String(stealth ? 'Stealth Startup' : startupName),
		website: website ? String(website) : undefined,
		location: location ? String(location) : undefined,
		house: normalizedHouse || undefined,
		progress: Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0,
		founder: r.founder_name || r.name,
		founder_name: r.founder_name,
		founder_email: r.founder_email,
		detailsObj: details || undefined,
		founderCity,
		founderCountry,
		founderBio,
		founderMotivation,
		stealth, // Override with our processed value
		contact_me, // Override with our processed value
		loginCode,
		login_code: loginCode,
		circle: r.circle,
		circle_name: r.circle_name,
		circle_description: r.circle_description,
		wave: r.wave,
	}
	
	return result
}

function normalizeHouse(raw: any): string {
	if (!raw) return ''
	const s = String(raw).toLowerCase().replace(/[\[\]]/g, '').replace(/\s*house\s*/g, '').trim()
	// Map to canonical keys: venture | lifestyle | side | karma
	if (s.includes('adventure') || s === 'build' || s.includes('venture')) return 'venture'
	if (s.includes('lifestyle') || s.includes('smb')) return 'lifestyle'
	if (s.startsWith('side')) return 'side'
	if (s.includes('karma')) return 'karma'
	return s
}

function parseDetails(raw: any): any | null {
	if (!raw || typeof raw !== 'string') return null
	let txt = raw.trim()
	// Attempt to convert single-quote pseudo JSON to valid JSON
	if (txt.startsWith('{') && txt.endsWith('}')) {
		try {
			// Replace single quotes with double quotes for keys and values
			// Note: simplistic but works for the provided sample format
			const jsonish = txt.replace(/'([^']*)'/g, '"$1"')
			return JSON.parse(jsonish)
		} catch {}

		// Fallback: evaluate as JS object literal in dev
		try {
			// eslint-disable-next-line no-new-func
			const fn = new Function(`return (${txt});`)
			const obj = fn()
			if (obj && typeof obj === 'object') return obj
		} catch {}
	}
	return null
}

function delay<T>(value: T, ms = 250) {
	return new Promise<T>((resolve) => setTimeout(() => resolve(value), ms))
}

export function installMockApi() {
	// Enable mock API in both dev and production for now
	// TODO: Replace with real API endpoints later
	console.log('Installing mock API...')
	
	// Add debug commands to window
	if (typeof window !== 'undefined') {
		(window as any).clearMockData = () => {
			mockPersistence.clear()
			localStorage.removeItem('mockCsvOverrides')
			console.log('Cleared all mock data - refresh page to reload from CSV')
		}
		(window as any).showMockData = () => {
			const all = mockPersistence.getAllStartups()
			console.log('Stored startups:', all)
			return all
		}
		console.log('Debug commands available: window.clearMockData(), window.showMockData()')
	}
	
	const originalFetch = window.fetch

	window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = typeof input === 'string' ? input : input.toString()
		console.log('Fetch intercepted:', url, init?.method || 'GET')
		
		if (url.startsWith('/api/')) {
			console.log('Handling API call:', url)
			try {
				// route handling
				if (url === '/api/auth/verify' && init?.method !== 'GET') {
					const body = init?.body ? JSON.parse(init.body as string) : {}
					console.log('Auth verify request with code:', body.code)
					
					const ok = typeof body.code === 'string' && body.code.length > 6
					if (!ok) {
						console.log('Code too short or invalid')
						return json({ success: false, message: 'Code must be at least 7 characters' }, 200)
					}

					// Try to match any startup login code
					try {
						const startups = await loadStartups()
						console.log(`Loaded ${startups.length} startups from CSV`)
						
						// Log first few startups for debugging
						if (startups.length > 0) {
							console.log('Sample startup:', {
								id: startups[0].id,
								loginCode: startups[0].loginCode,
								name: startups[0].name
							})
						}
						
						// Find matching startup by login_code field or computed code
						const matched = startups.find((s) => {
							const computedCode = computeLoginCode(String(s.id))
							const csvLoginCode = (s as any).login_code || (s as any).loginCode
							const matches = csvLoginCode === body.code || computedCode === body.code
							
							if (s.id === '1750' || s.id === '1274') { // Debug first two entries
								console.log(`Checking ${s.id}:`, {
									csvLoginCode,
									computedCode,
									providedCode: body.code,
									matches
								})
							}
							
							return matches
						})
						
						if (matched) {
							console.log('Matched startup:', matched.id, matched.name)
							const user = {
								id: `user_${matched.id}`,
								name: (matched as any).founder_name || matched.founder || 'NC/ACC Founder',
								email: (matched as any).founder_email || matched.detailsObj?.email || 'founder@example.com',
								startup: { 
									id: matched.id, 
									name: matched.name, 
									website: matched.website, 
									progress: matched.progress, 
									house: matched.house 
								},
								house: matched.house || 'venture',
							}
							return json(await delay({ success: true, user, token: 'mock-jwt-token' }, 200))
						} else {
							console.log('No startup matched the provided code')
						}
					} catch (e) {
						console.error('Error matching startup:', e)
						return json({ success: false, message: 'Server error during authentication' }, 500)
					}
					
					// If no match found, return failure
					console.log('Authentication failed - no match found')
					return json({ success: false, message: 'Invalid access code' }, 200)
				}

				if (url === '/api/auth/refresh') {
					return json(await delay({ token: 'mock-jwt-token' }))
				}

				if (url.startsWith('/api/startups')) {
					// Handle POST for updates
					if (init?.method === 'POST' || init?.method === 'PUT') {
						try {
							const body = init?.body ? JSON.parse(init.body as string) : {}
							const id = String(body.id || '')
							if (!id) return json({ success: false, message: 'Missing id' }, 400)
							
							console.log('[MockServer] Updating startup', id, 'with:', body)
							
							// Get the current data from CSV or persistence
							const startups = await loadStartups()
							const current = startups.find(s => s.id === id)
							
							if (!current) {
								return json({ success: false, message: 'Startup not found' }, 404)
							}
							
							// Create a complete copy of the startup with updates applied
							const updated = { ...current }
							
							// Apply all updates from the body (except id)
							Object.keys(body).forEach(key => {
								if (key !== 'id') {
									updated[key] = body[key]
								}
							})
							
							// Save the complete updated startup to persistence
							mockPersistence.saveStartup(id, updated)
							
							console.log('[MockServer] Saved startup', id, 'to persistence')
							
							return json({ success: true, message: 'Startup updated', data: updated })
						} catch (e: any) {
							console.error('[MockServer] Update error:', e)
							return json({ success: false, message: e?.message || 'Update failed' }, 500)
						}
					}
					
					// Handle GET
					const data = await loadStartups()
					const u = new URL(url, location.origin)
					const house = u.searchParams.get('house')?.toLowerCase()
					let filtered = data
					if (house && house !== 'all') filtered = filtered.filter((s) => s.house === house)
					const sort = u.searchParams.get('sort')
					if (sort === 'progress') filtered = filtered.sort((a, b) => b.progress - a.progress)
					return json(await delay(filtered))
				}

				if (url.startsWith('/api/circles/members')) {
					const startups = await loadStartups()
					const members = startups.slice(0, 12).map((s, i) => ({ id: `m_${i}`, name: s.founder || s.name, startup: s.name, website: s.website, telegram: (s as any).founder_telegram || undefined, house: s.house || 'venture' }))
					return json(await delay(members))
				}

				if (url.startsWith('/api/circles')) {
					const startups = await loadStartups()
					const byCircle: Record<string, any[]> = {}
					const circleInfo: Record<string, { name: string; description: string }> = {}
					
					for (const s of startups) {
						const circleId = s.circle || '1'
						if (!byCircle[circleId]) {
							byCircle[circleId] = []
							circleInfo[circleId] = {
								name: s.circle_name || `Circle ${circleId}`,
								description: s.circle_description || 'A supportive peer group for collaborative learning and accountability.'
							}
						}
						byCircle[circleId].push({ 
							id: `m_${s.id}`, 
							name: s.founder || s.name, 
							startup: s.name, 
							website: s.website, 
							telegram: (s as any).founder_telegram || undefined,
							bio: s.founderBio || s.bio,
							house: s.house || 'venture',
							wave: s.wave || 'wave1'
						})
					}
					
					const circles = Object.keys(byCircle).sort().map(key => ({
						id: `circle_${key}`,
						name: circleInfo[key].name,
						description: circleInfo[key].description,
						members: byCircle[key],
						insights: [
							`${byCircle[key].length} founders`,
							circleInfo[key].description.substring(0, 100) + '...'
						]
					}))
					return json(await delay(circles))
				}

				if (url.startsWith('/api/tasks/') && init?.method !== 'GET') {
					return json(await delay({ ok: true }))
				}

				if (url.startsWith('/api/tasks')) {
					const list = [
						{ id: 't1', house: 'adventure', label: 'Build MVP Feature', points: 20, frequency: 'daily', completed: false },
						{ id: 't2', house: 'adventure', label: 'Talk to 3 Users', points: 30, frequency: 'daily', completed: false },
						{ id: 't3', house: 'adventure', label: 'Ship Code Update', points: 10, frequency: 'weekly', completed: true },
					]
					return json(await delay(list))
				}

				if (url.startsWith('/api/startups/update') && init?.method !== 'GET') {
					try {
						const body = init?.body ? JSON.parse(init.body as string) : {}
						const id = String(body.id || '')
						const updates = (body.updates && typeof body.updates === 'object') ? body.updates : {}
						if (!id) return json({ ok: false, message: 'Missing id' }, 400)

						// persist overrides for immediate UX
						const next = { ...getOverrides(), [id]: { ...(getOverrides()[id] || {}), ...updates } }
						saveOverrides(next)

						// rebuild CSV with updates applied to the matching row by npid
						const text = await loadCsvText()
						const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
						const rows = (parsed.data as any[]).filter(Boolean)
						const headers = parsed.meta.fields || Object.keys(rows[0] || {})
						const idx = rows.findIndex((r) => String(r.npid || r.id) === id)
						if (idx >= 0) {
							const allowed: Record<string, any> = {}
							for (const [k, v] of Object.entries(updates)) {
								if (headers.includes(k)) allowed[k] = v
							}
							rows[idx] = { ...rows[idx], ...allowed }
						}
						const csvOut = Papa.unparse(rows, { columns: headers })

						// return updated startup snapshot
						const startups = await loadStartups()
						const updated = startups.find((s) => String(s.id) === id)
						return json({ ok: true, updated, csv: csvOut })
					} catch (e: any) {
						return json({ ok: false, message: e?.message || 'Update failed' }, 500)
					}
				}
			} catch (e) {
				return json({ message: 'Mock error' }, 500)
			}
		}
		return originalFetch(input as any, init)
	}
	
	// Set a flag to confirm mock API is installed
	;(window as any).__mockApiInstalled = true
	console.log('Mock API installed successfully!')
}

function json(data: any, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	})
}

function computeLoginCode(id: string): string {
	try {
		return btoa(`login:${id}`)
	} catch {
		return `login:${id}`
	}
}


