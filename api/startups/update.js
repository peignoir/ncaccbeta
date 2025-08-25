module.exports = function handler(req, res) {
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
    const { id, updates } = req.body || {}
    
    if (!id) {
      return res.status(400).json({ ok: false, message: 'Missing id' })
    }

    // For now, just return success since we can't actually update the CSV on Vercel
    // In a real app, this would update a database
    console.log('Update request for:', id, updates)
    
    // Return the updated data
    const updatedStartup = {
      id,
      ...updates
    }
    
    res.status(200).json({ 
      ok: true, 
      updated: updatedStartup,
      message: 'Update simulated successfully (read-only in production)'
    })
  } catch (error) {
    console.error('Update API error:', error)
    res.status(500).json({ ok: false, message: 'Internal server error' })
  }
}