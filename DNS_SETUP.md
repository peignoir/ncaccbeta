# DNS Configuration for ncacc.nocap.so

## For Your Friend Managing DNS

To point `ncacc.nocap.so` to your Vercel production deployment, they need to add these DNS records:

### Option 1: CNAME Record (Recommended)
```
Type: CNAME
Name: ncacc
Value: cname.vercel-dns.com
TTL: 3600 (or Auto)
```

### Option 2: A Records (If CNAME not possible)
```
Type: A
Name: ncacc
Value: 76.76.21.21
TTL: 3600 (or Auto)
```

## Steps After DNS is Configured

1. **In Vercel Dashboard:**
   - Go to your production project (create it first if not done)
   - Go to Settings → Domains
   - Add `ncacc.nocap.so`
   - Vercel will verify the DNS and issue SSL certificate

2. **Create Production Project in Vercel:**
   - Import the same GitHub repo
   - Name it something like `ncacc-dashboard-prod`
   - Set environment variable: `VITE_ENVIRONMENT = production`
   - Connect to `main` branch only

3. **Deploy:**
   - The push we just made will automatically deploy once the project is created
   - Or manually trigger a deployment from Vercel dashboard

## Verification

Once DNS propagates (5-30 minutes typically):
- Visit https://ncacc.nocap.so
- Check browser console: `console.log(import.meta.env.VITE_ENVIRONMENT)` should show `production`
- The app should connect to `https://api.socap.ai` (production API)

## Current Setup Status

✅ **Development**: `ncaccbeta.vercel.app` (already working)
⏳ **Production**: Waiting for:
  1. Vercel production project creation
  2. DNS configuration for `ncacc.nocap.so`

## Quick Reference

- **Dev URL**: https://ncaccbeta.vercel.app (connects to dev.socap.ai)
- **Prod URL**: https://ncacc.nocap.so (will connect to api.socap.ai)
- **GitHub**: Push to `main` for production, `develop` for dev