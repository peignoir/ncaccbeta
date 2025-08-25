export default function handler(req, res) {
  const fs = require('fs')
  const path = require('path')
  const Papa = require('papaparse')
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
    let csvData = []
    
    try {
      const csvText = fs.readFileSync(csvPath, 'utf-8')
      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true })
      csvData = parsed.data || []
    } catch (e) {
      console.error('Failed to read CSV:', e)
      // Return empty array if CSV fails
      csvData = []
    }

    // Transform data
    const startups = csvData.map((row, idx) => {
      const progress = row.current_progress != null ? Math.round(parseFloat(row.current_progress) * 100) : 0
      const stealth = row.stealth === 'true' || row.stealth === '1'
      
      return {
        id: row.npid || row.id || `startup_${idx}`,
        npid: row.npid,
        name: stealth ? 'Stealth Startup' : (row.startup_name || row.name || `Startup ${idx + 1}`),
        startup_name: row.startup_name,
        website: stealth ? undefined : row.website,
        founder: row.founder_name || row.name,
        founder_name: row.founder_name,
        founder_email: row.founder_email,
        location: row.founder_city && row.founder_country ? 
          `${row.founder_city}, ${row.founder_country}` : undefined,
        house: row.house,
        progress,
        current_progress: row.current_progress,
        stealth,
        nocap_motivation: row.nocap_motivation,
        circle: row.circle,
        circle_name: row.circle_name,
        circle_description: row.circle_description,
        wave: row.wave,
        bio: row.bio,
        motivation: row.motivation
      }
    })

    // Apply filters if any
    const { house, sort } = req.query || {}
    let filtered = startups

    if (house && house !== 'all') {
      filtered = filtered.filter(s => s.house === house)
    }

    if (sort === 'progress') {
      filtered = filtered.sort((a, b) => b.progress - a.progress)
    }

    res.status(200).json(filtered)
  } catch (error) {
    console.error('Startups API error:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}