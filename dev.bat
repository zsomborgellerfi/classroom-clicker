@echo off

echo 🔥 Cleaning up old containers and volumes...
docker compose down -v

echo 🏗️  Building and starting containers...
docker compose up --build 