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

  // Handle POST/PUT for updating startup data
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const { id, ...updates } = req.body
      
      if (!id) {
        return res.status(400).json({ error: 'Startup ID required' })
      }

      // Read CSV data
      const csvPath = path.join(process.cwd(), 'public', 'sample.csv')
      const csvText = fs.readFileSync(csvPath, 'utf-8')
      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true })
      const csvData = parsed.data || []
      
      // Find and update the startup
      const startupIndex = csvData.findIndex(row => 
        row.npid === id || row.id === id
      )
      
      if (startupIndex === -1) {
        return res.status(404).json({ error: 'Startup not found' })
      }
      
      // Update the fields
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          // Convert boolean values to strings for CSV
          if (typeof updates[key] === 'boolean') {
            csvData[startupIndex][key] = updates[key] ? 'true' : 'false'
          } else {
            csvData[startupIndex][key] = updates[key]
          }
        }
      })
      
      // Convert back to CSV
      const newCsvText = Papa.unparse(csvData, { header: true })
      
      // Write back to file
      fs.writeFileSync(csvPath, newCsvText, 'utf-8')
      
      return res.status(200).json({ success: true, message: 'Startup updated' })
    } catch (error) {
      console.error('Update error:', error)
      return res.status(500).json({ error: 'Failed to update startup', details: error.message })
    }
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
      const stealth = row.stealth === 'true' || row.stealth === true || row.stealth === '1'
      
      return {
        id: row.npid || row.id || `startup_${idx}`,
        npid: row.npid,
        name: stealth ? 'Stealth Startup' : (row.startup_name || row.name || `Startup ${idx + 1}`),
        startup_name: row.startup_name,
        website: stealth ? undefined : row.website,
        founder: row.founder_name || row.name,
        founder_name: row.founder_name,
        founder_email: row.founder_email,
        founder_telegram: row.founder_telegram,
        founder_linkedin_url: row.founder_linkedin_url,
        location: row.founder_city && row.founder_country ? 
          `${row.founder_city}, ${row.founder_country}` : undefined,
        founder_city: row.founder_city,
        founder_country: row.founder_country,
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
        motivation: row.motivation,
        traction: row.traction,
        product: row.product,
        long_pitch: row.long_pitch,
        demo_video_url: row.demo_video_url,
        one_pager_url: row.one_pager_url,
        github_repos: row.github_repos,
        problem_statement: row.problem_statement,
        customer: row.customer,
        product_job_to_be_done: row.product_job_to_be_done,
        value_proposition: row.value_proposition,
        current_workaround: row.current_workaround,
        why_now_catalyst: row.why_now_catalyst,
        key_differentiator: row.key_differentiator,
        founder_time_commitment_pct: row.founder_time_commitment_pct,
        competitors_urls: row.competitors_urls,
        Business_model_explained: row.Business_model_explained,
        proof_of_concept: row.proof_of_concept,
        dataroom_url: row.dataroom_url,
        pitch_video_url: row.pitch_video_url,
        contact_me: row.contact_me === '' || row.contact_me === undefined || row.contact_me === null ? true : (row.contact_me === 'true' || row.contact_me === true || row.contact_me === '1')
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