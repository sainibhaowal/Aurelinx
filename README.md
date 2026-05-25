# 🏛️ Aurelius: Autonomous Management Intelligence

**Aurelius** is a production-grade Agentic Operating System designed for HR and Strategic Management. It replaces manual oversight with **Hybrid Intelligence**—combining Large Language Models (LLMs) with deterministic mathematical models for talent graph adjacency and sentiment velocity tracking.

---

## 🚀 Key Features

### 1. Agentic Talent Scout
- **Semantic Screening:** Finds candidates based on "Conceptual Fit" rather than just keywords using Vector Embeddings.
- **Multi-Intelligence:** Support for OpenAI, Claude, Gemini, Groq, and local models (LM Studio).
- **Tool-Enabled:** The AI can autonomously query the SQL database to fetch and rank candidates.

### 2. Predictive Sentiment Pulse
- **Turnover Prediction:** Analyzes organizational health and detects "Risk Clusters" before they lead to resignations.
- **Sentiment Velocity:** Tracks the speed and direction of morale shifts in real-time.

### 3. Managerial Governance
- **Human-in-the-loop (HITL):** High-impact actions require manager approval via a secure UI.
- **Professional Reporting:** Export AI findings and analytics into high-fidelity PDF reports.

---

## 🛠️ Tech Stack

- **Frontend:** React (Vite), Framer Motion, Lucide Icons, Vanilla CSS (Glassmorphism).
- **Backend:** FastAPI, LangGraph, SQLModel (SQLite/PostgreSQL), FAISS (Vector Search).
- **Intelligence:** LangChain, OpenAI Embeddings, Multi-Provider LLM Factory.

---

## 📖 Quick Start

### 1. Backend Setup
```bash
cd server
pip install -r requirements.txt
python -m app.core.seed_data  # Initialize and seed 50 profiles
uvicorn app.main:app --reload
```

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev
```

### 3. Configure AI
Go to the **Providers** tab in the UI and enter your preferred API key (OpenAI, Groq, etc.) or connect your local **LM Studio** instance.

---

## ⚖️ Governance & Safety
All development follows the **Aurelius Rules of Engagement**, ensuring zero-failure imports, production-safe logic, and strict data privacy.

---
*Created by the Aurelius Advanced Agentic Coding Team.*
