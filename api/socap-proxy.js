export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-KEY');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get the path from query parameter
    const { path } = req.query;
    if (!path) {
      return res.status(400).json({ error: 'Path parameter is required' });
    }

    // Build the Socap API URL
    const url = `https://dev.socap.ai${path}`;
    console.log(`[Proxy] Forwarding request to: ${url}`);

    // Forward the request
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'X-API-KEY': req.headers['x-api-key'] || '',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();

    // Return the response
    res.status(response.status).json(data);
  } catch (error) {
    console.error('[Proxy] Error:', error);
    res.status(500).json({ error: 'Proxy error', message: error.message });
  }
}