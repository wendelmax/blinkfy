# LATAM Tax & Compliance Engine

This engine handles the legal and financial nuances of holding funds (Retention) and managing tax obligations for developers across Latin America.

## 1. Smart Wallet & Retention (Escrow System)

The platform acts as a secure intermediary through a "Smart Wallet":

- **Fund Retention:** When a client pays, the funds are held in a platform-controlled escrow account.
- **Deduction Engine:** Before release, the system calculates and withholds:
    - Platform Service Fee.
    - Local Tax Provisions (e.g., ISS, IRPJ in Brazil; ISR, VAT in Mexico).
    - Social Security Contributions.
- **Staged Payouts:** Funds are released to the developer's local account only after milestones are approved or monthly cycles are met.

## 2. Automatic Tax Management (The "Legal Bridge")

To solve the "Burden of Compliance", the platform automates:

### A. Tax Payment (DARF/Payment Slips)
- **Automatic Generation:** The system generates the local tax slips (e.g., DARF in Brazil) based on the monthly income.
- **Split-Payment:** The platform can pay the tax slip directly using a portion of the withheld funds, so the developer only receives the "Net Income".

### B. Tax Declarations (IR / Annual Filings)
- **Annual Income Report:** Automatic generation of the "Informe de Rendimentos" or equivalent for individual income tax declarations (IRPF).
- **Audit Logs:** Full traceability of every dollar processed, converted, and taxed, ready for tax authority inquiries.

## 3. LATAM Country-Specific Nuances

| Country | Key Focus for Automation | Specific Forms/Rules |
| :--- | :--- | :--- |
| **Brazil** | Fator R, Simples Nacional, ISS Exemption. | DARF, NF-e, DIRF. |
| **Mexico** | RESICO (Regimen Simplificado), VAT (IVA). | CFDI, Constancia de Situación Fiscal. |
| **Argentina** | Monotributo, Official vs Blue Rate logic. | Factura E (Export), SIRADIG. |
| **Colombia** | Retención en la Fuente, EPS/Pension. | Documento Soporte, Planilha de Segurança Social. |

## 4. Nuance: "Proof of Compliance"

Recruiters and Clients receive a **Compliance Certificate** for each developer, proving that all local taxes and social contributions are being paid. This eliminates "Co-employment" risks for the international company.

---

> [!IMPORTANT]
> **Legal Power of Attorney:** The candidate can opt-in to a "Limited Power of Attorney" within the platform, allowing the system's partner accounting firms to sign and file documents on their behalf.
