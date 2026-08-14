# Blinkfy Concierge — MCP manifest

Concierge exposes a client-scoped read-only MCP capability manifest for
approved orchestration tooling. Tools are disabled by default, require human
approval, and report `transmitted: false`; this endpoint does not execute MCP
tools or accept credentials.
