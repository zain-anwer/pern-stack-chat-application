
# Bubble Chat

A real-time PERN stack chat application built as a rite of passage on my backend development journey.

🔗 **Live Demo:** [bubble-pern-chat-app.vercel.app](https://bubble-pern-chat-app.vercel.app)

> **Note:** The deployed version won't have real-time features active — the backend is hosted on a serverless platform that doesn't support persistent socket connections. Clone and run locally for the full experience.

---

## Features

- **Real-time messaging** powered by Socket.IO over WebSocket with polling fallback
- **Message status receipts** — live tracking of sent, delivered, and read states with timestamps, implemented via PostgreSQL triggers and backend socket events
- **Online/offline presence** — users see who's currently active, with automatic status updates on connect and disconnect
- **Unread message counts** — per-conversation unread badges that update in real time
- **JWT authentication** with secure httpOnly cookies
- **Arcjet rate limiting** middleware to protect auth endpoints
- **Group-chat extensible schema** — the database is designed to support group conversations with minimal changes
- **PostgreSQL** with triggers for automated message status management, transactions for data integrity, and indexes for query performance

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite |
| Backend | Node.js, Express |
| Real-time | Socket.IO |
| Database | PostgreSQL (Supabase) |
| Auth | JWT + bcrypt |
| Deployment | Vercel (frontend), Leapcell (backend) |

---

## Running Locally

### Prerequisites
- Node.js v18+
- PostgreSQL database (or a Supabase project)

### 1. Clone the repository

```bash
git clone https://github.com/zain-anwer/pern-stack-chat-application.git
cd pern-stack-chat-application
```

### 2. Set up the backend

```bash
cd chat_backend
npm install
```

Create a `.env` file in `chat_backend/`:

```dotenv
PORT=3000
NODE_ENV=development
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
SALT_ROUNDS=10
CLIENT_URL=http://localhost:5173
```

**Set up the database:**

Schema:

<img width="1061" height="545" alt="supabase-schema-khawfekxfinuktyrcoiy" src="https://github.com/user-attachments/assets/13b8ea78-d767-4cd7-8eee-34de8cf2dce9" />


The entire schema — tables, triggers, indexes, and constraints — is defined in `chat_backend/db/init.sql`. Simply copy and paste its contents into your PostgreSQL command line or any SQL editor (pgAdmin, DBeaver, Supabase SQL editor, etc.) and run it. That's all you need to get the database ready.

```bash
npm run dev
```

### 3. Set up the frontend

Open a new terminal:

```bash
cd chat_frontend
npm install
```

Create a `.env` file in `chat_frontend/`:

```dotenv
VITE_BACKEND_URL=http://localhost:3000/api
```

```bash
npm run dev
```

The app will be running at `http://localhost:5173`.

---

## Background

I built this project largely from scratch as a way to solidify my understanding of full-stack development — in particular the parts that tutorials tend to gloss over: race conditions between database triggers and socket events, cookie behavior across different hosting environments, WebSocket limitations on serverless platforms, and managing real-time state across multiple connected clients.

It was genuinely tricky. Debugging socket authentication across a split deployment (Vercel frontend, serverless backend) taught me more about how browsers, cookies, and persistent connections actually work than any tutorial had.

Speaking of which — a significant part of my foundational web development knowledge came from the **[Full Stack Open](https://fullstackopen.com/)** course by the University of Helsinki. It's free, rigorous, and I'd recommend it to anyone serious about web development.

---

## Author

**Zain Anwer**
[github.com/zain-anwer](https://github.com/zain-anwer)
