# API Integration Test Guide

## Overview
This app now supports dual API modes:
- **Mock API**: Uses local CSV files and localStorage (default)
- **Real API**: Uses Socap.dev API endpoints

## API Toggle Location
A toggle switch appears in the **bottom-right corner** of the app when logged in.

## Testing Steps

### 1. Mock API Mode (Default)
1. Start the app: `npm run dev`
2. Open browser console (F12) to see debug logs
3. Login with any test code (e.g., `bG9naW46MTAwMA==`)
4. Verify logs show:
   - `[Setup] Current API mode: mock`
   - `[Auth] Login attempt with API mode: mock`
   - Data loading from mock endpoints

### 2. Real API Mode
1. Click the API toggle in bottom-right corner
2. Switch from "Mock API" to "Real API"
3. Watch console for:
   - `[ApiModeToggle] Testing real API connection`
   - `[SocapAPI] Making request to: https://dev.socap.ai/...`
   - Connection status indicator

### 3. Data Transformation
When in Real API mode, the app:
- Fetches events from Socap.dev API
- Transforms them to match app's data structure
- Merges with any existing local data
- Shows debug logs for each transformation step

## Debug Logs to Monitor

### Authentication
```
[Auth] Login attempt with API mode: [mock|real]
[UnifiedAPI] Login attempt with mode: [mock|real]
[SocapAPI] Fetching user profile (real mode only)
```

### Data Loading
```
[ProgressPage] Loading startups with API mode: [mock|real]
[UnifiedAPI] Getting startups with mode: [mock|real]
[SocapAPI] Fetching event list (real mode only)
[Transformer] Transforming Socap event to startup
```

### Data Updates
```
[ProgressPage] Saving updates with API mode: [mock|real]
[UnifiedAPI] Updating startup [npid] with mode: [mock|real]
[UnifiedAPI] Saving to persistence (real mode)
```

### Circles
```
[CirclesPage] Loading circles with API mode: [mock|real]
[UnifiedAPI] Generating circles from startups
```

## Troubleshooting

### Real API Connection Failed
- Check console for detailed error messages
- Verify API key is correct in `src/lib/apiConfig.ts`
- Check CORS settings if running locally
- Use "Test" button next to connection status

### Data Not Appearing
- Check transformation logs in console
- Verify Socap API is returning expected data structure
- Check `[Transformer]` logs for mapping issues

### Mode Switch Not Working
- Page should reload when switching modes
- Check `[Setup]` logs for interceptor installation
- Clear localStorage if stuck: `localStorage.clear()`

## API Endpoints Used

### Mock API (intercepted by mockServer.ts)
- POST `/api/auth/verify` - Login
- GET `/api/startups` - Get all startups
- POST `/api/startups` - Update startup
- GET `/api/circles` - Get circles

### Real API (Socap.dev)
- GET `/api/v1/agent/agent_user/profile` - User profile
- GET `/api/v1/agent/agent_user/event-list` - Events/startups
- GET `/api/v1/agent/agent_user/pre-event-details` - Event details

## Data Persistence
- **Mock Mode**: Uses CSV files + localStorage
- **Real Mode**: Uses Socap API + localStorage for updates
- Updates in real mode are saved locally until API supports writes

## Key Files
- `src/lib/apiConfig.ts` - API configuration and mode management
- `src/lib/socapApi.ts` - Socap.dev API client
- `src/lib/unifiedApi.ts` - Unified API routing
- `src/lib/apiDataTransformer.ts` - Data transformation logic
- `src/components/ApiModeToggle.tsx` - UI toggle component