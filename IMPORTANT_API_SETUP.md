# CRITICAL: REST API Setup for Vercel Deployment

## REST API Architecture
The app uses a REST API pattern that will work with both:
1. **Development**: CSV file as data source (current)
2. **Production**: Real REST API backend (future)

## Problem
The mock API using client-side fetch interceptors DOES NOT WORK on Vercel production.
Vercel needs actual API endpoints.

## Solution
We use Vercel Serverless Functions in the `/api` directory.

## Structure
```
/api
  /auth
    verify.js         - POST /api/auth/verify
  /startups
    update.js         - POST /api/startups/update
  circles.js          - GET /api/circles
  startups.js         - GET /api/startups
```

## Key Files

### 1. `/api/*` - Serverless Functions
- These are Node.js functions that run on Vercel
- They read from `/public/sample.csv` for data
- They handle CORS headers

### 2. `/vercel.json` - Routing Configuration
```json
{
  "functions": {
    "api/*.js": {
      "maxDuration": 10
    }
  },
  "rewrites": [
    { "source": "/api/auth/verify", "destination": "/api/auth/verify" },
    { "source": "/api/startups/update", "destination": "/api/startups/update" },
    { "source": "/api/startups", "destination": "/api/startups" },
    { "source": "/api/circles", "destination": "/api/circles" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 3. `/public/sample.csv` - Data Source
- This is the CSV file with all startup data
- Login codes are in the `login_code` column
- Must be in public folder to be accessible by API functions

## Authentication Flow
1. User enters login code (e.g., `bG9naW46MTc1MA==`)
2. Frontend calls `POST /api/auth/verify` with `{ code: "..." }`
3. API function reads CSV, finds matching `login_code` or computes from `npid`
4. Returns user object with token

## DO NOT BREAK THIS
- Never remove the `/api` directory
- Never change vercel.json rewrites without updating API paths
- Always keep sample.csv in public folder
- The mock server in `mockServer.ts` is ONLY for local development

## Testing Locally
The mock server still works locally via `npm run dev`.
For production, Vercel uses the serverless functions.

## Valid Login Codes (from CSV)
- `bG9naW46MTc1MA==` - Franck Nouyrigat (NoCode AI Builder)
- Other codes are base64 encoded: `login:{npid}`