import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ApiConfigManager from '../lib/apiConfig'
import { initializeDemoData } from '../lib/generateDemoUsage'
import logger from '../lib/logger'

type ApiUsageRecord = {
  timestamp: string
  endpoint: string
  method: string
  userId: string // Masked user identifier
  responseTime?: number
  status?: number
}

type UserUsageStats = {
  userId: string
  totalCalls: number
  lastAccess: string
  endpoints: { [key: string]: number }
  averageResponseTime: number
  errorRate: number
}

export default function ApiUsagePage() {
  const navigate = useNavigate()
  const [usageRecords, setUsageRecords] = useState<ApiUsageRecord[]>([])
  const [userStats, setUserStats] = useState<UserUsageStats[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')

  useEffect(() => {
    // Only allow access for pofpof users
    if (ApiConfigManager.getApiKey() !== 'pofpof') {
      navigate('/progress')
      return
    }
    // Initialize demo data if needed
    initializeDemoData()
    loadUsageData()
  }, [timeRange])

  const loadUsageData = () => {
    // Load from localStorage (in production, this would come from a backend)
    const storedUsage = localStorage.getItem('ncacc_api_usage')
    logger.log('[ApiUsagePage] Loading usage data from localStorage')
    
    if (storedUsage) {
      try {
        const records: ApiUsageRecord[] = JSON.parse(storedUsage)
        logger.log(`[ApiUsagePage] Parsed ${records.length} records`)
        
        // Filter by time range
        const now = new Date()
        const cutoff = new Date()
        switch (timeRange) {
          case '1h':
            cutoff.setHours(now.getHours() - 1)
            break
          case '24h':
            cutoff.setDate(now.getDate() - 1)
            break
          case '7d':
            cutoff.setDate(now.getDate() - 7)
            break
          case '30d':
            cutoff.setDate(now.getDate() - 30)
            break
        }
        
        const filteredRecords = records.filter(r => 
          new Date(r.timestamp) > cutoff
        )
        
        setUsageRecords(filteredRecords)
        calculateUserStats(filteredRecords)
        logger.log(`[ApiUsagePage] Showing ${filteredRecords.length} records after filtering`)
      } catch (e) {
        console.error('Failed to parse usage data:', e)
      }
    } else {
      logger.log('[ApiUsagePage] No usage data found in localStorage')
      setUsageRecords([])
      setUserStats([])
    }
    setLoading(false)
  }
  
  const regenerateDemoData = () => {
    logger.log('[ApiUsagePage] Regenerating demo data')
    initializeDemoData(true)
    loadUsageData()
  }

  const calculateUserStats = (records: ApiUsageRecord[]) => {
    const statsMap = new Map<string, UserUsageStats>()
    
    records.forEach(record => {
      const userId = record.userId
      
      if (!statsMap.has(userId)) {
        statsMap.set(userId, {
          userId,
          totalCalls: 0,
          lastAccess: record.timestamp,
          endpoints: {},
          averageResponseTime: 0,
          errorRate: 0
        })
      }
      
      const stats = statsMap.get(userId)!
      stats.totalCalls++
      stats.lastAccess = record.timestamp > stats.lastAccess ? record.timestamp : stats.lastAccess
      
      const endpoint = `${record.method} ${record.endpoint}`
      stats.endpoints[endpoint] = (stats.endpoints[endpoint] || 0) + 1
      
      if (record.responseTime) {
        stats.averageResponseTime = 
          (stats.averageResponseTime * (stats.totalCalls - 1) + record.responseTime) / stats.totalCalls
      }
      
      if (record.status && record.status >= 400) {
        stats.errorRate = ((stats.errorRate * (stats.totalCalls - 1)) + 1) / stats.totalCalls
      } else {
        stats.errorRate = (stats.errorRate * (stats.totalCalls - 1)) / stats.totalCalls
      }
    })
    
    const sortedStats = Array.from(statsMap.values())
      .sort((a, b) => b.totalCalls - a.totalCalls)
    
    setUserStats(sortedStats)
  }

  const maskApiKey = (key: string): string => {
    if (!key || key.length < 10) return 'Unknown'
    return `${key.substring(0, 6)}...${key.substring(key.length - 4)}`
  }

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading API usage data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-2xl p-8 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold text-gray-900">API Usage Analytics</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={regenerateDemoData}
              className="px-3 py-2 border border-purple-300 bg-purple-100 hover:bg-purple-200 rounded-lg text-sm text-purple-700 font-medium transition"
            >
              Generate Demo Data
            </button>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-2 border rounded-lg text-sm bg-white"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4">
            <div className="text-3xl font-bold text-purple-600">
              {usageRecords.length}
            </div>
            <div className="text-sm text-gray-600">Total API Calls</div>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <div className="text-3xl font-bold text-blue-600">
              {userStats.length}
            </div>
            <div className="text-sm text-gray-600">Active Users</div>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <div className="text-3xl font-bold text-green-600">
              {userStats.length > 0 
                ? Math.round(userStats.reduce((acc, s) => acc + s.averageResponseTime, 0) / userStats.length)
                : 0}ms
            </div>
            <div className="text-sm text-gray-600">Avg Response Time</div>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <div className="text-3xl font-bold text-red-600">
              {userStats.length > 0
                ? Math.round(userStats.reduce((acc, s) => acc + s.errorRate, 0) / userStats.length * 100)
                : 0}%
            </div>
            <div className="text-sm text-gray-600">Error Rate</div>
          </div>
        </div>
      </div>

      {/* User Statistics Table */}
      <div className="bg-white rounded-2xl p-8 shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Usage by User</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">User ID</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">API Calls</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Last Access</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Top Endpoints</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Avg Response</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Error Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {userStats.map((stats) => (
                <tr key={stats.userId} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {maskApiKey(stats.userId)}
                    </code>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-semibold">{stats.totalCalls}</span>
                  </td>
                  <td className="py-4 px-4 text-gray-600">
                    {formatTimestamp(stats.lastAccess)}
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm">
                      {Object.entries(stats.endpoints)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 2)
                        .map(([endpoint, count]) => (
                          <div key={endpoint} className="text-gray-600">
                            {endpoint.split(' ')[1]} ({count})
                          </div>
                        ))}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`font-medium ${
                      stats.averageResponseTime < 500 ? 'text-green-600' :
                      stats.averageResponseTime < 1000 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {Math.round(stats.averageResponseTime)}ms
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`font-medium ${
                      stats.errorRate < 0.01 ? 'text-green-600' :
                      stats.errorRate < 0.05 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {Math.round(stats.errorRate * 100)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {userStats.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No API usage data available for the selected time range
            </div>
          )}
        </div>
      </div>

      {/* Recent API Calls */}
      <div className="bg-white rounded-2xl p-8 shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Recent API Calls</h3>
        
        <div className="space-y-2">
          {usageRecords.slice(0, 20).map((record, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  record.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                  record.method === 'POST' ? 'bg-green-100 text-green-700' :
                  record.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {record.method}
                </span>
                <code className="text-sm text-gray-700">{record.endpoint}</code>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-500">{maskApiKey(record.userId)}</span>
                <span className={`font-medium ${
                  record.status && record.status >= 400 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {record.status || 200}
                </span>
                <span className="text-gray-400">{formatTimestamp(record.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}