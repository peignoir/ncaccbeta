import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import unifiedApi from '../lib/unifiedApi'
import ApiConfigManager from '../lib/apiConfig'

type User = {
	id: string
	name: string
	email: string
	startup?: any
	house?: string
}

type AuthContextType = {
	isAuthenticated: boolean
	user: User | null
	token: string | null
	login: (code: string, remember: boolean) => Promise<void>
	logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'ncacc_token'
const USER_KEY = 'ncacc_user'
const EXP_KEY = 'ncacc_token_exp'

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
	const [user, setUser] = useState<User | null>(() => {
		const raw = localStorage.getItem(USER_KEY)
		return raw ? JSON.parse(raw) : null
	})

	useEffect(() => {
		if (token) localStorage.setItem(TOKEN_KEY, token)
		else localStorage.removeItem(TOKEN_KEY)
	}, [token])

	useEffect(() => {
		if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
		else localStorage.removeItem(USER_KEY)
	}, [user])

	const login = async (code: string, remember: boolean) => {
		console.log('[Auth] Login attempt with API mode:', ApiConfigManager.getMode())
		
		const response = await unifiedApi.login(code)
		console.log('[Auth] Login response:', response)
		
		if (response.success && response.data) {
			setToken(response.data.token)
			setUser({
				id: String(response.data.npid),
				name: response.data.username,
				email: `${response.data.username}@ncacc.ai`,
				startup: { npid: response.data.npid }
			})
			if (remember) localStorage.setItem('ncacc_remember', '1')
			// simulate token expiry in 15 minutes
			const exp = Date.now() + 15 * 60 * 1000
			localStorage.setItem(EXP_KEY, String(exp))
			console.log('[Auth] Login successful for user:', response.data.username)
		} else {
			console.error('[Auth] Login failed:', response.error)
			throw new Error(response.error || 'Invalid code')
		}
	}

	const logout = () => {
		setToken(null)
		setUser(null)
		localStorage.clear()
	}

	// auto-refresh mock
	useEffect(() => {
		if (!token) return
		const id = setInterval(async () => {
			const exp = Number(localStorage.getItem(EXP_KEY) || 0)
			if (Date.now() > exp - 60 * 1000) {
				try {
					const r = await api.post('/api/auth/refresh')
					setToken(r.token)
					localStorage.setItem(EXP_KEY, String(Date.now() + 15 * 60 * 1000))
				} catch {
					// ignore
				}
			}
		}, 30 * 1000)
		return () => clearInterval(id)
	}, [token])

	const value = useMemo(
		() => ({ isAuthenticated: Boolean(token), user, token, login, logout }),
		[token, user]
	)

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
	const ctx = useContext(AuthContext)
	if (!ctx) throw new Error('useAuth must be used within AuthProvider')
	return ctx
}


