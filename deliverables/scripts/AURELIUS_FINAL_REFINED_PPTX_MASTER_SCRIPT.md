# Aurelius Full Master Presentation Script (Based on `AURELIUS_University_Submission_Deck_FINAL_REFINED.pptx`)

Use this as one continuous script for your full end-to-end presentation. It is slide-mapped to your exact deck (Slides 1 to 19).

---

## Slide 1 - UNIVERSITY CAPSTONE PROJECT PRESENTATION
Good morning/afternoon respected faculty and everyone present.

Today we are presenting our university capstone project, **Aurelius**, which we define as a next-generation autonomous AI-agent HR management operating system.

At a high level, Aurelius combines predictive mathematics, secure AI interaction, and real-time HR operating workflows.

In this presentation, we will explain:
- the problem we targeted,
- the system architecture,
- workforce signal logic,
- intelligence modules,
- mathematical engine,
- governance controls,
- and roadmap.

This deck is structured as an executive academic pitch and our objective is to demonstrate not only a prototype UI, but also a complete end-to-end decision system.

---

## Slide 2 - PROJECT TEAM
This project was developed by a four-student team with clear role ownership.

Our roles were divided as:
- Research and requirements,
- Backend and data layer,
- Frontend and UX design,
- Testing, documentation, and presentation.

We followed a collaborative development model where architecture and integration decisions were made together, while implementation responsibilities were modularized.

This role clarity allowed us to build faster and maintain consistency across backend APIs, frontend visualization, and analytical logic.

---

## Slide 3 - AGENDA
Our presentation flow is:
1. Project definition,
2. System flow,
3. Workforce signals,
4. Decision modules,
5. Mathematical intelligence,
6. Governance and conclusion.

The reason for this order is simple: first we establish why Aurelius is needed, then show how data moves through the system, then explain how numerical indicators are interpreted for decisions.

---

## Slide 4 - THE PROBLEM
Modern HR technology suffers from three severe issues:

1. **Passive data silos**
- Managers spend excessive time manually searching across systems.
- Early attrition warnings are often missed.

2. **Talent acquisition blindspots**
- Role matching is frequently subjective and inconsistent.
- Skill-fit precision is weak in many manual pipelines.

3. **No interactive intelligence**
- Static dashboards show reports but cannot reason through natural-language decisions.

Impact snapshot highlighted in our slide:
- high replacement-cost multipliers,
- high executive concern around talent gap visibility,
- and significant monthly admin hours wasted in reporting preparation.

So the core issue is not lack of data. The issue is lack of **integrated predictive decision intelligence**.

---

## Slide 5 - THE SOLUTION
Aurelius is our answer to this gap.

We present Aurelius as an HR Intelligence OS built around one sequence:
**Observe -> Predict -> Explain -> Act**.

What Aurelius is:
- A unified workspace combining live records, predictive scoring, explainable insights, and governed actions.

Why it exists:
- Existing HR tools are fragmented and reactive.

How it helps:
- It converts distributed data into ranked risk signals, intelligent search outputs, and intervention workflows from one platform.

This gives HR leaders one execution surface instead of disconnected tools.

---

## Slide 6 - SYSTEM ARCHITECTURE
Now the end-to-end flow.

Our runtime architecture has four layers:

1. **Backend services** (FastAPI)
- Handle authentication, ingestion, analytics, scoring, and workflow endpoints.

2. **Frontend workspace** (React/Vite)
- Dashboard, directory, sentiment, scout, chat, intelligence center, enterprise ops.

3. **Data layer** (SQLModel + SQLite demo mode)
- Stores employees, candidates, skills, experience, interventions, policy artifacts.

4. **Math + AI layer**
- Risk formulas, graph intelligence, optimization solvers, and structured AI responses.

Runtime flow shown in slide:
1) API/CSV input -> 2) Validation and RBAC -> 3) Database write -> 4) Analytics retrieval -> 5) UI modules/chat -> 6) Governed outputs.

This architecture is intentionally modular for maintainability and future deployment extension.

---

## Slide 7 - WORKFORCE SIGNALS
This slide defines what core workforce metrics mean.

### At Risk In View
Count of currently visible employees flagged by risk logic after active filters.

### At-Risk Ratio
Percentage of currently visible employees crossing warning threshold.

### Intervention Priority
Urgency level generated from risk severity, confidence, and expected impact.

### Signal explanation terms
- **Current Score**: latest model state right now.
- **Confidence**: strength/reliability of current estimate.
- **Velocity**: direction and rate of short-term change.
- **Sentiment Score**: normalized morale indicator.
- **Risk Vector**: combined pressure from multiple risk drivers.

These definitions are implemented in backend analytics logic and surfaced directly in frontend cards.

---

## Slide 8 - PREDICTIVE ATTRITION
Aurelius treats attrition as a probability-over-time problem rather than a binary label.

Key meaning:
- Survival logic estimates whether an employee remains in role over time.

In operational terms:
- lower sentiment trend,
- pay/growth mismatch,
- and sustained overload
raise attrition pressure.

In our enterprise scoring logic, risk is computed from sentiment, retention probability, and rule flags, then clamped and ranked for action.

When at-risk ratio increases, intervention priority escalates.

This turns prediction into preemptive HR action, not post-event reporting.

---

## Slide 9 - SENTIMENT INTELLIGENCE
This slide explains morale as a decision variable.

