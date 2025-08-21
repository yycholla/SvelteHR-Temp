#!/bin/bash

echo "🔧 SvelteHR Environment Setup"
echo ""
echo "Choose your configuration:"
echo "1) HTTP (frontend: http://IP:5173, backend: http://IP:8080)"
echo "2) HTTPS (frontend: https://IP:5173, backend: https://IP:8443)"
echo "3) Local development (frontend: http://localhost:5173, backend: http://localhost:8080)"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
  1)
    echo "📄 Setting up HTTP configuration..."
    cp .env.http .env.local
    echo "✅ HTTP configuration applied"
    echo "💡 Make sure to restart: npm run dev"
    ;;
  2)
    echo "📄 Setting up HTTPS configuration..."
    cp .env.https .env.local
    echo "✅ HTTPS configuration applied"
    echo "💡 Make sure backend is running with HTTPS on port 8443"
    echo "💡 Make sure to restart: npm run dev"
    ;;
  3)
    echo "📄 Setting up local development configuration..."
    cp .env.localhost .env.local
    echo "✅ Local configuration applied"
    echo "💡 Make sure to restart: npm run dev"
    ;;
  *)
    echo "❌ Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "📋 Current configuration:"
cat .env.local