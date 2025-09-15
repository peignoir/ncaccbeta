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
    // const apiUrl = `https://dev.socap.ai${apiPath}`;
    const apiUrl = `https://app.socap.ai${apiPath}`; // Production server

    console.log('\n🔄 [Proxy] New request received:');
    console.log(`  📍 Method: ${req.method}`);
    console.log(`  🌐 Path: ${apiPath}`);
    console.log(`  🎯 Target: ${apiUrl}`);
    console.log(`  🔑 API Key: ${req.headers['x-api-key'] ? req.headers['x-api-key'].substring(0, 15) + '...' : 'Not provided'}`);
    console.log(`  📦 Headers:`, Object.keys(req.headers).join(', '));

    const startTime = Date.now();

    const response = await axios({
      method: req.method,
      url: apiUrl,
      headers: {
        ...req.headers,
        // host: 'dev.socap.ai',
        host: 'app.socap.ai', // Production server
      },
      data: req.body,
    });

    const responseTime = Date.now() - startTime;
    console.log(`✅ [Proxy] Success!`);
    console.log(`  📊 Status: ${response.status}`);
    console.log(`  ⏱️  Time: ${responseTime}ms`);
    console.log(`  📤 Response data keys:`, response.data ? Object.keys(response.data).join(', ') : 'No data');

    res.status(response.status).json(response.data);
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('\n❌ [Proxy] Request failed!');
    console.error(`  🔥 Error: ${error.message}`);
    console.error(`  ⏱️  Failed after: ${responseTime}ms`);

    if (error.response) {
      console.error(`  📊 Response status: ${error.response.status}`);
      console.error(`  📤 Error data:`, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error(`  💥 Network error or no response`);
      res.status(500).json({ error: 'Proxy error', message: error.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  // console.log('Proxying requests from /api/* to https://dev.socap.ai/api/*');
  console.log('Proxying requests from /api/* to https://app.socap.ai/api/*'); // Production server
});