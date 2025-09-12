import ApiConfigManager from './apiConfig';

// Generate demo usage data for testing the API usage dashboard
export function generateDemoUsageData() {
  const demoData = [];
  const apiKeys = [
    'l_P09uhOSDaXGOlnoj9ITw',
    'knr3amgWSL1234567890ab',
    'xyz_demo_key_987654321',
    'test_api_key_abcdef123',
    'prod_key_qwerty789012'
  ];
  
  const endpoints = [
    '/api/v1/agent/agent_user/profile',
    '/api/v1/agent/agent_user/event-list',
    '/api/v1/agent/agent_user/event-details',
    '/api/auth/login',
    '/api/auth/refresh'
  ];
  
  const now = new Date();
  
  // Generate data for the last 7 days
  for (let i = 0; i < 500; i++) {
    const timestamp = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
    const responseTime = Math.floor(Math.random() * 800) + 100;
    const status = Math.random() > 0.95 ? 500 : (Math.random() > 0.9 ? 404 : 200);
    
    demoData.push({
      timestamp: timestamp.toISOString(),
      endpoint,
      method: endpoint.includes('auth') ? 'POST' : 'GET',
      userId: hashUserId(apiKey),
      responseTime,
      status
    });
  }
  
  // Sort by timestamp
  demoData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  return demoData;
}

function hashUserId(userId: string): string {
  if (!userId) return 'anonymous';
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return `user_${Math.abs(hash).toString(36)}_${userId.slice(0, 4)}`;
}

// Initialize demo data if in pofpof mode
export function initializeDemoData(forceRegenerate = false) {
  const apiKey = localStorage.getItem('ncacc_api_key');
  const apiKeyFromManager = ApiConfigManager.getApiKey();
  console.log('[Demo] Checking if should initialize demo data. API key from localStorage:', apiKey);
  console.log('[Demo] API key from ConfigManager:', apiKeyFromManager);
  
  // Check both sources for pofpof (or if force regenerate is true)
  if (apiKey === 'pofpof' || apiKeyFromManager === 'pofpof' || forceRegenerate) {
    const existingData = localStorage.getItem('ncacc_api_usage');
    let shouldGenerate = forceRegenerate;
    
    try {
      if (!existingData) {
        shouldGenerate = true;
        console.log('[Demo] No existing data, will generate');
      } else {
        const parsed = JSON.parse(existingData);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          shouldGenerate = true;
          console.log('[Demo] Existing data is empty, will generate');
        } else {
          console.log(`[Demo] Found ${parsed.length} existing records`);
        }
      }
    } catch (e) {
      shouldGenerate = true;
      console.log('[Demo] Error parsing existing data, will generate');
    }
    
    if (shouldGenerate) {
      const demoData = generateDemoUsageData();
      localStorage.setItem('ncacc_api_usage', JSON.stringify(demoData));
      console.log(`[Demo] Generated ${demoData.length} demo API usage records`);
      return demoData;
    }
  }
  
  return null;
}