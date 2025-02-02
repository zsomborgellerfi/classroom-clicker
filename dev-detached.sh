#!/bin/sh

echo "🔥 Cleaning up old containers and volumes..."
docker compose down -v

echo "🏗️  Building and starting containers in detached mode..."
docker compose up --build -d

echo "✅ Services are starting in the background"
echo "📝 To view logs: docker compose logs -f"
echo "🛑 To stop: docker compose down" 