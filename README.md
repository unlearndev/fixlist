# Fixlist

The repairs inbox for a small lettings agency. Tenants report problems by email or a web form, staff type up phone calls, and an AI triage feature reads each report and suggests a category, an urgency and a job summary for the contractor. Staff check the triage before anyone is booked.

It's the demo project for the Unlearn course "Test AI Features with Evals". Every property, tenant, phone number and report in it is made up. Phone numbers are in Ofcom's range for drama (07700 900xxx) and email addresses use example.com.

## Running it

Node 22.18 or later (it runs the TypeScript files directly).

```bash
npm install
npm run dev        # the inbox, on http://localhost:5173
npm test           # unit tests
npm run typecheck
```

Triaging a report calls Claude, so it needs an Anthropic API key in your environment:

```bash
export ANTHROPIC_API_KEY=...   # from the Claude Console
npm run triage -- T-1022       # triage one report from the log again
```

## What's where

- `src/triage/`: the AI feature. `prompt.ts` has the system prompt (the agency's repairs policy) and builds the message for each report, `triage.ts` calls Claude with structured output, `config.ts` picks the model.
- `data/triage-log.jsonl`: two months of usage. Every report, what the triage said, and what staff saved after checking it.
- `data/properties.json`: the agency's properties and tenants.
- `server/`: the small API, mounted on Vite's dev server.
- `src/views/`: the inbox.