### What sentiment is
A normalized morale signal in the 0 to 1 range used for workforce health analysis.

### Why it matters
Sentiment drift often appears before formal KPI decline or resignation events.

### How we use it
A low current score, negative velocity, and strong confidence together increase urgency.

### Component meanings
- **Current Score**: latest sentiment estimate.
- **Confidence**: trust level for estimate (sample-size weighted in our current implementation).
- **Velocity**: change from previous snapshot.
- **Recovery Signal**: evidence of improvement.
- **Escalation Trigger**: threshold where monitoring becomes intervention.

This is powered by live SSE updates from `/api/v1/ai/sentiment/stream`.

---

## Slide 10 - TALENT SCOUT
Talent Scout reduces manual screening through structured ranking.

Workflow:
1. User provides role/skills/department/problem input.
2. System filters talent pool.
3. Fit score is calculated and ranked.
4. Ranking explanation is produced.
5. Next action is suggested.

Value:
- faster shortlist creation,
- better consistency,
- evidence-backed matching instead of purely subjective filtering.

---

## Slide 11 - AURELIUS INTELLIGENCE CHAT
The chat layer provides natural language HR analytics with guardrails.

Pipeline:
- Prompt -> Sanitize -> Retrieve -> Reason -> Structured response.

Why important:
- Non-technical users can access complex analytics without SQL.
- Responses are tied to context payloads, not arbitrary text generation.

This enables fast executive exploration while preserving structured decision flow.

---

## Slide 12 - INTELLIGENCE CENTER
This is our executive decision workbench.

Three core capabilities:
- **Observe**: Inspect risk, team, network, and talent signals together.
- **Simulate**: Compare candidate and team options before execution.
- **Decide**: Move from analytics to prioritized intervention actions.

Workbench action sequence:
- view model results,
- compare scenarios,
- inspect explanations,
- check priority,
- launch action.

So this module closes the gap between analysis and execution.

---

## Slide 13 - ONA + SEMANTIC SKILLS GRAPH
Org charts alone do not reveal real influence flow.

So we add graph intelligence:
- **PageRank** to find influential knowledge hubs,
- **Betweenness centrality** to detect bridge employees and silos,
- **Semantic skills graph** to reveal related skills, hidden experts, and capability gaps.

Result:
- better cross-team visibility,
- stronger succession and project staffing intelligence,
- and detection of collaboration bottlenecks.

---

## Slide 14 - OPTIMAL TEAM ASSEMBLY
Team formation is combinatorial and cannot be solved by naive brute force at scale.

So we use **simulated annealing**:
- start with broad exploration,
- accept occasional imperfect moves early (Metropolis criterion),
- gradually cool toward stable high-quality combinations.

Optimization objective balances:
- skill coverage,
- role fit,
- diversity/distribution,
- and budget constraints.

Implementation detail:
- prefetch and in-memory evaluation improve responsiveness for demo and practical use.

---

## Slide 15 - GOVERNANCE & PRIORITY
Aurelius is not automation without control.

Priority levels:
- high, medium, low urgency mapped from risk evidence.

But sensitive actions remain human-governed:
- role checks,
- approval gates,
- audit trail entries.

For example, high-impact interventions can require elevated authorization.

Audit ledger records:
- timestamp,
- actor,
- evidence,
- proposed action,
- approval status.

So the platform supports accountable AI-assisted decisions.

---

## Slide 16 - PERFORMANCE
To keep demo and operational flow responsive, we applied:
- batched imports,
- prefetch strategy to avoid N+1 query loops,
- async jobs for heavy operations,
- capped views for stable rendering.

Net effect:
- faster ingestion,
- lower read/write overhead,
- smoother large-import behavior in presentation and validation scenarios.

---

## Slide 17 - MATHEMATICAL INTELLIGENCE ENGINE
Different HR decisions require different model families.

So Aurelius combines:
- **Survival models** for attrition timing pressure,
- **Graph theory** for influence and bridge detection,
- **Combinatorial optimization** for team assembly,
- **Semantic matching** for skills and fit,
- **Markov transitions** for mobility forecasting.

This multi-model design is central: no single model can answer every workforce decision question accurately.

---

## Slide 18 - ROADMAP & CAREER PATHS
Current system already supports explainable prediction and guided intervention.

Roadmap:
- **Phase 1**: explainable talent graph + vector matching,
- **Phase 2**: internal mobility and career-path forecasting,
- **Phase 3**: closed-loop workflow automation with approvals.

Markov transition logic extends decision support from �current workforce risk� to �future role mobility strategy.�

Key conclusion from this slide:
Aurelius is a university-ready prototype that integrates HR data, explainable models, and governed AI interaction into one coherent decision platform.

---

## Slide 19 - ACADEMIC SOURCES
This final slide contains the academic references that ground our methodology:
- survival modeling,
- graph centrality,
- optimization,
- AI in decision systems,
- burnout and workforce signal theory,
- and Markov manpower planning.

These references are not decorative; they directly map to modules implemented in our architecture and workflows.

---

## Final Closing (Use after Slide 19)
To conclude, Aurelius demonstrates full end-to-end integration:
- ingestion,
- validation,
- analytics,
- predictive scoring,
- explainable ranking,
- governed intervention,
- and executive decision support.

Our contribution is building an HR intelligence OS that turns fragmented workforce data into practical, explainable, and controlled action.

Thank you. We are ready for questions.
