// Lightweight dev-time API mock leveraging Vite dev server proxy via fetch handlers
// This runs only in development to simulate endpoints using CSV/JSON in public/

import Papa from 'papaparse'

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
	const overrides = getOverrides()
	const withOverrides = rows.map((r: any) => {
		const id = String(r.npid || r.id || '')
		return id && overrides[id] ? { ...r, ...overrides[id] } : r
	})
	return withOverrides.map((r, idx) => mapRowToStartup(r, idx))
}

async function loadCsvText(): Promise<string> {
	// 1) Try fetching sample.csv if served (e.g., placed in public/)
	try {
		const res = await fetch('/sample.csv', { cache: 'no-cache' })
		if (res.ok) {
			const txt = await res.text()
			if (txt && txt.length > 0) return txt
		}
	} catch {}
	// 2) Try importing sample.csv from project root via Vite raw import
	try {
		// @ts-ignore - Vite will inline the raw string during dev
		const mod = await import('/sample.csv?raw')
		if (typeof mod?.default === 'string' && mod.default.length > 0) return mod.default
	} catch {}
	// 3) Fallback to bundled sample in public/data
	const res = await fetch('/data/startups.csv', { cache: 'no-cache' })
	return await res.text()
}

function mapRowToStartup(r: any, idx: number): Startup {
	// sample.csv columns: id, name (founder), house, current_progress (0..1), website, details (pseudo-JSON string)
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

	const stealthFlag = String(r.stealth || '').toLowerCase().trim()
	const stealth = stealthFlag === 'true' || stealthFlag === '1' || stealthFlag === 'yes'
	const id = String(r.npid || r.id || `startup_${idx}`)
	const loginCode = r.login_code || computeLoginCode(id)

	return {
		id,
		name: String(stealth ? 'Stealth Startup' : startupName),
		website: website ? String(website) : undefined,
		location: location ? String(location) : undefined,
		house: normalizedHouse || undefined,
		progress: Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0,
		founder: r.founder_name || r.name,
		detailsObj: details || undefined,
		founderCity,
		founderCountry,
		founderBio,
		founderMotivation,
		stealth,
		loginCode,
		circle: r.circle,
		circle_name: r.circle_name,
		circle_description: r.circle_description,
		wave: r.wave,
		...r,
	}
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
	if (import.meta.env.PROD) return
	const originalFetch = window.fetch

	window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = typeof input === 'string' ? input : input.toString()
		if (url.startsWith('/api/')) {
			try {
				// route handling
				if (url === '/api/auth/verify' && init?.method !== 'GET') {
					const body = init?.body ? JSON.parse(init.body as string) : {}
					const ok = typeof body.code === 'string' && body.code.length > 6
					if (!ok) return json({ success: false }, 200)
					let user = {
						id: 'user_generic',
						name: 'NC/ACC Founder',
						email: 'founder@example.com',
						startup: { id: 'unknown', name: 'Your Startup', website: 'example.com', progress: 35, house: 'venture' },
						house: 'venture',
					} as any

					// Try to match any startup login code: base64("login:" + startup.id)
					try {
						const startups = await loadStartups()
						const matched = startups.find((s) => computeLoginCode(String(s.id)) === body.code || (s as any).login_code === body.code)
						if (matched) {
							user = {
								id: `user_${matched.id}`,
								name: matched.founder || 'NC/ACC Founder',
								email: matched.detailsObj?.email || 'founder@example.com',
								startup: { id: matched.id, name: matched.name, website: matched.website, progress: matched.progress, house: matched.house },
								house: matched.house || 'venture',
							}
							return json(await delay({ success: true, user, token: 'mock-jwt-token' }, 200))
						}
					} catch {}

					// Special code mapping to Franck
					if (body.code === 'dGVzdGtleTEyMw==') {
						try {
							const startups = await loadStartups()
							const me = startups.find((s) => (s.founder || '').toLowerCase().includes('franck')) || startups.find((s) => (s.website || '').includes('nocodebuilder'))
							if (me) {
								user = {
									id: 'user_franck',
									name: 'Franck Nouyrigat',
									email: 'franck@nocodeai.io',
									startup: { id: me.id, name: me.name, website: me.website, progress: me.progress, house: me.house },
									house: me.house || 'venture',
								}
							}
						} catch {}
					}
					return json(await delay({ success: true, user, token: 'mock-jwt-token' }, 300))
				}

				if (url === '/api/auth/refresh') {
					return json(await delay({ token: 'mock-jwt-token' }))
				}

				if (url.startsWith('/api/startups')) {
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


