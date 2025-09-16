import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import CircleMemberModal from '../components/CircleMemberModal'
import unifiedApi from '../lib/unifiedApi'
import ApiConfigManager from '../lib/apiConfig'

type Member = {
	id: string
	name: string
	startup: string
	website?: string
	telegram?: string
	email?: string
	linkedin?: string
	bio?: string
	house?: string
	city?: string
	country?: string
	traction?: string
	motivation?: string
	contact_me?: boolean
}

type Circle = {
	id: string
	name: string
	description: string
	members: Member[]
	insights?: string[]
}


export default function CirclesPage() {
	const { user } = useAuth()
	const [loading, setLoading] = useState(true)
	const [myCircle, setMyCircle] = useState<Circle | null>(null)
	const [selectedMember, setSelectedMember] = useState<Member | null>(null)
	const [showMemberModal, setShowMemberModal] = useState(false)

	useEffect(() => {
		loadCircles()
	}, [])

	const loadCircles = async () => {
		try {
			console.log('[CirclesPage] Loading circles with API mode:', ApiConfigManager.isMockApiMode() ? "mock" : "real")
			
			const response = await unifiedApi.getCircles()
			console.log('[CirclesPage] Unified API response:', response)
			
			if (!response.success || !response.data) {
				throw new Error(response.error || 'Failed to load circles')
			}
			
			const circles = response.data
			console.log(`[CirclesPage] Loaded ${circles.length} circles`)
			
			// Find user's circle
			const userCircle = circles.find((circle: Circle) => 
				circle.members.some((member: Member) => 
					member.name === user?.name || 
					member.startup === user?.startup?.name
				)
			)
			if (userCircle) {
				console.log('[CirclesPage] Found user circle:', userCircle.id)
				setMyCircle(userCircle)
			}
		} catch (error) {
			console.error('[CirclesPage] Failed to load circles:', error)
		} finally {
			setLoading(false)
		}
	}

	const openMemberProfile = (member: Member) => {
		setSelectedMember(member)
		setShowMemberModal(true)
	}

	const closeMemberModal = () => {
		setShowMemberModal(false)
		setSelectedMember(null)
	}

	if (loading) {
		return (
			<div className="flex justify-center items-center h-64">
				<div className="animate-pulse text-gray-500">Loading circles...</div>
			</div>
		)
	}

	return (
		<div className="max-w-6xl mx-auto p-4 space-y-6">
			{/* Header with Best Practices */}
			<div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
				<h2 className="text-lg font-semibold text-gray-900 mb-3">Circle Best Practices</h2>
				<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
					<div className="flex items-start gap-2">
						<span className="text-base mt-0.5">🎯</span>
						<span className="text-gray-700"><span className="font-medium">Weekly 30min check-ins:</span> Share wins, blockers, and next week's goals</span>
					</div>
					<div className="flex items-start gap-2">
						<span className="text-base mt-0.5">💡</span>
						<span className="text-gray-700"><span className="font-medium">Be specific:</span> 'I need help with pricing' beats 'I need advice'</span>
					</div>
					<div className="flex items-start gap-2">
						<span className="text-base mt-0.5">🤝</span>
						<span className="text-gray-700"><span className="font-medium">Give first:</span> Share resources, intros, or feedback before asking</span>
					</div>
					<div className="flex items-start gap-2">
						<span className="text-base mt-0.5">⏰</span>
						<span className="text-gray-700"><span className="font-medium">Respect time:</span> Come prepared with specific questions</span>
					</div>
					<div className="flex items-start gap-2">
						<span className="text-base mt-0.5">🔒</span>
						<span className="text-gray-700"><span className="font-medium">Keep it confidential:</span> What's shared in circle stays in circle</span>
					</div>
				</div>
			</div>

			{/* My Circle */}
			{myCircle && (
				<div className="bg-white rounded-xl shadow-lg p-6 border-2 border-indigo-500">
					{/* Check if circle has 3 or fewer members */}
					{myCircle.members.length <= 3 ? (
						<div className="text-center py-8">
							<h2 className="text-2xl font-bold text-gray-900 mb-4">Your Circle is Being Formed</h2>
							<div className="max-w-2xl mx-auto space-y-4">
								<p className="text-lg text-gray-700">
									We match circles based on activity, geography, and more.
								</p>
								<p className="text-gray-600">
									Since you're just getting started, your circle isn't ready yet — but keep working and chatting with No Cap, 
									and in a day or two you will be able to access your amazing peer circle.
								</p>
								<p className="text-indigo-600 font-semibold text-lg mt-6">
									#goodluck!
								</p>
							</div>
						</div>
					) : (
						<>
							<div className="flex justify-between items-start mb-4">
								<div className="flex items-center gap-3">
									<span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
										Your Circle
									</span>
									<h2 className="text-lg font-semibold text-gray-900">{myCircle.name}</h2>
								</div>
								<div className="text-right">
									<div className="bg-gray-50 rounded-lg p-3">
										<h4 className="text-sm font-semibold text-gray-700 mb-2">My Contact Info</h4>
										{(() => {
											const currentUserMember = myCircle.members.find(m => 
												m.name === user?.name || 
												m.startup === user?.startup?.name
											)
											if (!currentUserMember) {
												return <p className="text-sm text-gray-500">No contact info available</p>
											}
											return (
												<div className="space-y-1">
													{currentUserMember.email && (
														<div className="text-sm">
															<span className="text-gray-600">Email:</span>{' '}
															<a href={`mailto:${currentUserMember.email}`} className="text-indigo-600 hover:text-indigo-800">
																{currentUserMember.email}
															</a>
														</div>
													)}
													{currentUserMember.telegram && (
														<div className="text-sm">
															<span className="text-gray-600">Telegram:</span>{' '}
															<span className="text-indigo-600">@{currentUserMember.telegram}</span>
														</div>
													)}
													{!currentUserMember.email && !currentUserMember.telegram && (
														<p className="text-sm text-gray-500">No contact info available</p>
													)}
												</div>
											)
										})()}
									</div>
								</div>
							</div>

							{/* Motivational message */}
							<div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 mb-4 border border-indigo-200">
								<p className="text-sm text-indigo-900 font-medium text-center">
									One job: lift one another. Start with a kickoff call, agree on your rhythm and goals, and may the strongest circles rise!
								</p>
							</div>
							
							{/* Members Grid */}
							<h3 className="font-medium text-gray-900 mb-3 text-sm">Circle Members ({myCircle.members.length})</h3>
							<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
								{myCircle.members.map((member, index) => {
									// Create a subtle color palette based on index
									const colorSchemes = [
										{ bg: 'from-blue-50 to-indigo-50', border: 'border-blue-200', hover: 'hover:from-blue-100 hover:to-indigo-100', accent: 'text-blue-600 hover:text-blue-800' },
										{ bg: 'from-purple-50 to-pink-50', border: 'border-purple-200', hover: 'hover:from-purple-100 hover:to-pink-100', accent: 'text-purple-600 hover:text-purple-800' },
										{ bg: 'from-green-50 to-emerald-50', border: 'border-green-200', hover: 'hover:from-green-100 hover:to-emerald-100', accent: 'text-green-600 hover:text-green-800' },
										{ bg: 'from-amber-50 to-orange-50', border: 'border-amber-200', hover: 'hover:from-amber-100 hover:to-orange-100', accent: 'text-amber-600 hover:text-amber-800' },
										{ bg: 'from-cyan-50 to-teal-50', border: 'border-cyan-200', hover: 'hover:from-cyan-100 hover:to-teal-100', accent: 'text-cyan-600 hover:text-cyan-800' },
										{ bg: 'from-rose-50 to-pink-50', border: 'border-rose-200', hover: 'hover:from-rose-100 hover:to-pink-100', accent: 'text-rose-600 hover:text-rose-800' },
									];
									const colorScheme = colorSchemes[index % colorSchemes.length];

									return (
										<div
											key={member.id}
											className={`bg-gradient-to-br ${colorScheme.bg} rounded-lg p-3 ${colorScheme.hover} transition-all duration-200 cursor-pointer border ${colorScheme.border} shadow-sm hover:shadow-md`}
											onClick={() => openMemberProfile(member)}
										>
											<div className="flex justify-between items-center">
												<div className="min-w-0">
													<p className="font-medium text-gray-900 text-sm truncate">{member.name}</p>
													<p className="text-xs text-gray-600 truncate">{member.startup}</p>
													{member.house && (
														<span className="inline-block mt-0.5 px-1.5 py-0.5 bg-white/70 text-xs text-gray-600 rounded">
															{member.house}
														</span>
													)}
												</div>
												<span className={`${colorScheme.accent} text-xs font-medium whitespace-nowrap ml-2`}>
													View →
												</span>
											</div>
										</div>
									);
								})}
							</div>
						</>
					)}
				</div>
			)}


			{/* Member Profile Modal */}
			<CircleMemberModal
				member={selectedMember}
				isOpen={showMemberModal}
				onClose={closeMemberModal}
			/>
		</div>
	)
}