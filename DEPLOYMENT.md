# EcoTrack Deployment Guide

Complete guide for deploying EcoTrack to Google Cloud Run with CI/CD automation.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Google Cloud Setup](#google-cloud-setup)
- [Secret Management](#secret-management)
- [Deployment Options](#deployment-options)
  - [Option 1: Manual Deployment](#option-1-manual-deployment-script)
  - [Option 2: GitHub Actions CI/CD](#option-2-github-actions-cicd)
  - [Option 3: Cloud Build Trigger](#option-3-cloud-build-trigger)
- [Post-Deployment](#post-deployment)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts & Tools

- ✅ Google Cloud Platform account with billing enabled
- ✅ GitHub account (for CI/CD)
- ✅ Google Maps API key
- ✅ Gemini API key
- ✅ Firebase/Firestore project
- ✅ Google OAuth credentials
- ✅ gcloud CLI installed ([Install Guide](https://cloud.google.com/sdk/docs/install))
- ✅ Docker installed ([Install Guide](https://docs.docker.com/get-docker/))
- ✅ Node.js 18+ and npm

### Enable Required Google Cloud APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com
```

---

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-username/ecotrack.git
cd ecotrack
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Local Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials (see `.env.example` for all required variables).

### 4. Run Locally

```bash
npm run dev
```

Visit http://localhost:3000

### 5. Run Tests

```bash
npm test
```

### 6. Build for Production

```bash
npm run build
```

---

## Google Cloud Setup

### 1. Set Project Variables

```bash
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"
export SERVICE_NAME="ecotrack"
export SERVICE_ACCOUNT="ecotrack-cloud-run"

gcloud config set project $PROJECT_ID
```

### 2. Create Service Account

```bash
# Create service account for Cloud Run
gcloud iam service-accounts create $SERVICE_ACCOUNT \
  --display-name="EcoTrack Cloud Run Service Account" \
  --project=$PROJECT_ID

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
```

### 3. Configure Docker Authentication

```bash
gcloud auth configure-docker
```

---

## Secret Management

### Store Secrets in Google Secret Manager

**IMPORTANT:** Never commit secrets to git. Use Google Secret Manager for production.

```bash
PROJECT_ID="your-project-id"

# Google Maps API Key (Client-side)
echo -n "YOUR_GOOGLE_MAPS_API_KEY" | gcloud secrets create NEXT_PUBLIC_GOOGLE_MAPS_API_KEY \
  --data-file=- \
  --replication-policy="automatic" \
  --project="$PROJECT_ID"

# Google Maps API Key (Server-side)
echo -n "YOUR_GOOGLE_MAPS_API_KEY" | gcloud secrets create GOOGLE_MAPS_API_KEY \
  --data-file=- \
  --replication-policy="automatic" \
  --project="$PROJECT_ID"

# Gemini API Key
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create GEMINI_API_KEY \
  --data-file=- \
  --replication-policy="automatic" \
  --project="$PROJECT_ID"

# NextAuth Secret (generate with: openssl rand -base64 32)
echo -n "YOUR_NEXTAUTH_SECRET" | gcloud secrets create NEXTAUTH_SECRET \
  --data-file=- \
  --replication-policy="automatic" \
  --project="$PROJECT_ID"

# NextAuth URL (your Cloud Run URL)
echo -n "https://YOUR_CLOUD_RUN_URL.run.app" | gcloud secrets create NEXTAUTH_URL \
  --data-file=- \
  --replication-policy="automatic" \
  --project="$PROJECT_ID"

# Google OAuth Credentials
echo -n "YOUR_GOOGLE_CLIENT_ID" | gcloud secrets create GOOGLE_CLIENT_ID \
  --data-file=- \
  --replication-policy="automatic" \
  --project="$PROJECT_ID"

echo -n "YOUR_GOOGLE_CLIENT_SECRET" | gcloud secrets create GOOGLE_CLIENT_SECRET \
  --data-file=- \
  --replication-policy="automatic" \
  --project="$PROJECT_ID"

# Firebase Credentials
echo -n "YOUR_FIREBASE_PROJECT_ID" | gcloud secrets create FIREBASE_PROJECT_ID \
  --data-file=- \
  --replication-policy="automatic" \
  --project="$PROJECT_ID"

echo -n "YOUR_FIREBASE_CLIENT_EMAIL" | gcloud secrets create FIREBASE_CLIENT_EMAIL \
  --data-file=- \
  --replication-policy="automatic" \
  --project="$PROJECT_ID"

echo -n "YOUR_FIREBASE_PRIVATE_KEY" | gcloud secrets create FIREBASE_PRIVATE_KEY \
  --data-file=- \
  --replication-policy="automatic" \
  --project="$PROJECT_ID"
```

### Grant Service Account Access to Secrets

```bash
SERVICE_ACCOUNT="ecotrack-cloud-run@${PROJECT_ID}.iam.gserviceaccount.com"

for SECRET in GOOGLE_MAPS_API_KEY GEMINI_API_KEY NEXT_PUBLIC_GOOGLE_MAPS_API_KEY \
              NEXTAUTH_SECRET NEXTAUTH_URL GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET \
              FIREBASE_PROJECT_ID FIREBASE_PRIVATE_KEY FIREBASE_CLIENT_EMAIL; do
  gcloud secrets add-iam-policy-binding "$SECRET" \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$PROJECT_ID"
done
```

---

## Deployment Options

### Option 1: Manual Deployment (Script)

Use the provided deployment script for quick manual deployments.

```bash
# Make script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh
```

**What it does:**
- Authenticates with Google Cloud
- Fetches secrets from Secret Manager
- Builds Docker image
- Pushes to Google Container Registry
- Deploys to Cloud Run
- Configures service with secrets

**Configuration:** Edit `scripts/deploy.sh` to customize:
- Region
- Memory/CPU limits
- Min/max instances
- Timeout settings

---

### Option 2: GitHub Actions CI/CD

Automated deployment on every push to `main` branch.

#### Setup Steps

1. **Create GitHub Secrets**

   Go to: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

   Add these secrets:
   ```
   GCP_PROJECT_ID          # Your Google Cloud project ID
   GCP_SA_KEY              # Service account JSON key (see below)
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY  # For build-time injection
   ```

2. **Create Service Account for GitHub Actions**

   ```bash
   # Create service account
   gcloud iam service-accounts create github-actions-deploy \
     --display-name="GitHub Actions Deploy" \
     --project=$PROJECT_ID

   # Grant necessary roles
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:github-actions-deploy@${PROJECT_ID}.iam.gserviceaccount.com" \
     --role="roles/run.admin"

   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:github-actions-deploy@${PROJECT_ID}.iam.gserviceaccount.com" \
     --role="roles/storage.admin"

   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:github-actions-deploy@${PROJECT_ID}.iam.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"

   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:github-actions-deploy@${PROJECT_ID}.iam.gserviceaccount.com" \
     --role="roles/iam.serviceAccountUser"

   # Create and download key
   gcloud iam service-accounts keys create github-sa-key.json \
     --iam-account=github-actions-deploy@${PROJECT_ID}.iam.gserviceaccount.com \
     --project=$PROJECT_ID

   # Convert to base64 and add to GitHub secrets as GCP_SA_KEY
   cat github-sa-key.json | base64
   ```

3. **Workflow is Ready**

   The workflow file is already configured at `.github/workflows/deploy.yml`

   It will:
   - ✅ Run tests
   - ✅ Build Docker image
   - ✅ Push to Container Registry
   - ✅ Deploy to Cloud Run
   - ✅ Configure secrets

4. **Trigger Deployment**

   ```bash
   git add .
   git commit -m "feat: trigger deployment"
   git push origin main
   ```

   Monitor at: `Actions` tab in GitHub

---

### Option 3: Cloud Build Trigger

Deploy automatically from GitHub using Google Cloud Build.

#### Setup Steps

1. **Connect GitHub Repository**

   ```bash
   # Connect your repo (follow prompts)
   gcloud builds connections create github "github-connection" \
     --region=$REGION
   ```

2. **Create Cloud Build Trigger**

   ```bash
   gcloud builds triggers create github \
     --name="ecotrack-deploy" \
     --repo-name="ecotrack" \
     --repo-owner="your-github-username" \
     --branch-pattern="^main$" \
     --build-config="cloudbuild.yaml" \
     --region=$REGION
   ```

3. **Configuration**

   The `cloudbuild.yaml` file is already set up with:
   - Docker image building
   - Secret Manager integration
   - Cloud Run deployment

4. **Trigger Deployment**

   Just push to `main` branch:
   ```bash
   git push origin main
   ```

   Monitor at: [Cloud Build Console](https://console.cloud.google.com/cloud-build)

---

## Post-Deployment

### 1. Get Service URL

```bash
gcloud run services describe ecotrack \
  --region=$REGION \
  --format='value(status.url)'
```

### 2. Update OAuth Redirect URIs

Add your Cloud Run URL to Google OAuth consent screen:

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client ID
3. Add authorized redirect URI:
   ```
   https://YOUR_CLOUD_RUN_URL.run.app/api/auth/callback/google
   ```

### 3. Update NextAuth URL Secret

```bash
SERVICE_URL=$(gcloud run services describe ecotrack --region=$REGION --format='value(status.url)')

echo -n "$SERVICE_URL" | gcloud secrets versions add NEXTAUTH_URL \
  --data-file=- \
  --project=$PROJECT_ID
```

### 4. Test Deployment

```bash
curl https://YOUR_CLOUD_RUN_URL.run.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "googleMaps": "available",
    "gemini": "available"
  }
}
```

### 5. Configure Custom Domain (Optional)

```bash
gcloud run domain-mappings create \
  --service=ecotrack \
  --domain=yourdomain.com \
  --region=$REGION
```

---

## Monitoring & Logs

### View Logs

```bash
# Real-time logs
gcloud run services logs tail ecotrack --region=$REGION

# Filter by severity
gcloud run services logs read ecotrack \
  --region=$REGION \
  --filter="severity>=ERROR"
```

### View Metrics

Visit [Cloud Run Console](https://console.cloud.google.com/run) to monitor:
- Request count
- Response times
- Error rates
- Container CPU/Memory usage

### Set Up Alerts

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

## Scaling Configuration

### Auto-scaling Settings

The deployment is configured with:
- **Min instances:** 0 (scale to zero when idle)
- **Max instances:** 10
- **CPU:** 1 vCPU
- **Memory:** 1GB
- **Concurrency:** 80 requests per container

### Adjust Scaling

```bash
gcloud run services update ecotrack \
  --region=$REGION \
  --min-instances=1 \
  --max-instances=20 \
  --cpu=2 \
  --memory=2Gi \
  --concurrency=100
```

---

## Security Best Practices

### 1. API Key Restrictions

**Google Maps API Key (Client-side):**
- Application restrictions: HTTP referrers
- Website restrictions:
  ```
  https://YOUR_CLOUD_RUN_URL.run.app/*
  http://localhost:3000/*
  ```
- API restrictions: Enable only required APIs
  - Maps JavaScript API
  - Places API
  - Geocoding API
  - Routes API

**Google Maps API Key (Server-side):**
- No HTTP referrer restrictions
- API restrictions: Same as above
- Consider IP restrictions if using fixed IPs

### 2. Rotate Secrets Regularly

```bash
# Example: Rotate NextAuth secret
NEW_SECRET=$(openssl rand -base64 32)
echo -n "$NEW_SECRET" | gcloud secrets versions add NEXTAUTH_SECRET \
  --data-file=- \
  --project=$PROJECT_ID
```

### 3. Monitor API Usage

Set up billing alerts:
1. Go to [Billing Alerts](https://console.cloud.google.com/billing/alerts)
2. Create alerts for unusual API usage spikes

### 4. Enable Cloud Armor (Optional)

For DDoS protection:
```bash
gcloud compute security-policies create ecotrack-policy \
  --description="EcoTrack security policy"
```

---

## Troubleshooting

### Common Issues

#### 1. Deployment Fails with "Permission Denied"

**Solution:** Ensure service account has required roles:
```bash
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:ecotrack-cloud-run@*"
```

#### 2. "Secret not found" Error

**Solution:** Verify secrets exist and service account has access:
```bash
gcloud secrets list --project=$PROJECT_ID
gcloud secrets get-iam-policy SECRET_NAME --project=$PROJECT_ID
```

#### 3. Container Fails to Start

**Solution:** Check logs:
```bash
gcloud run services logs read ecotrack \
  --region=$REGION \
  --limit=50
```

Common causes:
- Missing environment variables
- Incorrect port configuration (should be 3000)
- Build errors

#### 4. "Service Unavailable" or 503 Errors

**Solution:**
- Check if service scaled to zero and needs cold start
- Increase memory/CPU allocation
- Check for application errors in logs

#### 5. API Calls Failing in Production

**Solution:**
- Verify API keys are properly set in Secret Manager
- Check API key restrictions match Cloud Run URL
- Ensure billing is enabled for APIs

#### 6. Authentication Not Working

**Solution:**
- Verify OAuth redirect URIs include your Cloud Run URL
- Check NEXTAUTH_URL secret matches actual service URL
- Ensure NEXTAUTH_SECRET is properly set

### Debug Checklist

- [ ] All secrets created in Secret Manager
- [ ] Service account has secretAccessor role
- [ ] OAuth redirect URIs updated with Cloud Run URL
- [ ] API keys have proper restrictions
- [ ] Cloud Run service has correct environment variables
- [ ] Logs show no critical errors
- [ ] Health endpoint returns 200

---

## Rollback

### Rollback to Previous Revision

```bash
# List revisions
gcloud run revisions list --service=ecotrack --region=$REGION

# Rollback to specific revision
gcloud run services update-traffic ecotrack \
  --to-revisions=REVISION_NAME=100 \
  --region=$REGION
```

### Emergency Rollback (Quick)

```bash
# Route traffic to previous revision
gcloud run services update-traffic ecotrack \
  --to-revisions=LATEST=0,PREVIOUS=100 \
  --region=$REGION
```

---

## Cost Optimization

### Estimated Monthly Costs

**Cloud Run (with low-medium traffic):**
- Free tier: 2M requests/month, 360K GB-seconds, 180K vCPU-seconds
- Beyond free tier: ~$0.40 per million requests

**APIs:**
- Google Maps API: Pay-as-you-go (check pricing)
- Gemini API: Pay-as-you-go
- Firestore: 50K reads/day free

**Total estimated:** $10-50/month for small-medium usage

### Cost Reduction Tips

1. **Scale to zero when idle**
   ```bash
   --min-instances=0
   ```

2. **Use caching** for repeated API calls

3. **Set API quotas** to prevent unexpected charges

4. **Monitor usage** with billing alerts

5. **Optimize Docker image size** to reduce storage costs

---

## Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Google Maps API Documentation](https://developers.google.com/maps/documentation)
- [Gemini API Documentation](https://ai.google.dev/docs)

---

## Support

For deployment issues:
1. Check [Troubleshooting](#troubleshooting) section
2. Review Cloud Run logs
3. Open an issue on GitHub
4. Contact project maintainers

---

**Last Updated:** 2025-11-10
**Version:** 1.0.0
