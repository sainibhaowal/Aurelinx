# Talent Scout Matchmaker

## 01. Talent Scout Matchmaker

Talent Scout is the intelligent search and matchmaking component of Aurelinx, designed to connect high-level conceptual roles with matching personnel profiles.

#### Why Talent Scout? The Failure of Keyword Searches

Standard hiring software uses rigid **keyword matching**. If you search for *"Python developer"* , a resume containing *"FastAPI expert"* or *"Django engineer"* might be completely ignored simply because the exact word "Python" wasn't found.

**Talent Scout solves this** by using semantic token overlap and AI reasoning. It matches candidates based on the *concepts* and *context* of their skills, identifying suitable hires who would otherwise be filtered out.

### Talent Scout Matchmaking Pipeline

1

INPUT STAGE

Natural Query

Accepts natural prompts, extracts skill/role/dept tokens.

2

MATCHING

Token Scoring

Intersects search tokens with Postgres skill sets, roles, & CV match scores.

3

SAFETY

Retention Filter

Evaluates target department workload & morale levels to prevent placement shocks.

4

OUTPUT STAGE

LLM Summary Brief

Typewriter streams recommendation rationales, strengths, and candidate gap warning matrices.

### Under the Hood: Score Calculations

When a search is submitted, the matching engine extracts tokens from your query and calculates match weights differently for candidates and employees:

**👥 Internal Employees Scoring Formula**

Internal profiles are matched to identify transfer opportunities. Sentiment is heavily weighted to help prevent burnout, and active risks are penalized:

Score = (Skill_Hits * 2.5) + (Role_Hits * 2.0) + (Dept_Hits * 1.2) + (Sentiment_Score * 1.1) - (0.6 if At_Risk)

**👤 External Candidates Scoring Formula**

External resumes are ranked primarily based on technical fit, combining search overlap with their pre-calculated CV parse score:

Score = (Skill_Hits * 2.6) + (Role_Hits * 2.1) + (Dept_Hits * 1.3) + (Sentiment_Score * 1.0) + (Match_Score * 1.8)

### What You Get: The AI Scout Brief

Rather than displaying raw data grids, the matched candidate payloads are sent to an LLM provider of choice. The system streams a typewriter brief containing:

- **Best Overall Match:** Identifies the single best candidate and provides a detailed rationale.
- **Strengths of Top 3:** Breaks down specific skill advantages and match factors.
- **Risks & Gaps:** Warns you of potential skill gaps (e.g. candidate lacks cloud experience) or onboarding issues.
- **Final Recommendation:** Clear, actionable advice on next interview steps or job offers.
### End-to-end operating guide

- **Configure a provider:** choose the active provider and model in Providers & Webhooks. Local LM Studio uses its configured endpoint; hosted providers require the appropriate key and endpoint.
- **Describe the need:** enter a natural-language role, skills, seniority, or department request, then select **Scout Talent** . The request is sent to the protected analysis API.
- **Wait for completion:** the pipeline reports prepare request, search full pool, rank evidence, generate explanation, and return result cards. The displayed elapsed time and searched/returned counts come from the server response.
- **Review the brief:** read the returned explanation and candidate cards. The explanation is provider-generated assistance, not a hiring decision or proof of suitability.
- **Refine results:** filter the returned set by department, role, and minimum stored match score. The filters act on returned results; they do not trigger a new database search.
- **Take review notes:** shortlist candidates, select up to three for comparison, assign New/Review/Shortlisted/Rejected status, and save a local review note.
- **Open evidence:** select a result card to load the full candidate profile, including application date, match index, sentiment, compensation expectation, skills, and experience. Close the dossier when finished.
- **Export or continue:** export the shortlist when one exists; otherwise export the filtered results as PDF, Excel, or Markdown. Continue governed recruiting review outside the automated ranking.
### Search history and local workspace state

- Completed searches are saved locally on the current device, with the latest ten queries retained. Selecting a history item restores its query, result cards, and generated brief; it does not re-run the server search.
- Shortlist, candidate status, and review notes are also stored locally and are not an HRIS write, shared workflow record, or hiring decision.
- “Returned” is the number of cards returned by the analysis response. “Visible” is the number remaining after local filters. Duplicate email and incomplete-profile counts are data-quality warnings for the visible set.
### Filters, comparison, and exports

**Returned-result filters**

Department and role lists are built from the returned cards. The score slider uses a 0-1 stored match-score scale and keeps candidates at or above the selected threshold.

**Comparison**

Compare up to three candidates at once using match score, sentiment, role, and department. Clear removes the comparison selection without deleting the result.

**Shortlist**

Shortlist toggles a candidate in local device storage. If the shortlist is non-empty, exports use it; otherwise exports use the currently filtered result set.

**Export boundary**

Exports contain candidate records selected by the rule above. They do not export the full database, hidden results, provider secrets, or a guarantee of hiring quality.

### Candidate dossier and interpretation

- The dossier loads on selection, not for every card. It shows the candidate identity, contact, application date, match index, morale sentiment, external status, compensation expectation, five-segment skills, and chronological experience.
- Match index is the stored candidate match score rendered as a percentage. The ranking score used by the server is separate from that displayed stored score.
- Missing skills or experience are displayed as unavailable records; they are not silently invented. Compensation shown when absent is an illustrative DEMO value and must not be treated as authoritative.
- Candidate sentiment is contextual metadata, not an interview result or psychological assessment. Use structured interviews, validated job criteria, and authorized human review for decisions.
### Loading, provider errors, and safety

- While running, the button is disabled and the pipeline shows its active stage. Do not submit duplicate searches during the active request.
- An analysis failure means the provider, endpoint, model, authentication, or backend request needs attention. Check Providers & Webhooks and the local LM Studio service when applicable, then retry.
- A profile-load failure affects only the selected dossier; it does not prove the candidate is missing from the search result.
- Do not use ranking, sentiment, compensation, demographic proxies, or AI explanations as the sole basis for hiring, rejection, promotion, or compensation. Review evidence, apply consistent job-related criteria, document the human decision, and follow applicable policy.
