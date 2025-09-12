export interface ApiUsageRecord {
  timestamp: string
  endpoint: string
  method: string
  userId: string
  responseTime?: number
  status?: number
}

class ApiUsageTracker {
  private static instance: ApiUsageTracker
  private records: ApiUsageRecord[] = []
  private readonly MAX_RECORDS = 10000
  private readonly STORAGE_KEY = 'ncacc_api_usage'

  private constructor() {
    this.loadFromStorage()
  }

  static getInstance(): ApiUsageTracker {
    if (!this.instance) {
      this.instance = new ApiUsageTracker()
    }
    return this.instance
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        this.records = JSON.parse(stored)
      }
    } catch (e) {
      console.error('[ApiUsageTracker] Failed to load usage data:', e)
      this.records = []
    }
  }

  private saveToStorage() {
    try {
      // Keep only recent records
      if (this.records.length > this.MAX_RECORDS) {
        this.records = this.records.slice(-this.MAX_RECORDS)
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.records))
    } catch (e) {
      console.error('[ApiUsageTracker] Failed to save usage data:', e)
    }
  }

  track(
    endpoint: string,
    method: string,
    userId: string,
    responseTime?: number,
    status?: number
  ) {
    const record: ApiUsageRecord = {
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      userId: this.hashUserId(userId), // Hash the user ID for privacy
      responseTime,
      status
    }

    this.records.push(record)
    this.saveToStorage()
  }

  private hashUserId(userId: string): string {
    // Simple hash to mask the actual API key but keep it consistent
    if (!userId) return 'anonymous'
    
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    
    // Return a masked version that's consistent but doesn't reveal the key
    return `user_${Math.abs(hash).toString(36)}_${userId.slice(0, 4)}`
  }

  getRecords(since?: Date): ApiUsageRecord[] {
    if (!since) return [...this.records]
    
    return this.records.filter(r => 
      new Date(r.timestamp) > since
    )
  }

  clearOldRecords(daysToKeep: number = 30) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - daysToKeep)
    
    this.records = this.records.filter(r => 
      new Date(r.timestamp) > cutoff
    )
    
    this.saveToStorage()
  }
}

export default ApiUsageTracker.getInstance()