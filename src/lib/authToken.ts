const TOKEN_KEY = 'ncacc_token'

export function getAuthToken(): string | null {
	try {
		return localStorage.getItem(TOKEN_KEY)
	} catch {
		return null
	}
}


