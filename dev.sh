#!/bin/sh

echo "🔥 Cleaning up old containers and volumes..."
docker compose down -v

echo "🏗️  Building and starting containers..."
# Start containers in the background
docker compose up --build -d

echo "🌐 Waiting for frontend to be ready..."
until $(curl --output /dev/null --silent --head --fail http://localhost:5173); do
    printf '.'
    sleep 1
done

echo "\n✨ Frontend is ready! Opening browser..."
case "$(uname -s)" in
    Darwin*)    # macOS
        open http://localhost:5173
        ;;
    Linux*)     # Linux
        xdg-open http://localhost:5173 2>/dev/null || \
        sensible-browser http://localhost:5173 2>/dev/null || \
        python3 -m webbrowser http://localhost:5173
        ;;
    MINGW*|CYGWIN*|MSYS*)    # Windows
        start http://localhost:5173
        ;;
    *)
        echo "Please open http://localhost:5173 in your browser"
        ;;
esac

# Show logs
docker compose logs -f 