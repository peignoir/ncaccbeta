import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../lib/api'

type Startup = {
	id: string
	name: string
	website?: string
	location?: string
	house?: string
	progress: number
	founder?: string
	detailsObj?: Record<string, any>
	founderCity?: string
	founderCountry?: string
	founderBio?: string
	founderMotivation?: string
	circle?: string
	circle_name?: string
	circle_description?: string
	wave?: string
	[tag: string]: any
}

const houseLabels: Record<string, string> = {
	all: 'All',
	venture: 'Venture 🚀',
	side: 'Side Hustle 💼',
	lifestyle: 'Lifestyle 💰',
	karma: 'Karma 🧘',
}

function ProgressBar({ value }: { value: number }) {
	return (
		<div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
			<div className="h-full bg-gradient-to-r from-primary to-blue-400" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
		</div>
	)
}

function houseEmoji(h?: string) {
	switch (h) {
		case 'venture':
			return '🚀'
		case 'side':
			return '💼'
		case 'lifestyle':
			return '💰'
		case 'karma':
			return '🧘'
		default:
			return '🏁'
	}
}

export default function ProgressPage() {
	const { user } = useAuth()
	const [startups, setStartups] = useState<Startup[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [house, setHouse] = useState<string>('all')
	const [selected, setSelected] = useState<Startup | null>(null)
	const [isEditing, setIsEditing] = useState(false)
	const [form, setForm] = useState<Record<string, any>>({})
	const isOwnStartup = Boolean(selected && user?.startup?.id && String(user.startup.id) === String(selected.id))

	useEffect(() => {
		let active = true
		setLoading(true)
		api
			.get<Startup[]>('/api/startups', { params: { sort: 'progress' } })
			.then((res) => {
				if (!active) return
				setStartups(res)
			})
			.catch((e) => setError(e.message || 'Failed to load'))
			.finally(() => active && setLoading(false))
		return () => {
			active = false
		}
	}, [])

	useEffect(() => {
		if (selected) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = 'unset'
		}
		return () => {
			document.body.style.overflow = 'unset'
		}
	}, [selected])

	useEffect(() => {
		if (!selected) return
		setForm({
			startup_name: selected.startup_name || selected.name,
			website: selected.website || '',
			founder_name: selected.founder || selected.founder_name || '',
			founder_email: selected.founder_email || '',
			founder_telegram: selected.founder_telegram || '',
			founder_linkedin_url: selected.founder_linkedin_url || '',
			one_pager_url: selected.one_pager_url || '',
			demo_video_url: selected.demo_video_url || '',
			github_repos: selected.github_repos || '',
			bio: selected.bio || selected.founderBio || '',
			motivation: selected.motivation || selected.founderMotivation || '',
			long_pitch: selected.long_pitch || selected.detailsObj?.pitch || '',
			traction: selected.traction || selected.detailsObj?.traction || '',
			founder_city: selected.founder_city || selected.founderCity || '',
			founder_country: selected.founder_country || selected.founderCountry || '',
		})
		setIsEditing(false)
	}, [selected])

	const filtered = useMemo(() => {
		const list = house === 'all' ? startups : startups.filter((s) => s.house === house)
		return [...list].sort((a, b) => b.progress - a.progress)
	}, [startups, house])

	const counts = useMemo(() => {
		const map: Record<string, number> = { all: startups.length, venture: 0, side: 0, lifestyle: 0, karma: 0 }
		for (const s of startups) {
			if (s.house && map[s.house] !== undefined) map[s.house] += 1
		}
		return map
	}, [startups])

	const onSave = async () => {
		if (!selected) return
		try {
			const { updated } = await api.post('/api/startups/update', { id: selected.id, updates: form })
			setStartups((prev) => prev.map((s) => (String(s.id) === String(updated.id) ? { ...s, ...updated } : s)))
			setSelected((prev) => (prev ? { ...prev, ...updated } : prev))
			setIsEditing(false)
		} catch (e: any) {
			alert(e?.message || 'Failed to save')
		}
	}

	const openOwnModal = () => {
		if (!user?.startup?.id) return
		const me = startups.find((s) => String(s.id) === String(user.startup.id))
		if (me) setSelected(me)
	}

	return (
		<div className="space-y-6">
			<section className="bg-white rounded-md shadow-sm p-6">
				<div className="flex flex-col gap-2">
					<div className="text-lg text-gray-500">Your Startup Journey</div>
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
						<div>
							<div className="text-2xl font-semibold">{user?.startup?.name || 'Your Startup'}</div>
							<div className="flex items-center gap-2 mt-2">
								{user?.startup?.website && (
									<a href={user.startup.website.startsWith('http') ? user.startup.website : `https://${user.startup.website}`} target="_blank" rel="noreferrer" className="inline-block bg-primary text-white px-3 py-1.5 rounded-md">Visit website</a>
								)}
								<button onClick={openOwnModal} className="px-3 py-1.5 rounded-md border text-sm">Edit your data</button>
							</div>
						</div>
						<div className="w-full md:max-w-md">
							<div className="flex items-center gap-3">
								<div className="flex-1"><ProgressBar value={user?.startup?.progress ?? 0} /></div>
								<div className="text-sm text-gray-700 w-10 text-right">{Math.round(user?.startup?.progress ?? 0)}%</div>
							</div>
							<div className="text-sm text-gray-600 mt-1">{(user?.startup?.progress ?? 0) >= 80 ? '🔥 Almost there!' : 'Keep going — every day counts.'}</div>
						</div>
					</div>
				</div>
			</section>

			<section className="flex flex-wrap gap-2">
				{Object.entries(houseLabels).map(([key, label]) => (
					<button key={key} onClick={() => setHouse(key)} className={`px-3 py-1.5 rounded-full border text-sm ${house === key ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-gray-50'}`}>
						{label} <span className="ml-1 text-gray-500">{counts[key] ?? 0}</span>
					</button>
				))}
			</section>

			<section className="bg-white rounded-md shadow-sm">
				<div className="px-6 py-4 border-b font-medium">Wave 1 Dashboard of Fame</div>
				{loading ? (
					<div className="p-6 text-gray-500">Loading…</div>
				) : error ? (
					<div className="p-6 text-red-600">{error}</div>
				) : (
					<ul className="divide-y">
						{filtered.map((s) => (
							<li key={s.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 cursor-pointer hover:bg-gray-50" onClick={() => setSelected(s)}>
								<div className="flex items-center gap-3">
									<span className="text-2xl">{houseEmoji(s.house)}</span>
									<div>
										<div className="font-medium flex items-center gap-2">
											<span>{s.name}</span>
											{s.house && <span className="px-2 py-0.5 text-xs rounded-full border bg-white text-gray-700">{houseLabels[s.house]}</span>}
										</div>
										<div className="text-sm text-gray-500">{s.location}</div>
									</div>
								</div>
								<div className="flex items-center gap-3">
									{s.website && <a href={s.website.startsWith('http') ? s.website : `https://${s.website}`} target="_blank" rel="noreferrer" className="bg-primary text-white px-3 py-1.5 rounded-md text-sm">Website</a>}
									<div className="w-48"><ProgressBar value={s.progress} /></div>
									<div className="text-sm text-gray-600 w-12 text-right">{s.progress}%</div>
								</div>
							</li>
						))}
					</ul>
				)}
			</section>

			{selected && (
				<div className="fixed inset-0 z-20 overflow-y-auto">
					<div className="fixed inset-0 bg-black/30" onClick={() => setSelected(null)} />
					<div className="relative min-h-screen flex items-start justify-center py-10">
						<div className="relative w-[92vw] max-w-4xl bg-white rounded-lg shadow-xl p-5 my-auto">
						<div className="flex items-start justify-between gap-3">
							<div>
								<div className="text-xl font-semibold">{selected.name}</div>
								<div className="text-sm text-gray-600 mt-0.5">
									{selected.location}
									{selected.house && <span className="ml-2 px-2 py-0.5 text-xs rounded-full border">{houseLabels[selected.house]}</span>}
									{selected.wave && <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">{selected.wave === 'wave1' ? 'Wave 1' : selected.wave}</span>}
									{selected.circle && <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">Circle {selected.circle}</span>}
								</div>
							</div>
							<button onClick={() => setSelected(null)} className="text-sm px-2 py-1 rounded-md border">Close</button>
						</div>

						<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								{selected.founder && <div><span className="text-gray-500 text-sm">Founder:</span> <span className="font-medium">{selected.founder}</span></div>}
								{selected.founder_email && <div><span className="text-gray-500 text-sm">Email:</span> <span>{selected.founder_email}</span></div>}
								{selected.founder_telegram && <div className="text-sm">Telegram: <a href={selected.founder_telegram.startsWith('http') ? selected.founder_telegram : `https://t.me/${selected.founder_telegram.replace('@','')}`} target="_blank" rel="noreferrer" className="text-primary underline">{selected.founder_telegram}</a></div>}
								{selected.founder_linkedin_url && <div className="text-sm">LinkedIn: <a href={selected.founder_linkedin_url} target="_blank" rel="noreferrer" className="text-primary underline">Profile</a></div>}
								{selected.github_repos && <div className="text-sm">GitHub: <a href={selected.github_repos.startsWith('http') ? selected.github_repos : `https://github.com/${selected.github_repos}`} target="_blank" rel="noreferrer" className="text-primary underline">{selected.github_repos}</a></div>}
								{selected.one_pager_url && <div className="text-sm">One Pager: <a href={selected.one_pager_url} target="_blank" rel="noreferrer" className="text-primary underline">View</a></div>}
								{selected.demo_video_url && <div className="text-sm">Demo Video: <a href={selected.demo_video_url} target="_blank" rel="noreferrer" className="text-primary underline">Watch</a></div>}
								{selected.website && <div className="text-sm">Website: <a href={selected.website.startsWith('http') ? selected.website : `https://${selected.website}`} target="_blank" rel="noreferrer" className="text-primary underline">{selected.website}</a></div>}
							</div>
							<div className="space-y-2">
								{(selected.founderCity || selected.founderCountry) && <div><span className="text-gray-500 text-sm">Location:</span> {[selected.founderCity, selected.founderCountry].filter(Boolean).join(', ')}</div>}
								{selected.traction !== undefined && <div><span className="text-gray-500 text-sm">Traction:</span> {selected.traction}</div>}
								{selected.bio && <div><span className="text-gray-500 text-sm">Founder Bio:</span> {selected.bio}</div>}
								{selected.motivation && <div><span className="text-gray-500 text-sm">Motivation:</span> {selected.motivation}</div>}
							</div>

							<div className="md:col-span-2">
								<div className="font-medium mb-1">Long Pitch</div>
								<div className="text-gray-800 whitespace-pre-wrap">{selected.long_pitch || selected.detailsObj?.pitch}</div>
							</div>

							<div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
								<div className="space-y-1">
									<div className="font-medium">Problem / Customer / Why now</div>
									{selected.problem_statement && <div><span className="text-gray-500 text-sm">Problem:</span> {selected.problem_statement}</div>}
									{selected.customer && <div><span className="text-gray-500 text-sm">Customer:</span> {selected.customer}</div>}
									{selected.product_job_to_be_done && <div><span className="text-gray-500 text-sm">JTBD:</span> {selected.product_job_to_be_done}</div>}
									{selected.value_proposition && <div><span className="text-gray-500 text-sm">Value Proposition:</span> {selected.value_proposition}</div>}
									{selected.current_workaround && <div><span className="text-gray-500 text-sm">Current Workaround:</span> {selected.current_workaround}</div>}
									{selected.why_now_catalyst && <div><span className="text-gray-500 text-sm">Why Now:</span> {selected.why_now_catalyst}</div>}
								</div>
								<div className="space-y-1">
									<div className="font-medium">Demand / Usage / Product</div>
									{selected.discovery_interviews_n !== undefined && selected.discovery_interviews_n !== '' && <div><span className="text-gray-500 text-sm">Discovery Interviews:</span> {selected.discovery_interviews_n}</div>}
									{selected.design_partners_count !== undefined && selected.design_partners_count !== '' && <div><span className="text-gray-500 text-sm">Design Partners:</span> {selected.design_partners_count}</div>}
									{selected.lois_total_value_eur !== undefined && selected.lois_total_value_eur !== '' && <div><span className="text-gray-500 text-sm">LOIs Total (EUR):</span> {selected.lois_total_value_eur}</div>}
									{selected.weekly_active_users !== undefined && selected.weekly_active_users !== '' && <div><span className="text-gray-500 text-sm">Weekly Active Users:</span> {selected.weekly_active_users}</div>}
									{selected.activation_rate_pct !== undefined && selected.activation_rate_pct !== '' && <div><span className="text-gray-500 text-sm">Activation Rate (%):</span> {selected.activation_rate_pct}</div>}
								</div>

								<div className="space-y-1">
									<div className="font-medium">GTM & Pricing</div>
									{selected.first_channel && <div><span className="text-gray-500 text-sm">First Channel:</span> {selected.first_channel}</div>}
									{selected.acv_hypothesis_eur !== undefined && selected.acv_hypothesis_eur !== '' && <div><span className="text-gray-500 text-sm">ACV Hypothesis (EUR):</span> {selected.acv_hypothesis_eur}</div>}
								</div>

								<div className="space-y-1">
									<div className="font-medium">Market Size</div>
									{selected.wedge_sam_eur_year1 !== undefined && selected.wedge_sam_eur_year1 !== '' && <div><span className="text-gray-500 text-sm">Wedge SAM Year 1 (EUR):</span> {selected.wedge_sam_eur_year1}</div>}
								</div>

								<div className="space-y-1">
									<div className="font-medium">Competition & Moat</div>
									{selected.alternatives_today && <div><span className="text-gray-500 text-sm">Alternatives Today:</span> {selected.alternatives_today}</div>}
									{selected.key_differentiator && <div><span className="text-gray-500 text-sm">Key Differentiator:</span> {selected.key_differentiator}</div>}
								</div>

								<div className="space-y-1">
									<div className="font-medium">Founder Commitment</div>
									{selected.founder_time_commitment_pct !== undefined && selected.founder_time_commitment_pct !== '' && <div><span className="text-gray-500 text-sm">Time Commitment (%):</span> {selected.founder_time_commitment_pct}</div>}
								</div>
							</div>
						</div>

						{isOwnStartup && (
							<div className="mt-6 border-t pt-4">
								<div className="flex items-center justify-between mb-3">
									<div className="font-medium">Edit your data</div>
									<div className="flex gap-2">
										<button className="px-2 py-1 border rounded-md text-sm" onClick={() => setIsEditing((v) => !v)}>{isEditing ? 'Cancel' : 'Edit'}</button>
										{isEditing && <button className="px-3 py-1 bg-primary text-white rounded-md text-sm" onClick={onSave}>Save</button>}
									</div>
								</div>
								{isEditing && (
									<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
										{[
											['startup_name', 'Startup Name'],
											['website', 'Website'],
											['founder_name', 'Founder Name'],
											['founder_email', 'Founder Email'],
											['founder_telegram', 'Founder Telegram'],
											['founder_linkedin_url', 'Founder LinkedIn URL'],
											['one_pager_url', 'One Pager URL'],
											['demo_video_url', 'Demo Video URL'],
											['github_repos', 'GitHub URL'],
											['founder_city', 'Founder City'],
											['founder_country', 'Founder Country'],
										].map(([key, label]) => (
											<label key={key} className="text-sm">
												<div className="text-gray-600 mb-1">{label}</div>
												<input type="text" className="w-full border rounded-md px-2 py-1" value={form[key] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
											</label>
										))}
										<label className="md:col-span-2 text-sm">
											<div className="text-gray-600 mb-1">Bio</div>
											<textarea className="w-full border rounded-md px-2 py-1 min-h-[80px]" value={form.bio ?? ''} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
										</label>
										<label className="md:col-span-2 text-sm">
											<div className="text-gray-600 mb-1">Motivation</div>
											<textarea className="w-full border rounded-md px-2 py-1 min-h-[60px]" value={form.motivation ?? ''} onChange={(e) => setForm((f) => ({ ...f, motivation: e.target.value }))} />
										</label>
										<label className="md:col-span-2 text-sm">
											<div className="text-gray-600 mb-1">Long Pitch</div>
											<textarea className="w-full border rounded-md px-2 py-1 min-h-[120px]" value={form.long_pitch ?? ''} onChange={(e) => setForm((f) => ({ ...f, long_pitch: e.target.value }))} />
										</label>
										<label className="text-sm">
											<div className="text-gray-600 mb-1">Traction (numeric)</div>
											<input type="number" className="w-full border rounded-md px-2 py-1" value={form.traction ?? ''} onChange={(e) => setForm((f) => ({ ...f, traction: e.target.value }))} />
										</label>
										<label className="text-sm">
											<div className="text-gray-600 mb-1">Product</div>
											<input type="text" className="w-full border rounded-md px-2 py-1" value={form.product ?? ''} onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))} />
										</label>
									</div>
								)}
							</div>
						)}
						</div>
					</div>
				</div>
			)}
		</div>
	)
}


