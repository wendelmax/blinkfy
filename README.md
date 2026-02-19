# Recruitment Platform

Welcome to the Recruitment Platform monorepo! This project is a modern recruitment solution built with a powerful tech stack to ensure scalability and performance.

## 🚀 Overview

This repository contains the source code for both the frontend web application and the backend API service.

-   **Frontend (`apps/web`)**: A responsive and dynamic user interface built with [Next.js](https://nextjs.org/).
-   **Backend (`apps/api`)**: A robust RESTful API built with [Express](https://expressjs.com/).

## 🛠 Tech Stack

-   **Frontend**: Next.js, React, Tailwind CSS
-   **Backend**: Node.js, Express
-   **Database**: PostgreSQL
-   **ORM**: Prisma
-   **Tasklets**: [@wendelmax/tasklets](https://www.npmjs.com/package/@wendelmax/tasklets) — Worker Threads for CPU-bound tasks (tax calc, GitHub analysis)
-   **Containerization**: Docker

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

-   [Node.js](https://nodejs.org/) (v18 or higher)
-   [Docker](https://www.docker.com/) & Docker Compose

## 🏁 Getting Started

Follow these steps to get the project up and running on your local machine.

### 1. Install Dependencies

Install all project dependencies from the root directory:

```bash
npm install
```

### 2. Set Up Environment Variables

Create `.env` files in `apps/web` and `apps/api` based on the `.env.example` files (if available), or configure them according to your local setup.

### 3. Start Database

Launch the PostgreSQL database using Docker Compose:

```bash
docker-compose up -d
```

### 4. Run Development Server

Start both the frontend and backend development servers concurrently:

```bash
npm run dev
```

-   **Frontend**: http://localhost:3000
-   **Backend**: http://localhost:3001 (or configured port)

## 📂 Project Structure

```
.
├── apps
│   ├── web          # Next.js frontend application
│   └── api          # Express backend application
├── docker-compose.yml # Docker configuration for services
└── package.json     # Root package.json managing workspaces
```

## 📜 Scripts

-   `npm run dev`: Starts the development environment for all workspaces.
-   `npm run build`: Builds the production application for all workspaces.
-   `npm run lint`: Runs linting checks across the project.

## 🚀 Production

### Deploy with Docker Compose

```bash
docker-compose up -d postgres mailpit   # infra
cd apps/api && npx prisma migrate deploy && npx prisma db seed
docker-compose up -d api
```

### Deploy with PM2

```bash
npm run build --workspace=apps/web
pm2 start ecosystem.config.cjs
```

### Production env (API)

-   `NODE_ENV=production`
-   `DATABASE_URL` (required)
-   `JWT_SECRET` (min 32 chars)
-   `FRONTEND_URL` / `CORS_ORIGIN`
-   See `apps/api/env-template`

### Health endpoints

-   `GET /health` — API + DB status
-   `GET /ready` — readiness probe (DB connectivity)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
