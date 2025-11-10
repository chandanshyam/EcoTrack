#!/bin/bash

# EcoTrack - Google Cloud Secret Manager Setup Script
# This script creates all required secrets in Google Cloud Secret Manager

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

echo -e "${GREEN}Setting up secrets for project: $PROJECT_ID${NC}"

# Function to create or update a secret
create_or_update_secret() {
    local SECRET_NAME=$1
    local SECRET_VALUE=$2

    if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &> /dev/null; then
        echo -e "${YELLOW}Updating existing secret: $SECRET_NAME${NC}"
        echo -n "$SECRET_VALUE" | gcloud secrets versions add "$SECRET_NAME" \
            --data-file=- \
            --project="$PROJECT_ID"
    else
        echo -e "${GREEN}Creating new secret: $SECRET_NAME${NC}"
        echo -n "$SECRET_VALUE" | gcloud secrets create "$SECRET_NAME" \
            --data-file=- \
            --replication-policy="automatic" \
            --project="$PROJECT_ID"
    fi
}

# Prompt for secrets
echo ""
echo "Enter your environment variables. Press Enter to skip optional ones."
echo ""

# Required secrets
read -p "GOOGLE_MAPS_API_KEY: " GOOGLE_MAPS_API_KEY
read -p "GEMINI_API_KEY: " GEMINI_API_KEY
read -p "NEXTAUTH_SECRET (generate with: openssl rand -base64 32): " NEXTAUTH_SECRET
read -p "GOOGLE_CLIENT_ID: " GOOGLE_CLIENT_ID
read -p "GOOGLE_CLIENT_SECRET: " GOOGLE_CLIENT_SECRET
read -p "FIREBASE_PROJECT_ID: " FIREBASE_PROJECT_ID
read -p "FIREBASE_CLIENT_EMAIL: " FIREBASE_CLIENT_EMAIL
echo "FIREBASE_PRIVATE_KEY (paste the entire key including BEGIN/END lines, then press Enter twice):"
FIREBASE_PRIVATE_KEY=$(sed '/^$/q')

# Validate required fields
if [ -z "$GOOGLE_MAPS_API_KEY" ] || [ -z "$GEMINI_API_KEY" ] || [ -z "$NEXTAUTH_SECRET" ]; then
    echo -e "${RED}Error: Required secrets not provided${NC}"
    exit 1
fi

# Create secrets
echo ""
echo -e "${GREEN}Creating secrets in Google Cloud Secret Manager...${NC}"
echo ""

create_or_update_secret "GOOGLE_MAPS_API_KEY" "$GOOGLE_MAPS_API_KEY"
create_or_update_secret "GEMINI_API_KEY" "$GEMINI_API_KEY"
create_or_update_secret "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET"
create_or_update_secret "GOOGLE_CLIENT_ID" "$GOOGLE_CLIENT_ID"
create_or_update_secret "GOOGLE_CLIENT_SECRET" "$GOOGLE_CLIENT_SECRET"
create_or_update_secret "FIREBASE_PROJECT_ID" "$FIREBASE_PROJECT_ID"
create_or_update_secret "FIREBASE_CLIENT_EMAIL" "$FIREBASE_CLIENT_EMAIL"
create_or_update_secret "FIREBASE_PRIVATE_KEY" "$FIREBASE_PRIVATE_KEY"

# Grant Cloud Run service account access to secrets
SERVICE_ACCOUNT="ecotrack-cloud-run@${PROJECT_ID}.iam.gserviceaccount.com"

echo ""
echo -e "${GREEN}Granting Cloud Run service account access to secrets...${NC}"

for SECRET in "GOOGLE_MAPS_API_KEY" "GEMINI_API_KEY" "NEXTAUTH_SECRET" "GOOGLE_CLIENT_ID" "GOOGLE_CLIENT_SECRET" "FIREBASE_PROJECT_ID" "FIREBASE_CLIENT_EMAIL" "FIREBASE_PRIVATE_KEY"; do
    gcloud secrets add-iam-policy-binding "$SECRET" \
        --member="serviceAccount:${SERVICE_ACCOUNT}" \
        --role="roles/secretmanager.secretAccessor" \
        --project="$PROJECT_ID" \
        --quiet
done

echo ""
echo -e "${GREEN}✓ All secrets created and configured successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Deploy your application: ./scripts/deploy.sh"
echo "2. Or use Cloud Build: gcloud builds submit --config cloudbuild.yaml"
