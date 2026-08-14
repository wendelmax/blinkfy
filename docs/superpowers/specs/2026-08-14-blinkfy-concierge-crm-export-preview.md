# Blinkfy Concierge — CRM export preview

The reviewed pipeline can now normalize a consented application for HubSpot,
Salesforce, or Pipedrive. The endpoint is a preview-only contract: it performs
workspace/job authorization, checks active presentation consent, records an
audit event, and returns `approved: false` and `transmitted: false`.

No CRM API is called in this slice. Any future delivery requires a separate
provider authorization and human approval workflow.
