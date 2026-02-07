# Competence vs. Salary Auction Engine

This module describes our proprietary algorithm that ranks candidates not just by their skills, but by their "Value-to-Cost Efficiency".

## 1. The Efficiency Index (E-Score)

The system uses a mathematical model to calculate the **Efficiency Index (E-Score)** for each candidate relative to a specific job opening:

$$E = \frac{C \times W}{S}$$

-   **C (Competence):** A score from 0 to 100 derived from GitHub audit, LinkedIn parsing, and Technical Interview.
-   **S (Salary):** The candidate's salary expectation (monthly or hourly).
-   **W (Weight):** Adaptive weights based on the job requirements (e.g., Seniority vs. Budget focus).

## 2. Dynamic Ranking (The "Auction" View)

Recruiters don't see a flat list. They see a **Live Ranking** where candidates are categorized:

-   **High Value (Top Efficiency):** High technical score with competitive salary expectations.
-   **Premium (Top Skills):** Highest technical scores, regardless of salary (within budget).
-   **Efficiency Picks:** Low/Mid salary expectations with high growth potential scores.

## 3. Reverse Auction Dynamic

Candidates can see their **Positioning** in the market without seeing other candidates' names:
-   **Feedback:** "Your current bid puts you in the Top 10% for efficiency in roles like Senior Backend Engineer."
-   **Adjustment:** Candidates can choose to adjust their salary expectation to increase their "Discoverability" if they are not receiving interview requests.

## 4. Nuance: "Fair Market Value"

To prevent a "Race to the Bottom", the AI sets a **Price Floor** based on global market data. If a candidate bids too low for their skill level, the system flags it as "Potential Burnout/Suspicious" and suggests a fair market adjustment to protect both sides.

---

> [!TIP]
> **Recruiter View:** Recruiters can toggle a "Budget Slider" and the ranking updates in real-time to show who offers the best ROI (Return on Investment) for that specific budget.
