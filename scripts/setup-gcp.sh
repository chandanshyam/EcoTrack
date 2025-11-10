#!/bin/bash

# EcoTrack - Google Cloud Platform Setup Script
# This script sets up the necessary GCP infrastructure for EcoTrack

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   EcoTrack GCP Infrastructure Setup    ║${NC}"
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

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")

echo -e "${GREEN}Project ID: $PROJECT_ID${NC}"
echo -e "${GREEN}Project Number: $PROJECT_NUMBER${NC}"
echo ""

# Step 1: Enable required APIs
echo -e "${YELLOW}Step 1: Enabling required Google Cloud APIs...${NC}"

REQUIRED_APIS=(
    "cloudbuild.googleapis.com"
    "run.googleapis.com"
    "containerregistry.googleapis.com"
    "secretmanager.googleapis.com"
    "iam.googleapis.com"
    "firestore.googleapis.com"
    "maps-backend.googleapis.com"
    "places-backend.googleapis.com"
    "routes.googleapis.com"
    "geocoding-backend.googleapis.com"
)

for API in "${REQUIRED_APIS[@]}"; do
    echo -e "  Enabling $API..."
    gcloud services enable "$API" --project="$PROJECT_ID" --quiet
done

echo -e "${GREEN}✓ All APIs enabled${NC}"
echo ""

# Step 2: Create service account for Cloud Run
echo -e "${YELLOW}Step 2: Creating Cloud Run service account...${NC}"

SERVICE_ACCOUNT_NAME="ecotrack-cloud-run"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

if gcloud iam service-accounts describe "$SERVICE_ACCOUNT_EMAIL" --project="$PROJECT_ID" &> /dev/null; then
    echo -e "${YELLOW}Service account already exists: $SERVICE_ACCOUNT_EMAIL${NC}"
else
    gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
        --display-name="EcoTrack Cloud Run Service Account" \
        --description="Service account for EcoTrack Cloud Run deployment" \
        --project="$PROJECT_ID"
    echo -e "${GREEN}✓ Service account created: $SERVICE_ACCOUNT_EMAIL${NC}"
fi

echo ""

# Step 3: Grant necessary IAM roles to service account
echo -e "${YELLOW}Step 3: Granting IAM roles to service account...${NC}"

ROLES=(
    "roles/secretmanager.secretAccessor"
    "roles/datastore.user"
    "roles/logging.logWriter"
    "roles/cloudtrace.agent"
    "roles/monitoring.metricWriter"
)

for ROLE in "${ROLES[@]}"; do
    echo -e "  Granting $ROLE..."

    # Check if binding already exists
    EXISTING=$(gcloud projects get-iam-policy "$PROJECT_ID" \
        --flatten="bindings[].members" \
        --filter="bindings.role:$ROLE AND bindings.members:serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
        --format="value(bindings.role)" 2>/dev/null)

    if [ -n "$EXISTING" ]; then
        echo -e "    ${YELLOW}Role already granted, skipping${NC}"
    else
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
            --role="$ROLE" \
            --condition=None \
            --quiet 2>/dev/null || echo -e "    ${YELLOW}Warning: Could not grant $ROLE (may already exist)${NC}"
    fi
done

echo -e "${GREEN}✓ IAM roles granted${NC}"
echo ""

# Step 4: Grant Cloud Build permissions
echo -e "${YELLOW}Step 4: Configuring Cloud Build permissions...${NC}"

CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

BUILD_ROLES=(
    "roles/run.admin"
    "roles/iam.serviceAccountUser"
)

for ROLE in "${BUILD_ROLES[@]}"; do
    echo -e "  Granting $ROLE to Cloud Build..."

    # Check if binding already exists
    EXISTING=$(gcloud projects get-iam-policy "$PROJECT_ID" \
        --flatten="bindings[].members" \
        --filter="bindings.role:$ROLE AND bindings.members:serviceAccount:${CLOUD_BUILD_SA}" \
        --format="value(bindings.role)" 2>/dev/null)

    if [ -n "$EXISTING" ]; then
        echo -e "    ${YELLOW}Role already granted, skipping${NC}"
    else
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:${CLOUD_BUILD_SA}" \
            --role="$ROLE" \
            --condition=None \
            --quiet 2>/dev/null || echo -e "    ${YELLOW}Warning: Could not grant $ROLE (may already exist)${NC}"
    fi
done

echo -e "${GREEN}✓ Cloud Build permissions configured${NC}"
echo ""

# Step 5: Create Firestore database (if not exists)
echo -e "${YELLOW}Step 5: Checking Firestore database...${NC}"

if gcloud firestore databases describe --database="(default)" --project="$PROJECT_ID" &> /dev/null; then
    echo -e "${YELLOW}Firestore database already exists${NC}"
else
    echo -e "${GREEN}Creating Firestore database in Native mode...${NC}"
    echo -e "${YELLOW}Choose your region (recommended: us-central for lower latency):${NC}"
    read -p "Enter region [us-central]: " FIRESTORE_REGION
    FIRESTORE_REGION=${FIRESTORE_REGION:-us-central}

    gcloud firestore databases create \
        --location="$FIRESTORE_REGION" \
        --project="$PROJECT_ID"

    echo -e "${GREEN}✓ Firestore database created${NC}"
fi

echo ""

# Summary
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Setup Complete! ✓                    ║${NC}"
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo ""
echo -e "${BLUE}Service Account Created:${NC}"
echo -e "  Email: $SERVICE_ACCOUNT_EMAIL"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Set up your secrets: ./scripts/setup-secrets.sh"
echo "  2. Configure your environment variables"
echo "  3. Deploy your application: ./scripts/deploy.sh"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo "  - Make sure to configure your OAuth consent screen in Google Cloud Console"
echo "  - Add authorized redirect URIs for NextAuth.js"
echo "  - Enable Google Maps APIs: Routes, Places, Geocoding"
echo ""
