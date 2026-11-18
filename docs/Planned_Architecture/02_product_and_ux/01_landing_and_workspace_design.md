# 01. Landing and Workspace UX Design

01. **Public Landing Experience (`/`):**
    - Decoupled from the authenticated `/app` shell so visitors can review platform capabilities, architecture highlights, and login/registration entry points cleanly.

02. **Authenticated Workspace (`/app/*`):**
    - **Core Views:** Executive Overview (`/app`), Employee Directory (`/app/directory`), Talent Scout (`/app/talent-scout`), Sentiment Pulse (`/app/sentiment-pulse`), Intelligence Chat (`/app/intelligence-chat`), and Enterprise Ops (`/app/enterprise-ops`).
    - **Design System:** Dark-mode executive UI with Tailwind CSS, Framer Motion transitions, and lazy-loaded heavy visualization/export modules (`jsPDF`, `xlsx`) to keep initial bundle sizes small.

03. **Interactive AI Copilot:**
    - Persistent session history, attachment parsing, and observable tool execution traces with human approval gates before any mutating action.
