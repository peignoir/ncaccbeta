# Deployment Guide - Two Vercel Instances

This project is configured to deploy to two separate Vercel instances: Development and Production.

## Setup Overview

### 1. Environment Configuration
The app uses environment variables to determine which API to connect to:
- **Development**: `https://dev.socap.ai`
- **Production**: `https://api.socap.ai`

Configuration is in `src/config/environment.ts` and reads from `VITE_ENVIRONMENT` env variable.

### 2. Vercel Projects Setup

You'll need TWO separate Vercel projects:

#### Production Project
1. Create a new Vercel project: `ncacc-dashboard-prod`
2. Set environment variable: `VITE_ENVIRONMENT = production`
3. Connect to `main` branch

#### Development Project (ncaccbeta.vercel.app)
1. Existing Vercel project: `ncaccbeta`
2. Set environment variable: `VITE_ENVIRONMENT = development`
3. Connect to `develop` branch

## Manual Deployment (Vercel CLI)

### Install Vercel CLI
```bash
npm i -g vercel
```

### Deploy to Development
```bash
VITE_ENVIRONMENT=development vercel --prod --project=ncaccbeta
```

### Deploy to Production
```bash
VITE_ENVIRONMENT=production vercel --prod --project=ncacc-dashboard-prod
```

## Automatic Deployment (GitHub Actions)

The `.github/workflows/deploy.yml` file is configured for automatic deployments.

### Required GitHub Secrets
Add these secrets in your GitHub repository settings:

1. `VERCEL_TOKEN` - Your Vercel personal access token
2. `VERCEL_ORG_ID` - Your Vercel organization ID
3. `VERCEL_PROJECT_ID_PROD` - Production project ID
4. `VERCEL_PROJECT_ID_DEV` - Development project ID

### How to Get These Values:

1. **Vercel Token**: 
   - Go to https://vercel.com/account/tokens
   - Create a new token

2. **Organization & Project IDs**:
   ```bash
   # Link to your project first
   vercel link
   
   # The .vercel/project.json file will contain:
   # - orgId (VERCEL_ORG_ID)
   # - projectId (VERCEL_PROJECT_ID_*)
   ```

### Deployment Flow
- Push to `main` → Deploys to Production with `VITE_ENVIRONMENT=production`
- Push to `develop` → Deploys to Development with `VITE_ENVIRONMENT=development`

## Vercel Dashboard Setup

### For Each Project:

1. **Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add: `VITE_ENVIRONMENT` with value `production` or `development`

2. **Git Integration**:
   - Production: Connect to `main` branch only
   - Development: Connect to `develop` branch only

3. **Domains**:
   - Production: `ncacc.yourdomain.com` (to be configured)
   - Development: `ncaccbeta.vercel.app` (existing)

## Testing the Setup

### Verify Environment:
```javascript
// In browser console after deployment
console.log(import.meta.env.VITE_ENVIRONMENT)
// Should show 'production' or 'development'
```

### Check API URLs:
The app should connect to:
- Dev deployment → `https://dev.socap.ai`
- Prod deployment → `https://api.socap.ai`

## Troubleshooting

### Environment Variable Not Working?
- Ensure variable name starts with `VITE_` (required by Vite)
- Rebuild after changing environment variables
- Clear browser cache

### Wrong API URL?
Check `src/config/environment.ts` - the environment detection should show:
```typescript
environment: (import.meta.env.VITE_ENVIRONMENT || 'development')
```

### Deployment Failing?
- Verify all GitHub secrets are set correctly
- Check Vercel project IDs match
- Ensure branches exist (`main` and `develop`)