#!/bin/bash

# EcoTrack - Manual Deployment Script for Cloud Run
# This script builds and deploys the application to Google Cloud Run

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGION="${CLOUD_RUN_REGION:-us-central1}"
SERVICE_NAME="ecotrack"
MEMORY="${MEMORY:-1Gi}"
CPU="${CPU:-1}"
MIN_INSTANCES="${MIN_INSTANCES:-0}"
MAX_INSTANCES="${MAX_INSTANCES:-10}"
TIMEOUT="${TIMEOUT:-300}"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   EcoTrack Cloud Run Deployment       ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: No GCP project selected${NC}"
    echo "Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "${GREEN}Project ID: $PROJECT_ID${NC}"
echo -e "${GREEN}Region: $REGION${NC}"
echo -e "${GREEN}Service: $SERVICE_NAME${NC}"
echo ""

# Enable required APIs
echo -e "${YELLOW}Enabling required Google Cloud APIs...${NC}"
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    secretmanager.googleapis.com \
    --project="$PROJECT_ID"

echo -e "${GREEN}✓ APIs enabled${NC}"
echo ""

# Configure Docker to use gcloud as a credential helper
echo -e "${YELLOW}Configuring Docker authentication...${NC}"
gcloud auth configure-docker --quiet

echo -e "${GREEN}✓ Docker authenticated${NC}"
echo ""

# Fetch secrets from Secret Manager
echo -e "${YELLOW}Fetching secrets from Secret Manager...${NC}"
FIREBASE_PROJECT_ID=$(gcloud secrets versions access latest --secret="FIREBASE_PROJECT_ID" --project="$PROJECT_ID")
FIREBASE_CLIENT_EMAIL=$(gcloud secrets versions access latest --secret="FIREBASE_CLIENT_EMAIL" --project="$PROJECT_ID")
FIREBASE_PRIVATE_KEY=$(gcloud secrets versions access latest --secret="FIREBASE_PRIVATE_KEY" --project="$PROJECT_ID")
NEXTAUTH_SECRET=$(gcloud secrets versions access latest --secret="NEXTAUTH_SECRET" --project="$PROJECT_ID")
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$(gcloud secrets versions access latest --secret="GOOGLE_MAPS_API_KEY" --project="$PROJECT_ID")

echo -e "${GREEN}✓ Secrets fetched${NC}"
echo ""

# Build the Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')"
docker build \
  --platform linux/amd64 \
  --build-arg FIREBASE_PROJECT_ID="$FIREBASE_PROJECT_ID" \
  --build-arg FIREBASE_CLIENT_EMAIL="$FIREBASE_CLIENT_EMAIL" \
  --build-arg FIREBASE_PRIVATE_KEY="$FIREBASE_PRIVATE_KEY" \
  --build-arg NEXTAUTH_SECRET="$NEXTAUTH_SECRET" \
  --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" \
  -t "$IMAGE_NAME" \
  -f Dockerfile \
  .

echo -e "${GREEN}✓ Docker image built${NC}"
echo ""

# Push the image to Google Container Registry
echo -e "${YELLOW}Pushing image to Container Registry...${NC}"
docker push "$IMAGE_NAME"

echo -e "${GREEN}✓ Image pushed${NC}"
echo ""

# Deploy to Cloud Run
echo -e "${YELLOW}Deploying to Cloud Run...${NC}"

SERVICE_ACCOUNT="ecotrack-cloud-run@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud run deploy "$SERVICE_NAME" \
    --image "$IMAGE_NAME" \
    --platform managed \
    --region "$REGION" \
    --allow-unauthenticated \
    --memory "$MEMORY" \
    --cpu "$CPU" \
    --min-instances "$MIN_INSTANCES" \
    --max-instances "$MAX_INSTANCES" \
    --timeout "$TIMEOUT" \
    --port 3000 \
    --concurrency 80 \
    --set-env-vars "NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1,NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyDIZTfzDreJJM15nYl_dhBBq7GvIHtpHes" \
    --set-secrets "GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest,NEXTAUTH_URL=NEXTAUTH_URL:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,FIREBASE_PROJECT_ID=FIREBASE_PROJECT_ID:latest,FIREBASE_PRIVATE_KEY=FIREBASE_PRIVATE_KEY:latest,FIREBASE_CLIENT_EMAIL=FIREBASE_CLIENT_EMAIL:latest" \
    --service-account "$SERVICE_ACCOUNT" \
    --labels "app=ecotrack,managed-by=manual" \
    --project "$PROJECT_ID"

# Get the service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region "$REGION" \
    --format 'value(status.url)' \
    --project "$PROJECT_ID")

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Deployment Successful! 🎉            ║${NC}"
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo ""
echo -e "${BLUE}Service URL:${NC} $SERVICE_URL"
echo -e "${BLUE}Health Check:${NC} $SERVICE_URL/api/health"
echo ""
echo -e "${YELLOW}Important: Update your OAuth redirect URIs to include:${NC}"
echo -e "  - ${SERVICE_URL}/api/auth/callback/google"
echo ""
echo -e "${YELLOW}And update NEXTAUTH_URL secret to:${NC}"
echo -e "  - ${SERVICE_URL}"
echo ""
