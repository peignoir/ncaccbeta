export default function handler(req, res) {
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const fs = require('fs')
    const path = require('path')
    const Papa = require('papaparse')
    
    const { code } = req.body || {}
    console.log('Auth verify request with code:', code)

    if (!code || code.length < 7) {
      return res.status(200).json({ success: false, message: 'Invalid code' })
    }

    // Read CSV data
    const csvPath = path.join(process.cwd(), 'public', 'sample.csv')
    let csvData = []
    
    try {
      const csvText = fs.readFileSync(csvPath, 'utf-8')
      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true })
      csvData = parsed.data || []
      console.log('Loaded', csvData.length, 'startups from CSV')
    } catch (e) {
      console.error('Failed to read CSV:', e)
      // Return error instead of fallback
      return res.status(200).json({ success: false, message: 'Unable to load data' })
    }

    // Find matching startup
    const matched = csvData.find(row => {
      const loginCode = row.login_code
      const computedCode = Buffer.from(`login:${row.npid || row.id}`).toString('base64')
      return loginCode === code || computedCode === code
    })

    if (matched) {
      const user = {
        id: `user_${matched.npid || matched.id}`,
        name: matched.founder_name || 'NC/ACC Founder',
        email: matched.founder_email || 'founder@example.com',
        startup: {
          id: matched.npid || matched.id,
          name: matched.startup_name || matched.name,
          website: matched.website,
          progress: Math.round((parseFloat(matched.current_progress) || 0) * 100),
          house: matched.house
        },
        house: matched.house || 'venture'
      }
      
      console.log('Login successful for:', user.name)
      return res.status(200).json({
        success: true,
        user,
        token: 'mock-jwt-token'
      })
    }

    console.log('No match found for code:', code)
    return res.status(200).json({ success: false, message: 'Invalid access code' })
  } catch (error) {
    console.error('Auth error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}