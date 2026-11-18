# 02. Privacy Controls and GDPR Governance

01. **Admin-Only Privacy API (`server/app/api/v1/privacy.py`, `PrivacyGovernanceView.jsx`):**
    - All endpoints require `is_admin = True` and enforce `tenant_id` isolation.
    - **Consents (`GET/POST /api/v1/privacy/consents`, `POST /consents/{id}/withdraw`):** Tracks `subject_ref`, `purpose`, `legal_basis`, `region`, `expires_at`, and `status` (`active | withdrawn`).
    - **Retention Policies (`GET/POST /api/v1/privacy/retention`):** Configures `data_class`, `retention_days`, and `deletion_mode` (`review_required`, etc.).
    - **Sensitive Field Policies (`GET/POST /api/v1/privacy/sensitive-fields`):** Defines entity/field masking rules (`salary`, `email`, etc.) enforced during agent tool reads.
    - **Data Subject Exports (`GET/POST /api/v1/privacy/exports`):** Tracks `PrivacyExportRequestTable` fulfillment requests.
