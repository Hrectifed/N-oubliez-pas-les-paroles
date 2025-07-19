# Retenez les paroles

A Dockerized web app inspired by "N'oubliez pas les paroles".

## Project Structure
- **frontend/**: React app (Vite)
- **backend/**: FastAPI app (Python)

## Requirements
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)

## Usage
1. Build and start both services:
   ```sh
   docker-compose up --build
   ```
2. Frontend: http://localhost:3000
3. Backend: http://localhost:8000

## Development
- All code changes are reflected live in the containers (volumes are mounted).
- No need to install Node.js or Python locally.

---
Replace placeholder code with your game logic and UI!
