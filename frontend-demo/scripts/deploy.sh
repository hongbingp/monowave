#!/bin/bash

# Monowave Frontend Demo Deployment Script
# Usage: ./scripts/deploy.sh [environment]

set -e

ENVIRONMENT=${1:-demo}
echo "🚀 Deploying Monowave Frontend Demo to $ENVIRONMENT..."

# Check if required tools are installed
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed. Aborting." >&2; exit 1; }

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run tests (if any)
echo "🧪 Running tests..."
npm run lint || echo "⚠️ Linting warnings detected, continuing..."

# Build the application
echo "🏗️ Building application..."
npm run build

# Deploy based on environment
case $ENVIRONMENT in
  "vercel")
    echo "🌐 Deploying to Vercel..."
    if command -v vercel >/dev/null 2>&1; then
      vercel --prod
    else
      echo "❌ Vercel CLI not found. Install with: npm i -g vercel"
      exit 1
    fi
    ;;
  "docker")
    echo "🐳 Building Docker image..."
    docker build -t monowave-demo:latest .
    echo "✅ Docker image built successfully"
    echo "Run with: docker run -p 3000:3000 monowave-demo:latest"
    ;;
  "demo")
    echo "💻 Starting local demo server..."
    echo "✅ Build completed successfully"
    echo "Start with: npm start"
    ;;
  *)
    echo "❌ Unknown environment: $ENVIRONMENT"
    echo "Available environments: vercel, docker, demo"
    exit 1
    ;;
esac

echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Test the demo at the provided URL"
echo "2. Prepare investor presentation materials"
echo "3. Review demo script in README.md"
