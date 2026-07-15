import numpy as np
from sqlmodel import Session, select
from app.models.database import engine, CandidateTable, SkillTable
from langchain_openai import OpenAIEmbeddings


class ScreeningEngine:
    """
    Real Intelligence Engine for Semantic Candidate Matching.
    Uses Vector Embeddings to understand 'Concepts' rather than just keywords.
    """

    @staticmethod
    def get_semantic_matches(query: str, api_key: str, limit: int = 5):
        # 1. Initialize Embeddings with the user's provided API key
        embeddings_model = OpenAIEmbeddings(openai_api_key=api_key)

        # 2. Fetch all candidates from the DB and compile profile descriptions
        candidate_texts = []
        with Session(engine) as session:
            candidates = session.exec(select(CandidateTable)).all()
            if not candidates:
                return []

            # 3. Prepare texts for embedding (Full profile string)
            for c in candidates:
                skills_list = session.exec(
                    select(SkillTable).where(SkillTable.candidate_id == c.id)
                ).all()
                skills = ", ".join([s.name for s in skills_list])
                text = f"Role: {c.role}. Department: {c.department}. Skills: {skills}."
                candidate_texts.append(text)

        # 4. Generate Embeddings (Conceptual Vectors)
        # Note: In a larger production app, we would cache these in a Vector DB.
        cand_vectors = embeddings_model.embed_documents(candidate_texts)
        query_vector = embeddings_model.embed_query(query)

        # 5. Calculate Similarity (Cosine)
        # We manually compute this for the MVP to avoid extra heavy dependencies
        similarities = []
        q_v = np.array(query_vector)
        for i, c_v in enumerate(cand_vectors):
            c_v_np = np.array(c_v)
            score = np.dot(q_v, c_v_np) / (np.linalg.norm(q_v) * np.linalg.norm(c_v_np))
            similarities.append((score, candidates[i]))

        # 6. Sort and return the best matches
        similarities.sort(key=lambda x: x[0], reverse=True)

        return [
            {
                "id": str(item[1].id),
                "name": item[1].full_name,
                "role": item[1].role,
                "match_score": round(item[0] * 100, 1),
                "department": item[1].department,
            }
            for item in similarities[:limit]
        ]


screening_service = ScreeningEngine()
