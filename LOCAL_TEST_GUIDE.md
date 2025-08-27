# Local Testing Guide

## Quick Start

### 1. Start the Development Server
```bash
npm run dev
```
The app will start on http://localhost:5173 (or next available port)

### 2. Open Browser with DevTools
1. Navigate to the local URL
2. **Open Developer Console** (F12 or Cmd+Option+I on Mac)
3. Keep console open to see all debug logs

## Testing Mock API Mode (Default)

### Login
1. Go to `/login` page
2. Use one of these test codes:
   ```
   bG9naW46MTAwMA==  (for NPID 1000)
   bG9naW46MTc1MA==  (for NPID 1750)
   bG9naW46MTAwMQ==  (for NPID 1001)
   ```
3. Check console for:
   ```
   [Setup] Current API mode: mock
   [Auth] Login attempt with API mode: mock
   ```

### Verify Mock Data
1. After login, go to Progress page
2. You should see sample startup data from CSV
3. Try editing stealth mode or contact settings
4. Check console for save operations

## Testing Real API Mode

### 1. Switch to Real API
1. After login, look for **toggle in bottom-right corner**
2. Click "Real API" button
3. Watch console for connection test:
   ```
   [ApiModeToggle] Testing real API connection
   [SocapAPI] Making request to: https://dev.socap.ai/api/v1/agent/agent_user/profile
   ```

### 2. Monitor API Calls
The console will show:
```
[SocapAPI] Request options: {...}
[SocapAPI] Response status: 200 OK
[SocapAPI] Response data: {...}
```

### 3. If Connection Fails
- Check for CORS errors in console
- Verify API key in logs (first 10 chars shown)
- Click "Test" button to retry connection

## Testing Specific Features

### Progress Page
1. Navigate to Progress tab
2. Console shows:
   ```
   [ProgressPage] Loading startups with API mode: [current mode]
   [UnifiedAPI] Getting startups with mode: [current mode]
   ```
3. Edit your startup details
4. Save and watch for update logs

### Circles Page
1. Navigate to Circles tab
2. Console shows:
   ```
   [CirclesPage] Loading circles with API mode: [current mode]
   [UnifiedAPI] Generating circles from startups
   ```

### Data Transformation (Real API)
When using real API, watch for:
```
[Transformer] Transforming Socap event to startup: {event data}
[Transformer] Transformed startup: {result}
[Transformer] Merging Socap data with existing data
```

## Common Test Scenarios

### Test 1: Mode Switching
1. Start in mock mode
2. Login and load data
3. Switch to real API
4. Page should reload
5. Data should load from real API

### Test 2: Data Persistence
1. In real API mode, edit startup details
2. Check console for:
   ```
   [UnifiedAPI] Saving to persistence: {data}
   ```
3. Refresh page
4. Changes should persist

### Test 3: Connection Failure
1. Temporarily break API key in `src/lib/apiConfig.ts`
2. Try switching to real API
3. Should see error and stay in mock mode
4. Fix API key and retry

## Debugging Tips

### Check Current Mode
```javascript
// In browser console:
localStorage.getItem('ncacc_api_mode')
```

### Clear All Data
```javascript
// Reset to fresh state:
localStorage.clear()
location.reload()
```

### Force Mode Switch
```javascript
// Switch to real API:
localStorage.setItem('ncacc_api_mode', 'real')
location.reload()

// Switch to mock API:
localStorage.setItem('ncacc_api_mode', 'mock')
location.reload()
```

### View Persisted Data
```javascript
// See all mock persistence:
localStorage.getItem('mockPersistence')

// See API config:
localStorage.getItem('ncacc_api_config')
```

## Expected Console Output

### Successful Mock Login
```
[Setup] Current API mode: mock
[Setup] Installing mock API interceptors
[Auth] Login attempt with API mode: mock
[UnifiedAPI] Login attempt with mode: mock, code: bG9naW46MTAwMA==
[UnifiedAPI] Performing mock login
[Auth] Login successful for user: Jane Doe
```

### Successful Real API Connection
```
[ApiModeToggle] Testing real API connection before switching
[SocapAPI] Testing API connection
[SocapAPI] Making request to: https://dev.socap.ai/api/v1/agent/agent_user/profile
[SocapAPI] Response status: 200 OK
[SocapAPI] Connection test successful
[ApiModeToggle] Real API connection successful
[Setup] Reloading page to remove mock interceptors
```

### Data Loading (Real API)
```
[ProgressPage] Loading startups with API mode: real
[UnifiedAPI] Getting real API startups
[SocapAPI] Fetching event list
[SocapAPI] Received 5 events
[Transformer] Transforming Socap event to startup
[Transformer] Final merged data count: 5
[ProgressPage] Processed 5 startups
```

## Troubleshooting

### Port Already in Use
If you see "Port 5173 is in use", the dev server is already running.
Either use the existing instance or kill it:
```bash
# Find process using port
lsof -i :5173
# Kill it
kill -9 [PID]
```

### CORS Issues (Real API)
If you see CORS errors when using real API:
1. Check if API supports localhost origin
2. May need to use a proxy or CORS extension for testing
3. The API should include proper CORS headers

### No Data Showing
1. Check console for errors
2. Verify CSV file exists at `/public/sample.csv`
3. For real API, check transformation logs
4. Try clearing localStorage and reloading