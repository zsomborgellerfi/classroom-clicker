#!/bin/sh

echo "Waiting for frontend to be ready..."
until $(curl --output /dev/null --silent --head --fail http://localhost:5173); do
    printf '.'
    sleep 1
done

echo "\nFrontend is ready! Opening browser..."

# Detect operating system and use appropriate open command
case "$(uname -s)" in
    Darwin*)    # macOS
        open http://localhost:5173
        ;;
    Linux*)     # Linux
        xdg-open http://localhost:5173 2>/dev/null || \
        sensible-browser http://localhost:5173 2>/dev/null || \
        python3 -m webbrowser http://localhost:5173 2>/dev/null || \
        echo "Please open http://localhost:5173 in your browser"
        ;;
    MINGW*|CYGWIN*|MSYS*)    # Windows
        start http://localhost:5173 2>/dev/null || \
        python3 -m webbrowser http://localhost:5173 2>/dev/null || \
        echo "Please open http://localhost:5173 in your browser"
        ;;
    *)
        echo "Please open http://localhost:5173 in your browser"
        ;;
esac 