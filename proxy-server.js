import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = 3001;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Proxy middleware for all /api routes
app.use('/api', async (req, res) => {
  try {
    const apiPath = req.originalUrl;
    const apiUrl = `https://dev.socap.ai${apiPath}`;
    
    console.log(`[Proxy] ${req.method} ${apiPath} -> ${apiUrl}`);
    
    const response = await axios({
      method: req.method,
      url: apiUrl,
      headers: {
        ...req.headers,
        host: 'dev.socap.ai',
      },
      data: req.body,
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[Proxy] Error:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Proxy error' });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log('Proxying requests from /api/* to https://dev.socap.ai/api/*');
});