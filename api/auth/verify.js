import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

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
    const { code } = req.body
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
      csvData = parsed.data
    } catch (e) {
      console.error('Failed to read CSV:', e)
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
          progress: Math.round((matched.current_progress || 0) * 100),
          house: matched.house
        },
        house: matched.house || 'venture'
      }
      
      return res.status(200).json({
        success: true,
        user,
        token: 'mock-jwt-token'
      })
    }

    // Special test code
    if (code === 'dGVzdGtleTEyMw==') {
      const franck = csvData.find(row => 
        (row.founder_name || '').toLowerCase().includes('franck') ||
        (row.website || '').includes('nocodebuilder')
      )
      
      if (franck) {
        const user = {
          id: 'user_franck',
          name: 'Franck Nouyrigat',
          email: 'franck@nocodeai.io',
          startup: {
            id: franck.npid || franck.id,
            name: franck.startup_name || franck.name,
            website: franck.website,
            progress: Math.round((franck.current_progress || 0) * 100),
            house: franck.house
          },
          house: franck.house || 'venture'
        }
        
        return res.status(200).json({
          success: true,
          user,
          token: 'mock-jwt-token'
        })
      }
    }

    return res.status(200).json({ success: false, message: 'Invalid access code' })
  } catch (error) {
    console.error('Auth error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}