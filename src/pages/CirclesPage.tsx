import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import api from '../lib/api'

type Member = {
	id: string
	name: string
	startup: string
	website?: string
	telegram?: string
	bio?: string
	house?: string
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
	const [circles, setCircles] = useState<Circle[]>([])
	const [loading, setLoading] = useState(true)
	const [myCircle, setMyCircle] = useState<Circle | null>(null)

	useEffect(() => {
		loadCircles()
	}, [])

	const loadCircles = async () => {
		try {
			const data = await api.get('/api/circles')
			setCircles(data)
			
			// Find user's circle
			const userCircle = data.find((circle: Circle) => 
				circle.members.some((member: Member) => 
					member.name === user?.name || 
					member.startup === user?.startup?.name
				)
			)
			if (userCircle) {
				setMyCircle(userCircle)
			}
		} catch (error) {
			console.error('Failed to load circles:', error)
		} finally {
			setLoading(false)
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-gray-500">Loading circles...</div>
			</div>
		)
	}

	const otherCircles = circles.filter(c => c.id !== myCircle?.id)

	return (
		<div className="space-y-8">
			{/* My Circle Section */}
			{myCircle && (
				<div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-2xl p-8 shadow-lg">
					<div className="mb-6">
						<h2 className="text-3xl font-bold text-gray-900 mb-2">Your Circle</h2>
						<p className="text-lg text-purple-700 font-medium">
							🤝 Help each other succeed - Your wins are their wins!
						</p>
					</div>
					
					<div className="bg-white rounded-xl p-6 shadow-sm">
						<div className="mb-6">
							<h3 className="text-2xl font-semibold text-gray-900 mb-2">{myCircle.name}</h3>
							<p className="text-gray-600">{myCircle.description}</p>
							<div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
								<p className="text-indigo-900 font-medium">
									💡 Remember: Share your challenges openly, celebrate wins together, and offer help whenever you can. 
									Your circle is your support system!
								</p>
							</div>
						</div>

						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
							{myCircle.members.map((member) => {
								const isMe = member.name === user?.name || member.startup === user?.startup?.name
								
								return (
									<div
										key={member.id}
										className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
											isMe 
												? 'border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50' 
												: 'border-gray-200 bg-white hover:border-purple-200'
										}`}
									>
										<div className="space-y-2">
											<div className="flex items-start justify-between">
												<div className="flex-1">
													<h4 className="font-semibold text-gray-900">
														{member.name}
														{isMe && <span className="ml-2 text-purple-600">(You)</span>}
													</h4>
													<p className="text-sm text-gray-600">{member.startup}</p>
												</div>
												{member.house && (
													<span className={`text-xs px-2 py-1 rounded-full ${
														member.house === 'venture' ? 'bg-purple-100 text-purple-700' :
														member.house === 'lifestyle' ? 'bg-green-100 text-green-700' :
														member.house === 'side' ? 'bg-blue-100 text-blue-700' :
														'bg-orange-100 text-orange-700'
													}`}>
														{member.house}
													</span>
												)}
											</div>
											
											{member.bio && (
												<p className="text-xs text-gray-500 line-clamp-2">{member.bio}</p>
											)}
											
											<div className="flex gap-3 pt-2">
												{member.website && (
													<a
														href={`https://${member.website}`}
														target="_blank"
														rel="noopener noreferrer"
														className="text-xs text-indigo-600 hover:text-indigo-800"
													>
														Website →
													</a>
												)}
												{member.telegram && (
													<a
														href={`https://t.me/${member.telegram.replace('@', '')}`}
														target="_blank"
														rel="noopener noreferrer"
														className="text-xs text-blue-600 hover:text-blue-800"
													>
														Telegram →
													</a>
												)}
											</div>
										</div>
									</div>
								)
							})}
						</div>

						<div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
							<p className="text-yellow-900 text-sm font-medium">
								🎯 Weekly Challenge: Reach out to at least 2 circle members this week. 
								Share what you're working on and ask how you can help them!
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Other Circles Section */}
			{otherCircles.length > 0 && (
				<div className="bg-white rounded-2xl p-8 shadow-lg">
					<h2 className="text-2xl font-bold text-gray-900 mb-6">Other Circles</h2>
					
					<div className="grid gap-6 md:grid-cols-2">
						{otherCircles.map((circle) => (
							<div
								key={circle.id}
								className="p-6 rounded-xl border border-gray-200 hover:border-gray-300 transition-all hover:shadow-md"
							>
								<h3 className="text-xl font-semibold text-gray-900 mb-2">{circle.name}</h3>
								<p className="text-gray-600 mb-4">{circle.description}</p>
								
								<div className="space-y-3">
									<div className="flex items-center justify-between text-sm">
										<span className="text-gray-500">Members</span>
										<span className="font-semibold">{circle.members.length} founders</span>
									</div>
									
									{circle.insights && circle.insights.length > 0 && (
										<div className="pt-3 border-t">
											<p className="text-xs text-gray-500 mb-2">Circle Focus:</p>
											{circle.insights.map((insight, idx) => (
												<p key={idx} className="text-sm text-gray-700">• {insight}</p>
											))}
										</div>
									)}
									
									<div className="pt-3">
										<div className="flex flex-wrap gap-2">
											{circle.members.slice(0, 5).map((member, idx) => (
												<span
													key={idx}
													className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full"
												>
													{member.name.split(' ')[0]}
												</span>
											))}
											{circle.members.length > 5 && (
												<span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-full">
													+{circle.members.length - 5} more
												</span>
											)}
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Empty State */}
			{!myCircle && circles.length === 0 && (
				<div className="bg-white rounded-2xl p-12 shadow-lg text-center">
					<p className="text-gray-500 text-lg">No circles available yet.</p>
					<p className="text-gray-400 mt-2">Check back soon!</p>
				</div>
			)}
		</div>
	)
}