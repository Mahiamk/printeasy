# PrintEasy 🖨️

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/Neon_PostgreSQL-Serverless-00E599?style=flat&logo=postgresql&logoColor=white)](https://neon.tech)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**PrintEasy** is a modern, privacy-first library and campus print queue management platform. Designed specifically for university libraries, campus computer labs, and shared workstation environments, PrintEasy eliminates physical print-station bottlenecks, secures student printing PINs via AES-256-GCM encryption, and introduces passwordless **QR Code Instant Login** across shared computers.

---

## 📑 Table of Contents

- [System Architecture](#-system-architecture)
- [Key Features](#-key-features)
  - [1. Authentication & Device Linking](#1-authentication--device-linking)
  - [2. Secure Print Queue & Quotas](#2-secure-print-queue--quotas)
  - [3. Direct Network Printing & Local Relay](#3-direct-network-printing--local-relay)
  - [4. Student Quota & D3 Data Visualizations](#4-student-quota--d3-data-visualizations)
  - [5. Superadmin Management](#5-superadmin-management)
- [Tech Stack](#-tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Environment Variables](#-environment-variables)
- [Getting Started Locally](#-getting-started-locally)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Frontend Setup](#2-frontend-setup)
- [Campus Network Relay Agent (Optional)](#-campus-network-relay-agent-optional)
- [Deployment](#-deployment)
  - [Vercel Deployment (Fullstack Monorepo)](#vercel-deployment-fullstack-monorepo)
  - [Docker / Self-Hosted VPS](#docker--self-hosted-vps)
- [Security & Cryptography](#-security--cryptography)
- [License](#-license)

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    subgraph Clients["User Devices"]
        Mobile["📱 Student Mobile (Camera / In-App Scanner)"]
        LabPC["🖥️ Shared Library Lab Workstation"]
        Laptop["💻 Personal Laptop / Tablet"]
    end

    subgraph Cloud["Vercel Cloud & Edge Platform"]
        Frontend["⚛️ React 18 + Vite SPA (Tailored Sage Theme)"]
        API["⚡ FastAPI Serverless API Engine"]
    end

    subgraph Storage["Databases & Storage"]
        DB[(🐘 Neon Serverless PostgreSQL)]
        BlobStorage["🗂️ Vercel Blob / Local Fallback"]
    end

    subgraph CampusNet["Campus Local Network (LAN)"]
        Relay["📡 Python Relay Agent (Socket Listener)"]
        Printers["🖨️ Toshiba e-STUDIO / Network Printers (Port 9100 RAW)"]
    end

    Mobile -- "1. Scans QR / Approves Login" --> API
    LabPC -- "2. Displays QR Code / Polls Auth Status" --> Frontend
    Laptop -- "3. Uploads PDF/Docx" --> API
    API --> DB
    API --> BlobStorage
    API -- "Job Dispatch" --> Relay
    Relay -- "Direct RAW/PJL Stream" --> Printers
```

---

## ✨ Key Features

### 1. Authentication & Device Linking
- **Passwordless QR Code Login ("Link Device")**:
  - Open PrintEasy on any public lab PC or secondary device.
  - Select **Scan QR** on the login screen to display an auto-refreshing QR code with laser beam micro-animation and countdown timer.
  - Point your mobile camera (or in-app scanner) at the screen to inspect the device details (*e.g. Chrome on Windows*) and tap **Approve Login**.
  - The workstation logs in automatically using single-use, 3-minute ephemeral cryptographic tokens.
- **Google OAuth 2.0 Integration**:
  - One-tap sign-in with Google credential verification.
  - Auto-verification for verified Google institutional email addresses (`@school.edu`).
- **Institutional Email Sign-Up**:
  - Standard email/password registration with tokenized activation emails sent via **Resend**.

### 2. Secure Print Queue & Quotas
- **End-to-End Encrypted Printing Code**:
  - Student release PINs and department billing codes are encrypted with **AES-256-GCM** using session-derived cryptographic keys. Codes are never stored in plaintext.
- **Automated Page Counting**:
  - Automatically parses PDF documents via `pypdf` to detect precise page counts before spooling.
- **Ephemeral Storage & Privacy**:
  - Print jobs auto-expire after 24 hours.
  - Printed files are automatically wiped from cloud/local storage immediately upon completion.

### 3. Direct Network Printing & Local Relay
- **Browser Print Dialog**: Standard fallback for desktop browsers with formatted print preview.
- **Direct RAW Network Spooling**:
  - Supports direct socket spooling (port 9100) to campus network multi-function printers (Toshiba e-STUDIO series).
  - Embeds department authentication codes into PJL headers to print without client-side popups.
- **Lightweight Campus Relay Agent**:
  - Standalone daemon (`relay_agent.py`) can run on any local computer inside the university firewall, polling the API and forwarding print jobs to physical printers over the local LAN.

### 4. Student Quota & D3 Data Visualizations
- Real-time allowances: **B&W Quota** (e.g., 400 pages) and **Color Quota** (e.g., 20 pages).
- Dynamic SVG Sparklines and interactive usage charts powered by **D3** (`d3-scale`, `d3-shape`).

### 5. Superadmin Management
- Centralized administrator dashboard to:
  - Oversee active and queued campus print jobs.
  - Manage student print quotas and view department-level aggregations.
  - Monitor print server status and network printer availability.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18, TypeScript, Vite
- **Styling**: Vanilla CSS tokens (Academic Sage & Warm Ivory palette, dark mode support, glassmorphic cards)
- **Icons**: Phosphor Icons (`@phosphor-icons/react`)
- **Visualizations**: D3.js (`d3-scale`, `d3-shape`)
- **QR & Camera**: `qrcode.react` (SVG generation), `html5-qrcode` (cross-browser camera scanner)
- **Analytics**: Vercel Analytics

### Backend
- **Framework**: FastAPI (Python 3.10+ / 3.13)
- **Database**: Neon Serverless PostgreSQL with `asyncpg` and `SQLAlchemy 2.0`
- **Security & JWT**: `python-jose`, `cryptography` (AES-256-GCM), `passlib` (bcrypt)
- **Email Service**: Resend API
- **Document Processing**: `pypdf`
- **Scheduling**: APScheduler (background expired queue cleaner)

---

## 📁 Project Directory Structure

```text
printeasy/
├── backend/
│   ├── app/
│   │   ├── auth.py              # JWT tokens, password hashing, AES-256 session crypto
│   │   ├── blob.py              # Vercel Blob cloud storage & local upload fallback
│   │   ├── crypto.py            # AES-256-GCM printing code encryption utilities
│   │   ├── database.py          # SQLAlchemy async engine & Neon connection pooling
│   │   ├── email_service.py     # Email verification sender via Resend
│   │   ├── models.py            # DB Models: User, PrintJob, QRLoginSession
│   │   ├── page_counter.py      # PDF page count calculation
│   │   ├── printers.py          # RAW socket driver & PJL job envelope formatting
│   │   ├── schemas.py           # Pydantic validation schemas
│   │   └── routes/
│   │       ├── auth.py          # Auth routes (email, Google, QR initiate/status/authorize)
│   │       ├── code.py          # Printing code save & decryption routes
│   │       ├── jobs.py          # Queue upload, status, and deletion routes
│   │       ├── printers.py      # Network printer configuration & dispatch
│   │       ├── relay.py         # LAN Relay Agent communication endpoints
│   │       ├── stats.py         # Student quota and analytics routes
│   │       └── superadmin.py    # Admin overview and management
│   ├── main.py                  # FastAPI application entrypoint & lifespan hooks
│   ├── relay_agent.py           # Standalone LAN socket relay script
│   └── requirements.txt         # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── api/                 # Axios clients (auth, jobs, printers, stats)
│   │   ├── components/
│   │   │   ├── auth/            # GoogleSignInButton, QRCodeLogin
│   │   │   ├── layout/          # AppLayout, Navigation
│   │   │   ├── queue/           # QueueTable, PrintModal
│   │   │   ├── stats/           # StatsPanel, D3 Sparkline charts
│   │   │   └── upload/          # DropZone file uploader
│   │   ├── context/             # AuthContext, DataContext
│   │   ├── pages/               # Landing, Login, Register, Dashboard, LinkDevice, etc.
│   │   └── App.tsx              # React router setup & route protection
│   ├── package.json
│   └── vite.config.ts
├── .env.example                 # Environment configuration template
├── vercel.json                  # Fullstack monorepo serverless deployment configuration
└── README.md
```

---

## 🔑 Environment Variables

Copy `.env.example` to create your local `.env` configuration:

```bash
cp .env.example .env
```

### Backend (`backend/.env` or root `.env`)

| Variable | Required | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | Neon PostgreSQL connection string (`postgresql+asyncpg://...`) | `postgresql://user:pass@ep-xyz.neon.tech/neondb` |
| `JWT_SECRET` | **Yes** | 256-bit hex secret for signing user session tokens | Run `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `FRONTEND_URL` | No | Production URL for CORS origin allowance | `https://print.school.edu` |
| `BLOB_READ_WRITE_TOKEN` | No | Vercel Blob access token. If omitted, uses local filesystem storage | `vercel_blob_rw_...` |
| `RESEND_API` | No | Resend API key for account email verifications | `re_xxxxxxxxxxxx` |
| `GOOGLE_CLIENT_ID` | No | Google Cloud Console OAuth 2.0 Web Client ID | `xxxxxxxx.apps.googleusercontent.com` |
| `PORT` | No | Backend port (default `8000`) | `8000` |

### Frontend (`frontend/.env` or root `.env`)

| Variable | Required | Description | Example |
|---|---|---|---|
| `VITE_API_BASE_URL` | No | Base URL of backend API (leave empty if using proxy or same domain) | `http://localhost:8000` |
| `VITE_GOOGLE_CLIENT_ID`| No | Public Google Client ID for frontend button rendering | `xxxxxxxx.apps.googleusercontent.com` |

---

## 🚀 Getting Started Locally

### Prerequisites
- **Python**: 3.10 or higher
- **Node.js**: 18 or higher (with `npm`)
- **PostgreSQL**: Local Postgres instance or a free [Neon](https://neon.tech) serverless database

---

### 1. Backend Setup

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate    # On Windows: venv\Scripts\activate
   ```

3. Install required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create your `.env` file with `DATABASE_URL` and `JWT_SECRET`:
   ```bash
   cat <<EOF > .env
   DATABASE_URL=postgresql://your_neon_user:your_password@ep-xyz.neon.tech/neondb
   JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
   EOF
   ```

5. Launch the backend development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   The API will be available at `http://localhost:8000` (Interactive Swagger Docs at `http://localhost:8000/docs`).

---

### 2. Frontend Setup

1. Open a second terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The web application will launch at `http://localhost:5173`.

---

## 📡 Campus Network Relay Agent (Optional)

If your library printer (*e.g. Toshiba e-STUDIO*) is located on an isolated university intranet or private campus LAN, the cloud server cannot reach port 9100 directly. 

Run the included **PrintEasy Relay Agent** on any machine connected to the campus LAN:

```bash
cd backend

# Run relay daemon pointing to your cloud API:
python3 relay_agent.py \
  --server https://your-printeasy-domain.com \
  --secret YOUR_RELAY_AGENT_SECRET \
  --poll-interval 3
```

- The relay continuously polls `/api/relay/poll` for queued print jobs.
- Upon receiving a job, it streams the document directly to the printer's RAW 9100 port using PJL framing.
- Reports status back to `/api/relay/jobs/{id}/status`.

---

## 🚢 Deployment

### Vercel Deployment (Fullstack Monorepo)

PrintEasy includes pre-configured [vercel.json](file:///Users/anwarmohammedkoji/Project/printeasy/vercel.json) rules to deploy the frontend SPA and FastAPI serverless backend together:

1. Push your repository to GitHub.
2. Import the project into the [Vercel Dashboard](https://vercel.com).
3. Under **Environment Variables**, configure:
   - `DATABASE_URL`: Your Neon connection string
   - `JWT_SECRET`: Your 256-bit random hex string
   - `BLOB_READ_WRITE_TOKEN`: Your Vercel Blob token (under Storage in Vercel)
   - `GOOGLE_CLIENT_ID` & `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth client ID
   - `RESEND_API`: Your Resend API token
4. Click **Deploy**. Vercel will build the frontend assets to `/dist` and route `/api/*` requests to the Python serverless runtime.

---

### Docker / Self-Hosted VPS

To run the backend as a persistent service on a VPS (Ubuntu, Debian, etc.):

```bash
# Run with Uvicorn behind Nginx or Caddy
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## 🛡️ Security & Cryptography

1. **Printing Code Security**:
   - Printing PINs and billing codes are encrypted with **AES-256-GCM** using a key derived from the user's password and master secret (`HMAC-SHA256`).
   - The server cannot decrypt the student's code without an active session.
2. **Replay Protection on QR Auth**:
   - QR session tokens carry a strict **180-second TTL**.
   - Upon device authorization, tokens are immediately and atomically marked `consumed` in the database to prevent token replay.
3. **Single-Use Document Purging**:
   - Spooled document files are automatically deleted from storage once printed or when expired (24h).
4. **Verified Domain Enforcement**:
   - Institutional restrictions can be configured to only allow `@school.edu` domain registrations.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
