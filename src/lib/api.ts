import { getAuthToken } from './authToken'

type GetOptions = { params?: Record<string, any> }

async function handleResponse<T>(res: Response): Promise<T> {
	if (res.status === 401) {
		window.location.href = '/login'
		throw new Error('Unauthorized')
	}
	if (!res.ok) {
		const text = await res.text().catch(() => '')
		throw new Error(text || `HTTP ${res.status}`)
	}
	return (await res.json()) as T
}

export const api = {
	async get<T = any>(url: string, options?: GetOptions): Promise<T> {
		let finalUrl = url
		if (options?.params) {
			const usp = new URLSearchParams()
			for (const [k, v] of Object.entries(options.params)) usp.set(k, String(v))
			finalUrl += (url.includes('?') ? '&' : '?') + usp.toString()
		}
		const headers: Record<string, string> = {}
		const token = getAuthToken()
		if (token) headers['Authorization'] = `Bearer ${token}`
		const res = await fetch(finalUrl, { headers })
		return handleResponse<T>(res)
	},
	async post<T = any>(url: string, body?: any): Promise<T> {
		const headers: Record<string, string> = { 'Content-Type': 'application/json' }
		const token = getAuthToken()
		if (token) headers['Authorization'] = `Bearer ${token}`
		const res = await fetch(url, { method: 'POST', headers, body: body ? JSON.stringify(body) : undefined })
		return handleResponse<T>(res)
	},
}


