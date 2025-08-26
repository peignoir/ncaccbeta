// A more robust persistence layer for the mock API
// Instead of partial overrides, we maintain complete startup records

const STORAGE_KEY = 'mockapi_startups_v2'
const DEBUG = true // Enable debug logging

export interface StoredStartup {
  id: string
  data: Record<string, any>
  lastModified: number
}

class MockPersistence {
  private cache: Map<string, StoredStartup> = new Map()
  private initialized = false

  private log(...args: any[]) {
    if (DEBUG) {
      console.log('[MockPersistence]', ...args)
    }
  }

  init() {
    if (this.initialized) return
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, StoredStartup>
        Object.entries(parsed).forEach(([id, startup]) => {
          this.cache.set(id, startup)
        })
        this.log('Loaded', this.cache.size, 'startups from localStorage')
      }
    } catch (e) {
      this.log('Failed to load from localStorage:', e)
      this.cache.clear()
    }
    
    this.initialized = true
  }

  getStartup(id: string): Record<string, any> | null {
    this.init()
    const stored = this.cache.get(id)
    if (stored) {
      this.log('✅ Retrieved startup', id, 'from cache:')
      this.log('  Stealth:', stored.data.stealth, 'Type:', typeof stored.data.stealth)
      this.log('  Contact_me:', stored.data.contact_me, 'Type:', typeof stored.data.contact_me)
      this.log('  Full data:', stored.data)
      return stored.data
    }
    this.log('❌ No cached data for startup', id)
    return null
  }

  saveStartup(id: string, data: Record<string, any>) {
    this.init()
    
    // Create a complete copy of the data
    const startup: StoredStartup = {
      id,
      data: { ...data },
      lastModified: Date.now()
    }
    
    this.cache.set(id, startup)
    this.log('💾 Saving startup', id)
    this.log('  Stealth:', data.stealth, 'Type:', typeof data.stealth)
    this.log('  Contact_me:', data.contact_me, 'Type:', typeof data.contact_me)
    this.log('  Full data being saved:', data)
    
    // Persist to localStorage
    this.persist()
  }

  updateStartup(id: string, updates: Record<string, any>) {
    this.init()
    
    // Get existing data or create new
    const existing = this.getStartup(id) || {}
    
    // Merge updates
    const updated = { ...existing, ...updates, id }
    
    // Save the complete record
    this.saveStartup(id, updated)
    
    this.log('Updated startup', id, 'with:', updates, 'Result:', updated)
    return updated
  }

  private persist() {
    try {
      const toStore: Record<string, StoredStartup> = {}
      this.cache.forEach((value, key) => {
        toStore[key] = value
      })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
      this.log('Persisted', Object.keys(toStore).length, 'startups to localStorage')
    } catch (e) {
      this.log('Failed to persist to localStorage:', e)
    }
  }

  clear() {
    this.cache.clear()
    try {
      localStorage.removeItem(STORAGE_KEY)
      this.log('Cleared all stored data')
    } catch (e) {
      this.log('Failed to clear localStorage:', e)
    }
  }

  getAllStartups(): Map<string, StoredStartup> {
    this.init()
    return new Map(this.cache)
  }
}

// Export singleton instance
export const mockPersistence = new MockPersistence()

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).__mockPersistence = mockPersistence
}