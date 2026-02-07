# Database Schema & Data Strategy

This document outlines the technical data model for the international recruitment platform. The schema is designed for scalability, localized performance, and flexible technology mapping.

## 1. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USER ||--o| CANDIDATE_PROFILE : "has"
    USER ||--o| RECRUITER_PROFILE : "belongs to"
    CANDIDATE_PROFILE ||--o{ CANDIDATE_TECHNOLOGY : "uses"
    TECHNOLOGY ||--o{ CANDIDATE_TECHNOLOGY : "is used by"
    TECHNOLOGY ||--o{ JOB_REQUIREMENT : "is required by"
    JOB ||--o{ JOB_REQUIREMENT : "has"
    ROLE ||--o| CANDIDATE_PROFILE : "defines"
    ROLE ||--o| JOB : "categorizes"
    RECRUITER_PROFILE ||--o{ LANDING_PAGE : "manages"
    RECRUITER_PROFILE ||--o{ ATTRIBUTION_SOURCE : "creates"
    ATTRIBUTION_SOURCE ||--o{ TRAFFIC_LOG : "generates"
    USER {
        uuid id PK
        string email
        string full_name
        string country_code
        enum user_type "candidate, recruiter, admin"
    }
    CANDIDATE_PROFILE {
        uuid id PK
        uuid user_id FK
        uuid role_id FK
        string linkedin_url
        string github_url
        float speech_proficiency_score
    }
    LANDING_PAGE {
        uuid id PK
        uuid recruiter_id FK
        uuid job_id FK
        string slug "e.g., /senior-dev-referral"
        jsonb custom_styles
    }
    ATTRIBUTION_SOURCE {
        uuid id PK
        uuid recruiter_id FK
        string channel "e.g., LinkedIn, WhatsApp"
        string tracking_code PK
    }
    TRAFFIC_LOG {
        uuid id PK
        uuid attribution_source_id FK
        timestamp clicked_at
        string ip_address
    }
    TECHNOLOGY {
        uuid id PK
        string name "e.g., React, Node.js"
        boolean is_standard "true for seeded, false for user-added"
    }
    ROLE {
        uuid id PK
        string title "e.g., Backend Engineer"
    }
```

## 2. "Suggest vs Input" Logic

To maintain data cleanlines while allowing flexibility:
1.  **Selection:** When a user (candidate or recruiter) adds a technology, the UI first provides a list of `standard` technologies (where `is_standard = true`).
2.  **Creation:** If the technology is not found, the user can type a custom name.
3.  **Handling:** The system creates a new entry in the `TECHNOLOGY` table with `is_standard = false`. Admins can later review these custom entries and merge them into standard ones if they reach a certain threshold of usage.

## 3. Core Tables Reference

### `technologies`
Standardized list of tech stacks to enable the AI matching engine.

### `roles`
Categorization of job functions to align expectations between hiring managers and developers.

### `candidate_technologies`
Join table with `proficiency_level` (1-5) and `years_of_experience` to refine the Match Score.

### `landing_pages`
Stores custom templates and settings for recruiter-generated sourcing pages.

### `attribution_sources`
Mapping of unique tracking codes to specific recruiters and channels (LinkedIn, X, etc.).

### `traffic_logs`
High-volume table tracking clicks and candidate origins to power the Attribution Dashboard.

---

> [!NOTE]
> **Internationalization:** All core data (roles, technologies) is stored in English to facilitate matching with international job descriptions. The UI layer handles translation if necessary.
