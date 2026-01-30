#!/bin/bash
# Build script for AI Therapist
# Sets required environment variables for production deployment

export NEXT_PUBLIC_BASE_PATH=/ai-therapist
export NEXT_PUBLIC_BACKEND_URL=/ten-api

echo "Building with:"
echo "  NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH"
echo "  NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL"

npm run build

echo ""
echo "Build complete. Restart with: pm2 restart ai-therapist"
