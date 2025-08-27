# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server (typically runs on port 5173-5175)
- `npm run build` - Build for production (TypeScript + Vite)
- `npm run preview` - Preview production build locally

### Testing & Linting
**NOT CONFIGURED** - No test runner or linter currently set up. Do not attempt to run `npm test` or `npm run lint`.

## Architecture Overview

### Mock API System (Critical to Understand)

This app uses a **dual API strategy** that MUST be kept in sync:

1. **Development**: Client-side fetch interceptor in `src/lib/mockServer.ts`
   - Intercepts all `/api/*` calls
   - Reads from `/public/sample.csv` 
   - Uses `mockPersistence.ts` for localStorage persistence

2. **Production**: Vercel serverless functions in `/api/` directory
   - Real HTTP endpoints at `/api/*`
   - Directly modifies `/public/sample.csv` files
   - Must manually sync changes with mockServer.ts

**IMPORTANT**: When modifying API behavior, update BOTH `src/lib/mockServer.ts` AND the corresponding `/api/*.js` file.

### Data Persistence Strategy

The app uses a three-layer data system:
1. **CSV Files** (`/public/sample.csv`) - Source of truth
2. **mockPersistence** - Stores complete records in localStorage (not deltas!)
3. **Runtime State** - React component state

**Key Pattern**: Always store complete objects, never partial updates:
```typescript
// CORRECT
mockPersistence.saveStartup(id, { ...fullStartupData })

// WRONG - Will cause data loss
mockPersistence.saveStartup(id, { stealth: true })
```

### Authentication Flow

Login uses base64-encoded codes:
- Format: `btoa('login:{npid}')` → `bG9naW46MTc1MA==`
- Matches against CSV `login_code` column OR computed code
- Mock JWT tokens with 15-minute expiry simulation

### Boolean Field Handling

CSV stores booleans as strings. Always handle both types:
```typescript
// Check for boolean true, string 'true', or string '1'
const isTrue = value === true || value === 'true' || value === '1'

// When saving to CSV
csvData[key] = booleanValue ? 'true' : 'false'
```

### House System

Four startup categories with theme colors:
- `venture` (purple) - High-growth startups
- `karma` (green) - Impact/social good
- `lifestyle` (blue) - Lifestyle businesses  
- `side` (orange) - Side projects

### Privacy Features

Two privacy flags control data visibility:
- `stealth`: When true, hides all startup details (shows "Stealth Startup")
- `contact_me`: Controls visibility of email/telegram/LinkedIn in member profiles

### Circle System

Peer mentoring groups with special handling:
- Circles should have 3-7 members (never less than 3)
- Meeting links generated deterministically from circle ID
- Member data includes conditional contact info based on `contact_me` flag

## Common Pitfalls

1. **Never assume API endpoint exists** - Check both mockServer.ts and /api/ directory
2. **Boolean values from CSV are strings** - Always coerce properly
3. **Persistence requires full objects** - Don't save partial updates
4. **CORS is manual in production** - Each /api/*.js file needs CORS headers
5. **No database** - Everything is CSV-based, including in production

## Project Context

This is an NC/ACC startup accelerator dashboard for tracking founder progress. Key features:
- Progress tracking with detailed metrics
- Peer mentoring circles with meeting coordination
- Privacy controls for stealth startups
- Multi-wave cohort support
- House-based categorization and theming

When making changes, prioritize:
1. Data persistence reliability
2. Privacy/stealth mode consistency
3. API contract synchronization between dev/prod
4. CSV data integrity