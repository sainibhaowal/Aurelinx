# Aurelinx Frontend — Web Client

The official web frontend of the **Aurelinx Executive Talent Intelligence Platform** — a modern, responsive single-page application for executive talent analytics, workforce intelligence, AI chat, and reporting.

Built with **Next.js 15**, **React 19**, **Tailwind CSS 4**, and **Framer Motion**.

---

## Tech stack

| Layer              | Technology                            |
| ------------------ | ------------------------------------- |
| Framework          | Next.js 15 (App Router)               |
| UI                 | React 19 + JSX                        |
| Styling            | Tailwind CSS 4 + PostCSS              |
| Animations         | Framer Motion 12                      |
| Markdown rendering | react-markdown + remark-gfm           |
| PDF export         | jsPDF + jsPDF AutoTable               |
| Spreadsheet export | xlsx                                  |
| Icons              | Lucide React                          |
| Tests              | Vitest                                |
| Linting            | ESLint                                |
| Runtime            | Node.js (standalone build via Docker) |

---

## Getting started

### Prerequisites

- Node.js 18+ (20 recommended)
- npm or pnpm

### Install & run (development)

```bash
cd client
npm install
npm run dev        # Next.js dev server on http://localhost:3001
```

### Build & start (production mode)

```bash
npm run build
npm start          # http://localhost:3000
```

### Tests & lint

```bash
npm test           # Vitest (single run)
npm run test:watch # Vitest (watch mode)
npm run lint       # ESLint
```

---

## Project structure

```
client/
├── app/                  # Next.js App Router
│   ├── layout.jsx        # Root layout & metadata
│   └── page.jsx          # Entry page
├── src/
│   ├── App.jsx           # Main application component
│   ├── components/       # Reusable UI components
│   ├── contexts/         # React context providers (auth, state, etc.)
│   ├── services/         # API client services (REST calls to the backend)
│   ├── utils/            # Helper utilities
│   ├── styles/           # Global styles (index.css, App.css)
│   ├── assets/           # Static assets (images, fonts)
│   └── __tests__/        # Vitest test suites
├── public/               # Public static files
├── next.config.js        # Next.js configuration
├── tailwind.config.js    # Tailwind configuration
├── postcss.config.js     # PostCSS configuration
└── package.json
```

---

## Key features

- **Executive talent intelligence UI** — dashboards, attrition/retention analytics, organizational insights
- **AI-powered chat** — markdown-rendered assistant conversations over enterprise data
- **Reporting & export** — PDF generation (jsPDF) and spreadsheet export (xlsx)
- **Animated, responsive UI** — Framer Motion transitions, mobile-friendly layout
- **Context-based state management** — React contexts with persistence

---

## Environment variables

| Variable              | Purpose                                                  | Example                        |
| --------------------- | -------------------------------------------------------- | ------------------------------ |
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API (baked in **at build time**) | `https://aurelinx.averqel.com` |

> For local development, point it at the locally running API, e.g. `http://localhost:5100`.

---

## Docker / production

The frontend is containerized via `infra/frontend.Dockerfile` (Next.js standalone output) and published to **GHCR** as `ghcr.io/sainibhaowal/aurelinx-frontend`. It is deployed automatically by the GitHub Actions release pipeline (see the root [`README.md`](../README.md) and [`Docs/vps_deployment_guide.md`](../Docs/vps_deployment_guide.md)).

In production, `NEXT_PUBLIC_API_URL` is supplied as a build argument by the pipeline; the Caddy gateway routes `/api/*` to the backend on the same domain, so no separate API hostname is required.

---

## Related

- Backend: [`server/`](../server/README.md)
- Desktop shell: [`desktop/`](../desktop/README.md)
- Infrastructure & deployment: [`infra/`](../infra/README.md)
