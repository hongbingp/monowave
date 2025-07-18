#!/bin/bash

echo "🧹 Cleaning up node_modules and package-lock.json..."
rm -rf node_modules package-lock.json

echo "🧹 Cleaning up contracts dependencies..."
rm -rf contracts/node_modules contracts/package-lock.json

echo "📦 Installing main dependencies..."
npm install

echo "📦 Installing contract dependencies..."
cd contracts && npm install

echo "✅ Clean install completed!"
echo ""
echo "🧪 Now you can run tests:"
echo "  npm run test:unit"
echo "  npm run test:integration"
echo "  npm run test:contracts"