FROM python:3.10-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Set working directory
WORKDIR /app

# Copy dependency files (from context root)
COPY pyproject.toml uv.lock ./

# Install dependencies without source code
RUN uv sync --no-install-project

# Copy backend application code
COPY backend/ ./backend/

# Install the project itself (as a package)
RUN uv sync

# Expose the API port
EXPOSE 8001

# Run the application from the root of the app
CMD ["uv", "run", "python", "-m", "backend.main"]
