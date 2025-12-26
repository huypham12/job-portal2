#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting deployment..."

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production file not found!"
    echo "Please create .env.production with your production environment variables."
    exit 1
fi

# Create uploads directory if it doesn't exist
mkdir -p uploads

# Stop and remove existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Remove existing images to force rebuild
echo "🧹 Cleaning up old images..."
docker-compose rm -f

# Build and start services
echo "📦 Building and starting services..."
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
echo "   - Waiting for PostgreSQL..."
docker-compose exec -T postgres sh -c 'while ! pg_isready -U $POSTGRES_USER; do sleep 1; done'
echo "   - Waiting for Elasticsearch..."
docker-compose exec -T elasticsearch sh -c 'while ! curl -f http://localhost:9200; do sleep 2; done'
echo "   - Waiting for app..."
docker-compose exec -T app sh -c 'while ! curl -f http://localhost:4000/api/health; do sleep 2; done'

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose exec app npx prisma migrate deploy

# Generate Prisma client
echo "🔧 Generating Prisma client..."
docker-compose exec app npx prisma generate

# Setup Elasticsearch
echo "🔍 Setting up Elasticsearch..."
docker-compose exec app npm run es:setup

echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Services are running:"
echo "   - API: http://localhost:4000"
echo "   - Health Check: http://localhost:4000/api/health"
echo "   - API Docs: http://localhost:4000/api-docs (if enabled)"
echo "   - Kibana: http://localhost:5601"
echo ""
echo "📊 To check logs:"
echo "   docker-compose logs -f app"
echo ""
echo "🛑 To stop services:"
echo "   docker-compose down"
