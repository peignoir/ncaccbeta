import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../lib/api'

type CircleMember = {
	id: string
	name: string
	startup: string
	website?: string
	telegram?: string
	bio?: string
	house?: string
	wave?: string
}

type Circle = {
	id: string
	name: string
	description: string
	members: CircleMember[]
	insights: string[]
}

const houseLabels: Record<string, string> = {
	venture: 'Venture 🚀',
	side: 'Side Hustle 💼',
	lifestyle: 'Lifestyle 💰',
	karma: 'Karma 🧘',
}

export default function CirclesPage() {
	const { user } = useAuth()
	const [circles, setCircles] = useState<Circle[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [selectedMember, setSelectedMember] = useState<CircleMember | null>(null)
	const [isEditing, setIsEditing] = useState(false)
	const [form, setForm] = useState<Record<string, any>>({})

	useEffect(() => {
		let active = true
		setLoading(true)
		api
			.get<Circle[]>('/api/circles')
			.then((res) => {
				if (!active) return
				setCircles(res)
			})
			.catch((e) => setError(e.message || 'Failed to load'))
			.finally(() => active && setLoading(false))
		return () => {
			active = false
		}
	}, [])

	useEffect(() => {
		if (selectedMember) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = 'unset'
		}
		return () => {
			document.body.style.overflow = 'unset'
		}
	}, [selectedMember])

	useEffect(() => {
		if (!selectedMember) return
		setForm({
			bio: selectedMember.bio || '',
			telegram: selectedMember.telegram || '',
		})
		setIsEditing(false)
	}, [selectedMember])

	const isOwnProfile = Boolean(selectedMember && user?.name && user.name === selectedMember.name)

	const onSave = async () => {
		if (!selectedMember || !isOwnProfile) return
		try {
			const { updated } = await api.post('/api/startups/update', { 
				id: user?.startup?.id, 
				updates: form 
			})
			const updatedMember = { ...selectedMember, ...form }
			setSelectedMember(updatedMember)
			setCircles(prev => prev.map(circle => ({
				...circle,
				members: circle.members.map(m => 
					m.id === selectedMember.id ? updatedMember : m
				)
			})))
			setIsEditing(false)
		} catch (e: any) {
			alert(e?.message || 'Failed to save')
		}
	}

	if (loading) return <div className="p-6 text-gray-500">Loading circles...</div>
	if (error) return <div className="p-6 text-red-600">{error}</div>

	return (
		<div className="space-y-6">
			<section className="bg-white rounded-md shadow-sm p-6">
				<h1 className="text-2xl font-semibold mb-2">Peer Circles</h1>
				<p className="text-gray-600">Connect with founders in your circle for peer-to-peer mentoring and accountability.</p>
			</section>

			{circles.map((circle) => (
				<section key={circle.id} className="bg-white rounded-md shadow-sm">
					<div className="px-6 py-4 border-b">
						<h2 className="font-medium text-lg">{circle.name}</h2>
						<p className="text-sm text-gray-600 mt-1">{circle.description}</p>
					</div>
					<div className="p-6">
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{circle.members.map((member) => (
								<div
									key={member.id}
									className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
									onClick={() => setSelectedMember(member)}
								>
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<div className="font-medium">{member.name}</div>
											<div className="text-sm text-gray-600">{member.startup}</div>
											{member.house && (
												<span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full border">
													{houseLabels[member.house] || member.house}
												</span>
											)}
											{member.wave && (
												<span className="inline-block mt-1 ml-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
													{member.wave === 'wave1' ? 'Wave 1' : member.wave}
												</span>
											)}
										</div>
										{member.website && (
											<a
												href={member.website.startsWith('http') ? member.website : `https://${member.website}`}
												target="_blank"
												rel="noreferrer"
												className="text-sm text-primary hover:underline"
												onClick={(e) => e.stopPropagation()}
											>
												🔗
											</a>
										)}
									</div>
									{member.bio && (
										<p className="text-sm text-gray-600 mt-2 line-clamp-2">{member.bio}</p>
									)}
								</div>
							))}
						</div>
					</div>
				</section>
			))}

			{selectedMember && (
				<div className="fixed inset-0 z-20 overflow-y-auto">
					<div className="fixed inset-0 bg-black/30" onClick={() => setSelectedMember(null)} />
					<div className="relative min-h-screen flex items-start justify-center py-10">
						<div className="relative w-[92vw] max-w-2xl bg-white rounded-lg shadow-xl p-6 my-auto">
							<div className="flex items-start justify-between gap-3 mb-4">
								<div>
									<div className="text-xl font-semibold">{selectedMember.name}</div>
									<div className="text-sm text-gray-600">{selectedMember.startup}</div>
									<div className="flex items-center gap-2 mt-2">
										{selectedMember.house && (
											<span className="px-2 py-0.5 text-xs rounded-full border">
												{houseLabels[selectedMember.house] || selectedMember.house}
											</span>
										)}
										{selectedMember.wave && (
											<span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
												{selectedMember.wave === 'wave1' ? 'Wave 1' : selectedMember.wave}
											</span>
										)}
									</div>
								</div>
								<button
									onClick={() => setSelectedMember(null)}
									className="text-sm px-2 py-1 rounded-md border"
								>
									Close
								</button>
							</div>

							<div className="space-y-4">
								{selectedMember.bio && (
									<div>
										<div className="text-sm font-medium text-gray-700 mb-1">Bio</div>
										<p className="text-gray-800 whitespace-pre-wrap">{selectedMember.bio}</p>
									</div>
								)}

								{selectedMember.website && (
									<div>
										<div className="text-sm font-medium text-gray-700 mb-1">Website</div>
										<a
											href={selectedMember.website.startsWith('http') ? selectedMember.website : `https://${selectedMember.website}`}
											target="_blank"
											rel="noreferrer"
											className="text-primary hover:underline"
										>
											{selectedMember.website}
										</a>
									</div>
								)}

								{selectedMember.telegram && (
									<div>
										<div className="text-sm font-medium text-gray-700 mb-1">Telegram</div>
										<a
											href={selectedMember.telegram.startsWith('http') ? selectedMember.telegram : `https://t.me/${selectedMember.telegram.replace('@', '')}`}
											target="_blank"
											rel="noreferrer"
											className="text-primary hover:underline"
										>
											{selectedMember.telegram}
										</a>
									</div>
								)}

								{isOwnProfile && (
									<div className="mt-6 border-t pt-4">
										<div className="flex items-center justify-between mb-3">
											<div className="font-medium">Edit your profile</div>
											<div className="flex gap-2">
												<button
													className="px-2 py-1 border rounded-md text-sm"
													onClick={() => setIsEditing((v) => !v)}
												>
													{isEditing ? 'Cancel' : 'Edit'}
												</button>
												{isEditing && (
													<button
														className="px-3 py-1 bg-primary text-white rounded-md text-sm"
														onClick={onSave}
													>
														Save
													</button>
												)}
											</div>
										</div>
										{isEditing && (
											<div className="space-y-3">
												<label className="block text-sm">
													<div className="text-gray-600 mb-1">Bio</div>
													<textarea
														className="w-full border rounded-md px-2 py-1 min-h-[100px]"
														value={form.bio ?? ''}
														onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
														placeholder="Tell your circle about yourself, your background, and what you're building..."
													/>
												</label>
												<label className="block text-sm">
													<div className="text-gray-600 mb-1">Telegram</div>
													<input
														type="text"
														className="w-full border rounded-md px-2 py-1"
														value={form.telegram ?? ''}
														onChange={(e) => setForm((f) => ({ ...f, telegram: e.target.value }))}
														placeholder="@username or https://t.me/username"
													/>
												</label>
											</div>
										)}
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}