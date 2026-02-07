# Identity & Access Management (IAM) and Authentication System

This document describes the technical implementation of our custom IAM, designed to provide high-security onboarding and granular access control.

## 1. Role-Based Access Control (RBAC)

The system manages different "Personas" with specific permission sets:

- **Candidate:** Full access to their own profile, job search, AI screening, and payment management.
- **Recruiter (Independent):** Access to hunting tools, candidate submission, and commission dashboards.
- **Recruiter (Agency):** Team-based access with hierarchy for shared pipelines and agency-level billing.
- **Admin:** System-wide monitoring, user management, and standard technology auditing.

## 2. Multi-Factor Authentication (MFA) & Tokens

To ensure session security, we implement a multi-layered verification:

- **Primary Auth:** Email/Password or Social Login (OAuth2).
- **MFA Challenge:** 
    - **Email/SMS Token:** A time-based one-time password (TOTP) sent via Amazon SES or Twilio.
    - **Push Notification:** Automated token sent to the mobile app for one-tap approval.
- **Magic Links:** Optional token-based passwordless login for ease of use.

## 3. Biometric & Face Recognition (Identity Verification)

As part of our anti-fraud strategy (KYC), we use "Liveness Detection":

- **Face Recognition:** During onboarding or before high-value financial actions (e.g., withdrawing funds), the system requests a face scan.
- **Technology:** Integration with AWS Rekognition or Azure Face API to compare the live scan with the uploaded identity document (Passport/RG).
- **Liveness Proof:** Asking the user to blink or turn their head to prevent the use of static photos.

## 4. Nuance: "Zero-Trust Integration"

Every API request is validated against the **Contextual IAM**:
1.  **Identity:** Who is the user? (JWT/Token).
2.  **Origin:** Is the request coming from a trusted device/IP?
3.  **Permissions:** Does this role have the `SCOPE` to perform this action?

---

> [!CAUTION]
> **Data Privacy:** Biometric data is never stored as raw images. Only encrypted "Face Embeddings" (mathematical hashes) are kept, ensuring compliance with GDPR and LGPD.
