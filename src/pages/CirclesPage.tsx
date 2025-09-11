import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../lib/api'
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

// Generate a deterministic meeting link based on circle ID
const generateMeetingLink = (circleId: string, type: 'weekly' | 'emergency' = 'weekly') => {
	const baseUrl = 'https://meet.google.com/'
	// Create a simple hash from circle ID for consistent links
	const hash = circleId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
	const meetingCode = type === 'weekly' 
		? `ncacc-${hash}-weekly`
		: `ncacc-${hash}-help`
	return baseUrl + meetingCode
}

const MENTORING_TIPS = [
	"🎯 Weekly 30min check-ins: Share wins, blockers, and next week's goals",
	"💡 Be specific: 'I need help with pricing' beats 'I need advice'", 
	"🤝 Give first: Share resources, intros, or feedback before asking",
	"⏰ Respect time: Come prepared with specific questions",
	"🔒 Keep it confidential: What's shared in circle stays in circle"
]

export default function CirclesPage() {
	const { user } = useAuth()
	const [circles, setCircles] = useState<Circle[]>([])
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
			
			setCircles(response.data)
			console.log(`[CirclesPage] Loaded ${response.data.length} circles`)
			
			// Find user's circle
			const userCircle = response.data.find((circle: Circle) => 
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
		<div className="max-w-6xl mx-auto p-4 space-y-8">
			{/* Header */}
			<div className="text-center">
				<h1 className="text-4xl font-bold text-gray-900 mb-4">Peer Mentoring Circles</h1>
				<p className="text-gray-600 max-w-3xl mx-auto">
					Small groups of 4-7 founders in similar timezones. Meet weekly, share openly, help each other win.
				</p>
				<p className="text-lg mt-4 font-semibold text-indigo-700 max-w-3xl mx-auto">
					One job: lift one another. Start with a kickoff call, agree on your rhythm and goals, and may the strongest circles rise!
				</p>
			</div>

			{/* Mentoring Best Practices */}
			<div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
				<h2 className="text-lg font-semibold text-indigo-900 mb-3">Circle Best Practices</h2>
				<div className="grid md:grid-cols-2 gap-3">
					{MENTORING_TIPS.map((tip, idx) => (
						<div key={idx} className="text-sm text-indigo-800">
							{tip}
						</div>
					))}
				</div>
			</div>

			{/* My Circle */}
			{myCircle && (
				<div className="bg-white rounded-xl shadow-lg p-6 border-2 border-indigo-500">
					{/* Check if circle has 0 or 1 members */}
					{myCircle.members.length <= 1 ? (
						<div className="text-center py-8">
							<h2 className="text-2xl font-bold text-gray-900 mb-4">Your Circle is Being Formed</h2>
							<div className="max-w-2xl mx-auto space-y-4">
								<p className="text-lg text-gray-700">
									We match circles based on activity, geography, and more.
								</p>
								<p className="text-gray-600">
									Since you're just getting started, your circle isn't ready yet — but keep working and chatting with No Cap, 
									and in a day or two you'll see your amazing peer circle take shape.
								</p>
								<p className="text-indigo-600 font-semibold text-lg mt-6">
									#goodluck!
								</p>
							</div>
						</div>
					) : (
						<>
							<div className="flex justify-between items-start mb-6">
								<div>
									<h2 className="text-2xl font-bold text-gray-900">{myCircle.name}</h2>
									<span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mt-2">
										Your Circle
									</span>
								</div>
								<div className="text-right">
									<div className="bg-gray-50 rounded-lg p-3">
										<h4 className="text-sm font-semibold text-gray-700 mb-2">Contact Info</h4>
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
							
							<p className="text-gray-600 mb-6">{myCircle.description}</p>
							
							{/* Meeting Schedule */}
							<div className="bg-indigo-50 rounded-lg p-4 mb-6">
								<h3 className="font-semibold text-indigo-900 mb-2">Suggested Schedule</h3>
								<div className="space-y-2 text-sm text-indigo-800">
									<div>📅 <strong>Weekly Standup:</strong> Mondays 10am (your timezone)</div>
									<div>🎯 <strong>Format:</strong> 5min each - Last week wins, this week goals, blockers</div>
									<div>🆘 <strong>Emergency Room:</strong> Always open for urgent help</div>
								</div>
							</div>
							
							{/* Members Grid */}
							<h3 className="font-semibold text-gray-900 mb-4">Members ({myCircle.members.length})</h3>
							<div className="grid md:grid-cols-2 gap-4">
								{myCircle.members.map((member) => (
									<div 
										key={member.id} 
										className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition cursor-pointer"
										onClick={() => openMemberProfile(member)}
									>
										<div className="flex justify-between items-start">
											<div>
												<p className="font-semibold text-gray-900">{member.name}</p>
												<p className="text-sm text-gray-600">{member.startup}</p>
												{member.house && (
													<span className="inline-block mt-1 px-2 py-1 bg-white text-xs text-gray-600 rounded">
														{member.house}
													</span>
												)}
											</div>
											<button className="text-indigo-600 hover:text-indigo-800 text-sm">
												View Profile →
											</button>
										</div>
									</div>
								))}
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