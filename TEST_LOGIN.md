# Login Test Guide

## How Login Works Now

### 🔵 Mock API Mode (Default)
- **What it does**: Validates login codes against CSV data
- **Valid codes**: Must match `login_code` in CSV or computed from NPID
- **Example codes**:
  - `bG9naW46MTAwMA==` (NPID 1000)
  - `bG9naW46MTc1MA==` (NPID 1750) 
  - `bG9naW46MTAwMQ==` (NPID 1001)

### 🟢 Real API Mode
- **What it does**: Tests connection to Socap.dev API
- **Valid input**: Any non-empty string (acts as a trigger)
- **Authentication**: Uses pre-configured API key
- **Success**: If API returns profile data

## Testing Steps

### 1. Start the App
```bash
npm run dev
```
Open http://localhost:5173 with browser console (F12)

### 2. Test Mock Mode
1. Ensure "API: Mock" is selected (top-right button)
2. Enter code: `bG9naW46MTc1MA==`
3. Click Login
4. Console should show:
   ```
   [LoginPage] Attempting login with mock API
   [UnifiedAPI] Performing mock login
   [Auth] Login successful for user: Jane Doe
   ```

### 3. Test Real API Mode
1. Click toggle to switch to "API: Real (Socap.dev)"
2. Enter any text (e.g., "test")
3. Click Login
4. Console should show:
   ```
   [LoginPage] Attempting login with real API
   [UnifiedAPI] Testing Socap API connection for authentication
   [SocapAPI] Making request to: https://dev.socap.ai/api/v1/agent/agent_user/profile
   ```

### 4. Verify Mode Persistence
1. Successfully login with either mode
2. Refresh the page
3. The API mode should remain the same
4. You should stay logged in (if "Remember me" was checked)

## Console Debugging

### Watch for these logs:

#### Successful Mock Login:
```
[Setup] Current API mode: mock
[Setup] Installing mock API interceptors
[LoginPage] Attempting login with mock API
[UnifiedAPI] Login attempt with mode: mock, code: bG9naW46MTc1MA==
[UnifiedAPI] Performing mock login
Fetch intercepted: /api/auth/verify POST
Auth verify request with code: bG9naW46MTc1MA==
Matched startup: 1750 Stealth Startup
[UnifiedAPI] Mock login response: {success: true, data: {...}}
[Auth] Login successful for user: Jane Doe
```

#### Successful Real API Login:
```
[Setup] Current API mode: real
[Setup] Real API mode - mock interceptors not installed
[LoginPage] Attempting login with real API
[UnifiedAPI] Login attempt with mode: real, code: test
[UnifiedAPI] Testing Socap API connection for authentication
[SocapAPI] Making request to: https://dev.socap.ai/api/v1/agent/agent_user/profile
[SocapAPI] Response status: 200 OK
[SocapAPI] Response data: {name: "John Doe", telegram_id: 123456789}
[UnifiedAPI] Successfully authenticated with Socap API
[UnifiedAPI] Created session for user: John Doe (NPID: 123456789)
[Auth] Login successful for user: John Doe
```

#### Failed Real API Login (Connection Issues):
```
[UnifiedAPI] Testing Socap API connection for authentication
[SocapAPI] Request failed: Error: API request failed: 401 Unauthorized
[UnifiedAPI] Real API authentication failed: Error: API request failed
[Auth] Login failed: Authentication failed: API request failed
```

## Troubleshooting

### Mock Mode Not Working
- Check if CSV file exists: `/public/sample.csv`
- Verify code format is base64
- Check console for "Matched startup" log
- Try clearing localStorage: `localStorage.clear()`

### Real API Not Working
- Check console for CORS errors
- Verify API key in `src/lib/apiConfig.ts`
- Check network tab for API response
- Try: `curl -H "X-API-KEY: rlgFmaj7Q1mj7F8o4-2b5A" https://dev.socap.ai/api/v1/agent/agent_user/profile`

### Mode Not Switching
- Page should reload when switching modes
- Check: `localStorage.getItem('ncacc_api_mode')`
- Force switch: `localStorage.setItem('ncacc_api_mode', 'real'); location.reload()`

## API Mode Differences

| Feature | Mock Mode | Real API Mode |
|---------|-----------|---------------|
| Data Source | `/public/sample.csv` | Socap.dev API |
| Login Validation | CSV login codes | API connection test |
| Data Updates | localStorage | localStorage (until API supports writes) |
| Performance | Instant | Network dependent |
| Offline Support | ✅ Yes | ❌ No |