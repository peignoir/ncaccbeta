import { useState, useEffect } from 'react'

type MemberProfile = {
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

type CircleMemberModalProps = {
	member: MemberProfile | null
	onClose: () => void
	isOpen: boolean
}

export default function CircleMemberModal({ member, onClose, isOpen }: CircleMemberModalProps) {
	if (!isOpen || !member) return null

	const canShowContact = member.contact_me !== false

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
			<div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl">
				<div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
					<h2 className="text-2xl font-bold text-gray-900">{member.name}</h2>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
					>
						×
					</button>
				</div>

				<div className="p-6 space-y-6">
					{/* Basic Info */}
					<div>
						<h3 className="text-lg font-semibold text-gray-900 mb-3">Startup</h3>
						<div className="bg-gray-50 rounded-lg p-4">
							<p className="font-medium text-gray-900">{member.startup}</p>
							{member.website && (
								<a
									href={member.website.startsWith('http') ? member.website : `https://${member.website}`}
									target="_blank"
									rel="noopener noreferrer"
									className="text-indigo-600 hover:text-indigo-800 text-sm mt-1 inline-block"
								>
									{member.website}
								</a>
							)}
							{member.house && (
								<span className="ml-3 px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-full">
									{member.house}
								</span>
							)}
						</div>
					</div>

					{/* Location */}
					{(member.city || member.country) && (
						<div>
							<h3 className="text-lg font-semibold text-gray-900 mb-3">Location</h3>
							<p className="text-gray-700">
								{[member.city, member.country].filter(Boolean).join(', ')}
							</p>
						</div>
					)}

					{/* Bio */}
					{member.bio && (
						<div>
							<h3 className="text-lg font-semibold text-gray-900 mb-3">About</h3>
							<p className="text-gray-700 leading-relaxed">{member.bio}</p>
						</div>
					)}

					{/* Motivation */}
					{member.motivation && (
						<div>
							<h3 className="text-lg font-semibold text-gray-900 mb-3">Motivation</h3>
							<p className="text-gray-700 italic">"{member.motivation}"</p>
						</div>
					)}

					{/* Traction */}
					{member.traction && (
						<div>
							<h3 className="text-lg font-semibold text-gray-900 mb-3">Traction</h3>
							<p className="text-gray-700">{member.traction}</p>
						</div>
					)}

					{/* Contact Information */}
					<div>
						<h3 className="text-lg font-semibold text-gray-900 mb-3">Contact</h3>
						{canShowContact ? (
							<div className="bg-green-50 rounded-lg p-4 space-y-2">
								<p className="text-sm text-green-800 font-medium mb-3">
									✅ Open to connections
								</p>
								{member.email && (
									<div className="flex items-center gap-2">
										<span className="text-gray-600">Email:</span>
										<a href={`mailto:${member.email}`} className="text-indigo-600 hover:text-indigo-800">
											{member.email}
										</a>
									</div>
								)}
								{member.telegram && (
									<div className="flex items-center gap-2">
										<span className="text-gray-600">Telegram:</span>
										<a
											href={`https://t.me/${member.telegram.replace('@', '')}`}
											target="_blank"
											rel="noopener noreferrer"
											className="text-indigo-600 hover:text-indigo-800"
										>
											{member.telegram}
										</a>
									</div>
								)}
								{member.linkedin && (
									<div className="flex items-center gap-2">
										<span className="text-gray-600">LinkedIn:</span>
										<a
											href={member.linkedin}
											target="_blank"
											rel="noopener noreferrer"
											className="text-indigo-600 hover:text-indigo-800"
										>
											View Profile
										</a>
									</div>
								)}
							</div>
						) : (
							<div className="bg-gray-50 rounded-lg p-4">
								<p className="text-gray-600">
									🔒 This founder prefers not to share contact information at this time
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}