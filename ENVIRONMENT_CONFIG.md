# Environment Configuration

## Quick Start

To switch between development and production APIs, edit `src/config/environment.ts`:

```typescript
export const ENV_CONFIG = {
  // Change this line to switch environments:
  environment: 'development',  // or 'production'
  
  apiUrls: {
    development: 'https://dev.socap.ai',
    production: 'https://api.socap.ai'  // Update with your prod URL
  }
}
```

## Switching Environments

### For Development (default):
```typescript
environment: 'development'
```
- Uses: `https://dev.socap.ai`
- Debug mode enabled
- Verbose logging

### For Production:
```typescript
environment: 'production'
```
- Uses: `https://api.socap.ai` (or your custom prod URL)
- Debug mode disabled
- Minimal logging

## Deployment Steps

1. **Edit the config file:**
   ```bash
   # Open src/config/environment.ts
   # Change environment to 'production'
   # Update production URL if needed
   ```

2. **Build for production:**
   ```bash
   npm run build
   ```

3. **Deploy to Vercel:**
   ```bash
   git add -A
   git commit -m "Switch to production environment"
   git push origin main
   ```

## API URLs by Environment

| Environment | API URL | Purpose |
|------------|---------|---------|
| development | https://dev.socap.ai | Testing and development |
| production | https://api.socap.ai | Live production data |

## Special API Keys

- **`pofpof`** - Returns mock data (works in any environment)
- **Real API keys** - Connect to the configured API URL

## Testing Different Environments Locally

```bash
# Test with dev API
npm run dev

# Edit src/config/environment.ts to switch to production
# Then test with prod API
npm run dev
```

## Notes

- The environment setting is compiled into the build
- You must rebuild after changing environments
- Vercel will use whatever environment is committed to the repository
- Consider using separate branches for dev/prod if needed