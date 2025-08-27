# Login Flow Guide

## How the New Login System Works

### API Mode Toggle
- Located in **top-right corner** of login page
- **Blue button**: Mock API mode (default)
- **Green button**: Real API mode (Socap.dev)
- Switching modes **does NOT** test connection automatically

## Login Flow by Mode

### 🔵 Mock API Mode (Default)
1. Select "API: Mock" (blue button)
2. Enter BASE64 authentication code
3. Click Login
4. System validates code against CSV data

**Valid codes:**
- `bG9naW46MTAwMA==` (NPID 1000)
- `bG9naW46MTc1MA==` (NPID 1750)
- `bG9naW46MTAwMQ==` (NPID 1001)

### 🟢 Real API Mode
1. Click toggle to switch to "API: Real (Socap.dev)"
2. Enter your Socap.dev API key
3. Click Login
4. System tests API connection with your key
5. If successful, creates session

**Test API key:** `rlgFmaj7Q1mj7F8o4-2b5A`

## What Happens During Login

### Mock Mode
```
User enters code → Validate against CSV → Create session → Enter app
```

### Real API Mode
```
User enters API key → Test Socap API connection → Get profile → Create session → Enter app
```

## Key Features

### API Key Persistence
- Real mode API keys are saved in localStorage
- Persists across sessions (if you check "Remember me")
- Cleared on logout

### Mode Persistence
- Selected API mode is remembered
- Survives page refreshes
- Can be changed anytime on login page

### Security
- API keys are stored locally only
- Shown as password field (hidden)
- Not sent to any third-party services

## Testing Instructions

### Test Mock Mode
1. Ensure "API: Mock" is selected
2. Enter: `bG9naW46MTc1MA==`
3. Check "Remember me"
4. Click Login
5. Should enter app immediately

### Test Real API
1. Switch to "API: Real (Socap.dev)"
2. Enter test key: `rlgFmaj7Q1mj7F8o4-2b5A`
3. Click Login
4. Watch console for API calls
5. Should see Socap profile data

### Test Mode Switching
1. Start in Mock mode
2. Login successfully
3. Logout
4. Switch to Real API mode
5. Page should NOT reload
6. API key field should appear

## Console Logs

### Successful Mock Login
```
[LoginPage] Switching API mode to: mock
[LoginPage] Attempting login with mock API
[UnifiedAPI] Performing mock login
[Auth] Login successful for user: Jane Doe
```

### Successful Real API Login
```
[LoginPage] Switching API mode to: real
[LoginPage] Setting user API key
[LoginPage] Attempting login with real API
[UnifiedAPI] Testing Socap API connection for authentication
[SocapAPI] Making request to: https://dev.socap.ai/api/v1/agent/agent_user/profile
[SocapAPI] Response status: 200 OK
[UnifiedAPI] Successfully authenticated with Socap API
[Auth] Login successful for user: John Doe
```

### Failed Real API Login
```
[LoginPage] Setting user API key
[UnifiedAPI] Testing Socap API connection for authentication
[SocapAPI] Response status: 401 Unauthorized
[UnifiedAPI] Real API authentication failed
[Auth] Login failed: Authentication failed: API request failed
```

## Troubleshooting

### "Please enter your API key"
- In Real API mode, API key field is required
- Enter the test key or your own Socap.dev key

### "Invalid BASE64 code"
- In Mock mode, code must be valid BASE64
- Use one of the example codes provided

### API Connection Failed
- Check API key is correct
- Verify internet connection
- Check browser console for CORS errors
- Try the test key: `rlgFmaj7Q1mj7F8o4-2b5A`

### Mode Not Switching
- Toggle should switch immediately
- No reload required when switching
- Check localStorage: `localStorage.getItem('ncacc_api_mode')`

## After Login

Once logged in, you'll see an API toggle in the **bottom-right corner** that shows:
- Current API mode
- Connection status (for Real API)
- Test connection button

This allows you to verify the API is working after login.