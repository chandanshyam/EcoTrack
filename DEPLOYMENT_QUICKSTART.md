# EcoTrack Deployment Quick Start

Get EcoTrack deployed to Google Cloud Run in 10 minutes.

## Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed and authenticated
- Docker installed (for manual deployments)

## Step-by-Step Deployment

### 1. Clone and Navigate

```bash
git clone <your-repo-url>
cd EcoTrack-1
```

### 2. Set GCP Project

```bash
# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Or create a new project
gcloud projects create ecotrack-prod --name="EcoTrack Production"
gcloud config set project ecotrack-prod
```

### 3. Run Setup Scripts

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Set up GCP infrastructure
./scripts/setup-gcp.sh

# Configure secrets (interactive)
./scripts/setup-secrets.sh
```

**You'll need these credentials:**
- Google Maps API key ([Get here](https://console.cloud.google.com/apis/credentials))
- Gemini API key ([Get here](https://makersuite.google.com/app/apikey))
- Google OAuth Client ID & Secret ([Create here](https://console.cloud.google.com/apis/credentials))
- Firebase credentials ([Download here](https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk))
- NextAuth secret (generate with `openssl rand -base64 32`)

### 4. Deploy Application

```bash
# Deploy to Cloud Run
./scripts/deploy.sh
```

### 5. Configure OAuth Redirect

After deployment, get your Cloud Run URL:

```bash
gcloud run services describe ecotrack --region us-central1 --format="value(status.url)"
```

Add this URL to your Google OAuth authorized redirect URIs:
- Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
- Select your OAuth 2.0 Client ID
- Add redirect URI: `https://YOUR_CLOUD_RUN_URL/api/auth/callback/google`

### 6. Verify Deployment

```bash
# Check health
curl https://YOUR_CLOUD_RUN_URL/api/health

# Or visit in browser
open https://YOUR_CLOUD_RUN_URL
```

## Automated Deployment (CI/CD)

### GitHub Actions Setup

1. **Create GCP Service Account Key:**

```bash
# Create service account for GitHub Actions
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# Grant necessary roles
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Download key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

2. **Add GitHub Secrets:**

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `GCP_PROJECT_ID`: Your GCP project ID
- `GCP_SA_KEY`: Contents of `github-actions-key.json` file

3. **Push to Main Branch:**

```bash
git push origin main
```

GitHub Actions will automatically deploy to Cloud Run on every push to `main`.

## Configuration

### Environment Variables

Secrets are managed in Google Cloud Secret Manager. To update:

```bash
# Update a secret
echo -n "new_value" | gcloud secrets versions add SECRET_NAME --data-file=-

# Example: Update Maps API key
echo -n "AIza..." | gcloud secrets versions add GOOGLE_MAPS_API_KEY --data-file=-
```

### Scaling Configuration

```bash
# Adjust scaling parameters
gcloud run services update ecotrack \
  --min-instances=1 \
  --max-instances=50 \
  --memory=2Gi \
  --cpu=2 \
  --region=us-central1
```

### Custom Domain

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service=ecotrack \
  --domain=app.yourdomain.com \
  --region=us-central1
```

## Monitoring

### View Logs

```bash
# Stream logs
gcloud run services logs tail ecotrack --region=us-central1

# View recent logs
gcloud run services logs read ecotrack --region=us-central1 --limit=50
```

### Check Metrics

Visit [Cloud Run Console](https://console.cloud.google.com/run) to view:
- Request count
- Latency
- Error rate
- Instance count
- CPU/Memory usage

### Health Check

```bash
# Detailed health status
curl https://YOUR_CLOUD_RUN_URL/api/health | jq '.'

# Simple ping
curl -I https://YOUR_CLOUD_RUN_URL/api/health
```

## Troubleshooting

### Health Check Failing

```bash
# Check logs for errors
gcloud run services logs read ecotrack --region=us-central1

# Verify secrets are set
gcloud secrets list

# Test health endpoint
curl https://YOUR_CLOUD_RUN_URL/api/health | jq '.services'
```

### OAuth Sign-In Not Working

1. Verify redirect URIs in Google Cloud Console
2. Check NEXTAUTH_URL matches your Cloud Run URL
3. Ensure NEXTAUTH_SECRET is set

### Deployment Fails

```bash
# Check Cloud Build logs
gcloud builds list --limit=5

# View specific build
gcloud builds log BUILD_ID
```

## Cost Optimization

```bash
# Enable scale-to-zero
gcloud run services update ecotrack \
  --min-instances=0 \
  --region=us-central1

# Reduce resources if traffic is low
gcloud run services update ecotrack \
  --memory=512Mi \
  --cpu=1 \
  --region=us-central1
```

## Next Steps

- [ ] Set up monitoring alerts
- [ ] Configure custom domain
- [ ] Enable Cloud CDN for static assets
- [ ] Set up Cloud Armor for DDoS protection
- [ ] Implement database backups
- [ ] Configure error tracking (Sentry, etc.)

## Support

For detailed documentation, see [DEPLOYMENT.md](./DEPLOYMENT.md).

For issues, check the [GitHub repository](https://github.com/yourusername/ecotrack/issues).
