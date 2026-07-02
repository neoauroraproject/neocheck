# Local Development Guide

Follow this guide to build and run NeoCheck locally for development.

## Prerequisites
- **Go 1.24** or newer.
- **Node.js 20** or newer.
- **Docker** and **Docker Compose**.

## Running Locally

### 1. Go Backend
Navigate to the `backend` folder, install Go modules, and start the development server:

```bash
cd backend
go mod download
go run main.go
```
*Note: Make sure your configuration file or overrides exist.*

### 2. Next.js Frontend
Navigate to the `frontend` folder, install npm packages, and spin up the Turbopack server:

```bash
cd frontend
npm install
npm run dev
```

The frontend will start at `http://localhost:3000` and automatically proxy all API requests to the Go backend running on port `8080`.
