# Blinkfy Concierge communication queue

The Hire job view now includes one review queue for assisted communication drafts across all applications. Recruiters can filter pending drafts, see the candidate and channel context, and approve or reject each item without opening individual pipeline cards.

The queue uses the existing audited message-suggestion endpoints. Approval is a state transition only; it does not send a message. External communication remains human-controlled, and failures are surfaced without hiding the pending-review state.
