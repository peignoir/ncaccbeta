import { useEffect, useState } from 'react'
import { api } from '../lib/api'

type Task = {
	id: string
	house: string
	label: string
	points: number
	frequency: 'daily' | 'weekly'
	completed: boolean
}

export default function TasksPage() {
	const [tasks, setTasks] = useState<Task[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		let active = true
		setLoading(true)
		api
			.get<Task[]>('/api/tasks')
			.then((res) => {
				if (!active) return
				setTasks(res)
			})
			.catch((e) => setError(e.message || 'Failed to load'))
			.finally(() => active && setLoading(false))
		return () => {
			active = false
		}
	}, [])

	const toggleComplete = async (id: string) => {
		// optimistic update
		setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))
		try {
			await api.post(`/api/tasks/${id}/complete`)
		} catch (e) {
			// revert
			setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))
		}
	}

	if (loading) return <div>Loading…</div>
	if (error) return <div className="text-red-600">{error}</div>

	return (
		<div className="space-y-4">
			{tasks.map((t) => (
				<div key={t.id} className="bg-white p-4 rounded-md shadow-sm flex items-center justify-between">
					<div>
						<div className="font-medium">{t.label}</div>
						<div className="text-xs text-gray-500 capitalize">{t.frequency}</div>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-sm text-gray-600">{t.points} pts</span>
						<label className="inline-flex items-center gap-2 text-sm">
							<input type="checkbox" checked={t.completed} onChange={() => toggleComplete(t.id)} />
							<span>Completed</span>
						</label>
					</div>
				</div>
			))}
		</div>
	)
}


