const fs = require('fs')
const path = require('path')
const Papa = require('papaparse')

module.exports = (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    
    // Read CSV data
    const csvPath = path.join(process.cwd(), 'public', 'sample.csv')
    let startups = []
    
    try {
      const csvText = fs.readFileSync(csvPath, 'utf-8')
      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true })
      startups = parsed.data || []
    } catch (e) {
      console.error('Failed to read CSV:', e)
      startups = []
    }

    // Group by circle
    const byCircle = {}
    const circleInfo = {}

    for (const startup of startups) {
      const circleId = startup.circle || '1'
      if (!byCircle[circleId]) {
        byCircle[circleId] = []
        circleInfo[circleId] = {
          name: startup.circle_name || `Circle ${circleId}`,
          description: startup.circle_description || 'A supportive peer group for collaborative learning and accountability.'
        }
      }
      
      byCircle[circleId].push({
        id: `m_${startup.npid || startup.id}`,
        name: startup.founder_name || startup.name,
        startup: startup.startup_name || startup.name,
        website: startup.website,
        telegram: startup.founder_telegram,
        bio: startup.bio,
        house: startup.house || 'venture',
        wave: startup.wave || 'wave1'
      })
    }

    // Create circles array
    const circles = Object.keys(byCircle).sort().map(key => ({
      id: `circle_${key}`,
      name: circleInfo[key].name,
      description: circleInfo[key].description,
      members: byCircle[key],
      insights: [
        `${byCircle[key].length} founders`,
        circleInfo[key].description.substring(0, 100) + '...'
      ]
    }))

    res.status(200).json(circles)
  } catch (error) {
    console.error('Circles API error:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}