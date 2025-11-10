# EcoTrack Deployment Guide

This guide covers deploying EcoTrack to Google Cloud Run with all necessary infrastructure setup.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Setup](#detailed-setup)
4. [Environment Variables](#environment-variables)
5. [Security Configuration](#security-configuration)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Monitoring & Health Checks](#monitoring--health-checks)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- **Google Cloud Account** with billing enabled
- **Google Cloud SDK** (`gcloud` CLI) installed
- **Docker** installed (for local builds)
- **Git** for version control
- **Node.js 20+** for local development

### Install Google Cloud SDK

```bash
# macOS
brew install google-cloud-sdk

# Linux
curl https://sdk.cloud.google.com | bash

# Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

---

## Quick Start

For a rapid deployment, follow these steps:

```bash
# 1. Set up GCP infrastructure
./scripts/setup-gcp.sh

# 2. Configure secrets
./scripts/setup-secrets.sh

# 3. Deploy to Cloud Run
./scripts/deploy.sh
```

That's it! Your application will be deployed and accessible via the Cloud Run URL.

---

## Detailed Setup

### Step 1: Create Google Cloud Project

```bash
# Create a new project
gcloud projects create ecotrack-prod --name="EcoTrack Production"

# Set as active project
gcloud config set project ecotrack-prod

# Enable billing (required)
# Visit: https://console.cloud.google.com/billing
```

### Step 2: Run Infrastructure Setup

The `setup-gcp.sh` script configures:
- Required Google Cloud APIs
- Service accounts with proper IAM roles
- Firestore database
- Cloud Build permissions

```bash
./scripts/setup-gcp.sh
```

**What it does:**
- Enables APIs: Cloud Run, Cloud Build, Secret Manager, Firestore, Google Maps
- Creates `ecotrack-cloud-run` service account
- Grants necessary IAM roles
- Initializes Firestore database

### Step 3: Configure API Keys

You'll need API keys from:

1. **Google Cloud Console** → APIs & Services → Credentials
   - Create **Google Maps API Key** (enable Routes, Places, Geocoding APIs)
   - Create **OAuth 2.0 Client ID** for Google Sign-In
   - Create **Gemini API Key** from [Google AI Studio](https://makersuite.google.com/app/apikey)

2. **Firebase Console** → Project Settings → Service Accounts
   - Generate new private key for Firebase Admin SDK
   - Copy Project ID, Client Email, and Private Key

3. **NextAuth Secret**
   ```bash
   openssl rand -base64 32
   ```

### Step 4: Store Secrets in Secret Manager

Run the interactive secrets setup:

```bash
./scripts/setup-secrets.sh
```

Or manually create secrets:

```bash
# Example: Create a secret
echo -n "your_api_key_here" | gcloud secrets create GOOGLE_MAPS_API_KEY \
  --data-file=- \
  --replication-policy="automatic"

# Grant access to Cloud Run service account
gcloud secrets add-iam-policy-binding GOOGLE_MAPS_API_KEY \
  --member="serviceAccount:ecotrack-cloud-run@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Step 5: Configure OAuth Redirect URIs

In Google Cloud Console → APIs & Services → Credentials:

1. Select your OAuth 2.0 Client ID
2. Add authorized redirect URIs:
   ```
   https://YOUR_CLOUD_RUN_URL/api/auth/callback/google
   http://localhost:3000/api/auth/callback/google  # For development
   ```

### Step 6: Deploy Application

#### Option A: Manual Deployment

```bash
./scripts/deploy.sh
```

This script:
- Builds Docker image
- Pushes to Google Container Registry
- Deploys to Cloud Run with all configurations

#### Option B: Cloud Build (Automated)

```bash
gcloud builds submit --config cloudbuild.yaml
```

#### Option C: Continuous Deployment (Recommended)

Set up GitHub integration:

```bash
# Connect repository
gcloud builds triggers create github \
  --repo-name=ecotrack \
  --repo-owner=YOUR_GITHUB_USERNAME \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml

# Trigger builds on push to main branch
```

---

## Environment Variables

### Required Secrets (in Secret Manager)

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `GOOGLE_MAPS_API_KEY` | Google Maps API key | Google Cloud Console → Credentials |
| `GEMINI_API_KEY` | Gemini AI API key | [Google AI Studio](https://makersuite.google.com/app/apikey) |
| `NEXTAUTH_SECRET` | NextAuth.js session secret | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID | Google Cloud Console → Credentials |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret | Google Cloud Console → Credentials |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Firebase Console → Project Settings |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin private key | Firebase Console → Service Accounts |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email | Firebase Console → Service Accounts |

### Environment Variables (Set in Cloud Run)

These are automatically set by `deploy.sh` and `cloudbuild.yaml`:

| Variable | Value | Purpose |
|----------|-------|---------|
| `NODE_ENV` | `production` | Enable production optimizations |
| `NEXT_TELEMETRY_DISABLED` | `1` | Disable Next.js telemetry |
| `PORT` | `3000` | Application port (Cloud Run sets this) |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ALLOWED_ORIGINS` | None | Comma-separated list of allowed CORS origins |
| `NEXTAUTH_URL` | Auto-detected | Override NextAuth URL (usually not needed) |

---

## Security Configuration

### Security Headers

The application implements comprehensive security headers via `middleware.ts`:

- **Content Security Policy (CSP)** - Prevents XSS attacks
- **Strict-Transport-Security (HSTS)** - Enforces HTTPS
- **X-Frame-Options** - Prevents clickjacking
- **X-Content-Type-Options** - Prevents MIME sniffing
- **Referrer-Policy** - Controls referrer information
- **Permissions-Policy** - Restricts browser features

### Rate Limiting

API routes use in-memory rate limiting:
- **Default:** 60 requests per minute per IP
- **Health Check:** Unlimited
- **Plan Trip:** 20 requests per minute per IP

To customize rate limits, edit `lib/utils/rateLimit.ts`.

### CORS Configuration

CORS is configured in middleware for API routes:
- Development: All origins allowed
- Production: Only origins in `ALLOWED_ORIGINS` environment variable

```bash
# Set allowed origins
gcloud run services update ecotrack \
  --update-env-vars ALLOWED_ORIGINS="https://yourdomain.com,https://app.yourdomain.com"
```

### Service Account Permissions

The Cloud Run service account has minimal required permissions:
- `roles/secretmanager.secretAccessor` - Access secrets
- `roles/datastore.user` - Firestore read/write
- `roles/logging.logWriter` - Write logs
- `roles/cloudtrace.agent` - Distributed tracing
- `roles/monitoring.metricWriter` - Custom metrics

---

## CI/CD Pipeline

### GitHub Actions Setup

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - id: auth
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1

      - name: Build and Deploy
        run: |
          gcloud builds submit --config cloudbuild.yaml
```

### Cloud Build Triggers

Automated deployment on Git push:

```bash
gcloud builds triggers create github \
  --name="deploy-ecotrack-main" \
  --repo-name=ecotrack \
  --repo-owner=YOUR_USERNAME \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

### Deployment Configuration

Customize deployment in `cloudbuild.yaml`:

```yaml
substitutions:
  _CLOUD_RUN_REGION: 'us-central1'    # Deployment region
  _MEMORY: '1Gi'                       # Container memory
  _CPU: '1'                            # CPU allocation
  _MIN_INSTANCES: '0'                  # Minimum instances (0 = scale to zero)
  _MAX_INSTANCES: '10'                 # Maximum instances
  _TIMEOUT: '300s'                     # Request timeout
  _CONCURRENCY: '80'                   # Concurrent requests per instance
```

---

## Monitoring & Health Checks

### Health Check Endpoint

The application includes a comprehensive health check at `/api/health`:

```bash
# Check service health
curl https://YOUR_CLOUD_RUN_URL/api/health

# Simple ping (HEAD request)
curl -I https://YOUR_CLOUD_RUN_URL/api/health
```

**Health check includes:**
- Service configuration status (Google Maps, Gemini, Firebase, Auth)
- Database connectivity
- Performance metrics
- Functionality tests
- Recommendations for missing configuration

### Cloud Run Health Checks

Cloud Run automatically configures health checks using:
- **Endpoint:** `/api/health`
- **Method:** HEAD or GET
- **Expected Status:** 200 (healthy) or 503 (unhealthy)
- **Interval:** 30 seconds
- **Timeout:** 3 seconds

### Monitoring Dashboard

View metrics in Google Cloud Console:

```
Navigation → Cloud Run → ecotrack → Metrics
```

**Key metrics:**
- Request count
- Request latency
- Container instance count
- CPU utilization
- Memory utilization
- Error rate

### Logging

View application logs:

```bash
# Via gcloud CLI
gcloud run services logs read ecotrack --region us-central1

# Or in Cloud Console
Navigation → Cloud Run → ecotrack → Logs
```

### Alerts

Set up Cloud Monitoring alerts:

```bash
# Example: Alert on high error rate
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="EcoTrack High Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=5 \
  --condition-threshold-duration=300s
```

---

## Troubleshooting

### Common Issues

#### 1. Deployment Fails - Permission Denied

**Error:** `Permission denied when deploying to Cloud Run`

**Solution:**
```bash
# Grant Cloud Build service account Cloud Run Admin role
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"
```

#### 2. Application Shows "Unhealthy" Status

**Error:** Health check returns 503

**Solution:**
1. Check `/api/health` endpoint response for details
2. Verify all required secrets are set
3. Ensure Firebase is properly configured
4. Check Cloud Run logs for errors

```bash
# View detailed health status
curl https://YOUR_CLOUD_RUN_URL/api/health | jq .
```

#### 3. OAuth Sign-In Fails

**Error:** "Redirect URI mismatch"

**Solution:**
1. Get your Cloud Run URL:
   ```bash
   gcloud run services describe ecotrack --region us-central1 --format="value(status.url)"
   ```
2. Add to OAuth authorized redirect URIs:
   ```
   https://YOUR_CLOUD_RUN_URL/api/auth/callback/google
   ```
3. Update NEXTAUTH_URL secret if needed

#### 4. Database Connection Errors

**Error:** "Failed to connect to Firestore"

**Solution:**
1. Verify Firestore is initialized:
   ```bash
   gcloud firestore databases describe --database="(default)"
   ```
2. Check service account has `datastore.user` role
3. Verify Firebase credentials in Secret Manager

#### 5. Rate Limit Issues

**Error:** "Too many requests (429)"

**Solution:**
- Wait for rate limit window to reset (1 minute)
- Increase rate limits in `lib/utils/rateLimit.ts`
- For production, consider Redis-backed rate limiting

### Performance Optimization

#### Cold Starts

Reduce cold start time:

```bash
# Set minimum instances to 1 (keeps container warm)
gcloud run services update ecotrack \
  --min-instances=1 \
  --region=us-central1
```

**Note:** This increases costs as you pay for idle instances.

#### Memory and CPU

Adjust resources based on load:

```bash
# Increase memory and CPU
gcloud run services update ecotrack \
  --memory=2Gi \
  --cpu=2 \
  --region=us-central1
```

#### Concurrent Requests

Optimize for your use case:

```bash
# Handle more concurrent requests per instance
gcloud run services update ecotrack \
  --concurrency=100 \
  --region=us-central1
```

### Scaling Configuration

```bash
# Auto-scale based on traffic
gcloud run services update ecotrack \
  --min-instances=0 \
  --max-instances=100 \
  --concurrency=80 \
  --cpu-throttling \
  --region=us-central1
```

---

## Production Checklist

Before going live, ensure:

- [ ] All secrets are configured in Secret Manager
- [ ] OAuth redirect URIs are updated with production URL
- [ ] Custom domain configured (optional)
- [ ] SSL/TLS certificate provisioned (automatic with Cloud Run)
- [ ] Health checks passing (200 OK)
- [ ] Monitoring and alerting configured
- [ ] Error tracking set up (e.g., Sentry)
- [ ] Load testing completed
- [ ] Backup strategy for Firestore data
- [ ] Rate limits configured appropriately
- [ ] CORS origins restricted in production
- [ ] Security headers verified
- [ ] Cost budgets and alerts set

---

## Cost Estimation

**Cloud Run Pricing** (us-central1 region):
- **CPU:** $0.00002400 per vCPU-second
- **Memory:** $0.00000250 per GiB-second
- **Requests:** $0.40 per million requests

**Example Monthly Cost** (estimated):
- 100,000 requests/month
- Average 500ms response time
- 1 vCPU, 1 GiB memory
- ~$5-10/month

**Additional Costs:**
- Google Maps API: Pay-as-you-go (free tier available)
- Gemini API: Pay-as-you-go
- Firestore: Free tier includes 50K reads, 20K writes/day
- Secret Manager: $0.06 per secret version per month

**Cost Optimization:**
- Use minimum instances only if needed
- Implement caching for API responses
- Optimize Docker image size
- Monitor and set budget alerts

---

## Support

- **Documentation:** [Cloud Run Docs](https://cloud.google.com/run/docs)
- **Community:** [Stack Overflow](https://stackoverflow.com/questions/tagged/google-cloud-run)
- **Issues:** Report issues in GitHub repository

---

## License

See LICENSE file for details.
