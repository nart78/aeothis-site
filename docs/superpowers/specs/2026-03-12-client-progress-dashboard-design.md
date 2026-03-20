# Client AEO Progress Dashboard

> **Status: Completed** — Implemented. `build_dashboard.py` in aeothis-tools generates and deploys dashboards to `/clients/{slug}/dashboard/`.

## Overview

A client-facing dashboard page where AEOthis clients can track the progress of their AEO engagement across all 7 layers. Clients see what we've completed, what's in progress, and can check off their own action items. Johnny can query Supabase to see client task completion.

## URL Pattern

`aeothis.com/clients/{slug}/dashboard/`

Encrypted with the same access code as the client's proposal page. Follows existing site patterns: `index.unencrypted.html` built from template + data, then encrypted to `index.html`.

## Page Structure

### 1. Header

- AEOthis nav (same as proposal/guide pages)
- Client logo + name
- "Your AEO Progress" tagline

### 2. Overall Progress Bar

- Gradient bar (purple to blue, matching brand)
- Percentage calculated from: completed layers (weight: 10% each for layers 1-5 and 7) + citations (Layer 6 citations split across remaining 40%). In-progress layers count as 0%. Citation denominator is always 9 (the standard engagement). Layers marked N/A are excluded from the denominator (e.g., service businesses skip Layer 7, so it's 50 layers at 12% each + 40% citations).
- Summary text: "5 of 6 layers complete, 2 of 9 citations placed"

### 3. Accordion Layers

Seven expandable sections, one per layer. Each contains:

- **Layer number and name** (e.g., "Layer 1: Answer Intent Mapping")
- **Status badge**: Complete (green), In Progress (amber), Upcoming (gray), N/A (dimmed)
- **Completion date** if done
- **Description** of what was done (1-2 sentences, written by us)
- **Live URL** link if applicable (e.g., Answer Hub page, Brand Facts page)
- **Client action items** (if any for this layer) with interactive checkboxes persisted to Supabase

Layer 6 (Citations) has additional structure:
- Individual citation rows, each with: citation name, platform/site, status, date, and expandable citation copy (the actual text we submitted)
- Organized by month (Month 1, Month 2, Month 3)

Layer 7 shows "N/A - Service Business" for service clients, or full detail for ecommerce.

### 4. Footer

- "Managed by AEOthis" with link to aeothis.com
- Contact: hello@aeothis.com

## Data Architecture

### Our Work (Read-Only to Client)

A `dashboard-data.json` file per client, stored as a **build input only** (not deployed to GitHub Pages):

```
~/aeothis-tools/dashboard-data/
  carpet-hero-carpet-cleaning.json
  203-collectibles-ltd.json
  ...

/clients/{slug}/dashboard/       (deployed)
  index.unencrypted.html          (generated from template + data)
  index.html                      (encrypted)
```

The JSON data is injected inline into the HTML at build time. The JSON files themselves are never pushed to the public site.

Schema:

```json
{
  "client": "carpet-hero-carpet-cleaning",
  "clientName": "Carpet Hero Carpet Cleaning",
  "startDate": "2026-03-11",
  "layers": [
    {
      "number": 1,
      "name": "Answer Intent Mapping",
      "status": "complete",
      "completedDate": "2026-03-11",
      "description": "Tested 31 AI queries across ChatGPT, Perplexity, Gemini, and Claude to map your competitive position.",
      "liveUrl": null,
      "clientActions": []
    },
    {
      "number": 2,
      "name": "Answer Hub",
      "status": "complete",
      "completedDate": "2026-03-12",
      "description": "Built your Answer Hub page ranking the top carpet cleaners in Calgary with you positioned as the top pick.",
      "liveUrl": "https://carpethero.ca/best-carpet-cleaning-in-calgary-2026",
      "clientActions": [
        {
          "id": "layer2-publish-hub",
          "label": "Publish Answer Hub page on your site",
          "note": "Paste the HTML block we provided into a new GoDaddy page."
        }
      ]
    },
    {
      "number": 6,
      "name": "Third-Party Citations",
      "status": "in_progress",
      "completedDate": null,
      "description": "Building 9 authoritative citations across 3 months to establish your presence on external platforms.",
      "liveUrl": null,
      "citations": [
        {
          "month": 1,
          "items": [
            {
              "name": "Wikidata Entry",
              "platform": "Wikidata",
              "status": "complete",
              "date": "2026-03-11",
              "copy": null
            },
            {
              "name": "Google Business Profile",
              "platform": "Google",
              "status": "complete",
              "date": "2026-03-11",
              "copy": null
            },
            {
              "name": "HomeStars Profile",
              "platform": "HomeStars",
              "status": "pending",
              "date": null,
              "copy": "Carpet Hero Carpet Cleaning is a Calgary-based carpet and upholstery cleaning service..."
            }
          ]
        }
      ],
      "clientActions": [
        {
          "id": "layer6-gbp-optimize",
          "label": "Optimize your Google Business Profile",
          "note": "Follow the setup guide we sent you.",
          "link": "../guide/"
        }
      ]
    }
  ],
  "globalActions": [
    {
      "id": "global-email-alias",
      "label": "Set up email alias (aeo@carpethero.ca)",
      "note": "Create an alias that forwards to hello@aeothis.com"
    },
    {
      "id": "global-website-access",
      "label": "Grant website builder access",
      "note": "Send GoDaddy delegate access invite to hello@aeothis.com"
    },
    {
      "id": "global-review-workflow",
      "label": "Add review request to your customer workflow",
      "note": "Ask satisfied customers to leave a Google review. We can help set up an automated request."
    }
  ]
}
```

**Global actions placement**: Rendered as a "Getting Started" section between the progress bar and the accordion layers. These are engagement-wide tasks that don't belong to any specific layer.

### Client Actions (Read/Write via Supabase)

**Table: `client_actions`**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_slug | text | e.g., "carpet-hero-carpet-cleaning" |
| action_id | text | e.g., "layer2-publish-hub", "global-email-alias" |
| checked | boolean | Default false |
| updated_at | timestamptz | Auto-updated |

**Unique constraint** on `(client_slug, action_id)` to prevent duplicates.

**RLS policy**: Allow anonymous read/write filtered by `client_slug`. The access code gate is client-side only and does not authenticate with Supabase. This is an accepted tradeoff: the data in this table is low-sensitivity (boolean checkbox flags only). Someone who guesses a client slug could theoretically toggle checkboxes, but cannot access any sensitive client data. No credentials, financials, or PII are stored in this table.

**Supabase JS client**: Loaded from CDN. On page load, fetch all actions for this client_slug. On checkbox toggle, upsert the row.

**Supabase project**: Uses the existing Mixler Supabase project. The `client_actions` table gets its own RLS policy that permits anon inserts/updates (unlike Mixler's other tables which block anon writes). The anon key and project URL are embedded in the dashboard JS.

### Johnny's Admin Access

Query Supabase directly or via dashboard:
```sql
SELECT * FROM client_actions WHERE client_slug = 'carpet-hero-carpet-cleaning';
```

Or check all clients:
```sql
SELECT client_slug, action_id, checked, updated_at
FROM client_actions
WHERE checked = true
ORDER BY updated_at DESC;
```

## Build Process

**Build script**: `~/aeothis-tools/build_dashboard.py`

Usage: `python3 ~/aeothis-tools/build_dashboard.py <slug>` (or `--all` for all clients)

Steps:

1. Reads the template from `~/aeothis-site/clients/dashboard-template.html`
2. Reads the client's data from `~/aeothis-tools/dashboard-data/{slug}.json`
3. Reads the client's access code from `~/aeothis-tools/clients/{slug}.json` (same source as proposal pages)
4. Injects the data as a `<script>` tag: `const DASHBOARD_DATA = {...}`
5. Outputs `~/aeothis-site/clients/{slug}/dashboard/index.unencrypted.html`
6. Encrypts to `index.html` using the existing encryption approach, but with corrected relative paths for the dashboard depth (`../../../` instead of `../../` for shared assets)
7. Push to GitHub Pages

The encryption logic from `encrypt_proposal.py` will be extracted into a shared function that accepts the HTML content, access code, and relative path depth as parameters. Both proposal and dashboard encryption will use this shared function.

## Visual Design

- Matches existing AEOthis dark theme (proposal pages, guide pages)
- Uses shared `/css/style.css` + page-specific `<style>` block (same pattern as guide page)
- Brand colors: accent purple `#cb6ce6`, CTA blue `#7ed7ed`
- Status colors: complete green `#10b981`, in-progress amber `#f59e0b`, upcoming gray `#64748b`
- Accordion expand/collapse with smooth animation
- Progress bar gradient: purple to blue (left to right)
- Mobile responsive (same breakpoints as guide page)
- Checkbox UI matches GBP guide page pattern (rounded corners, green on check, strikethrough)

## Existing Patterns Referenced

- **Encryption**: Same as proposal pages (`aeodon-proposal` skill pattern)
- **Access gate**: Same 6-digit code input as proposal pages
- **Checkbox persistence**: Extends GBP guide pattern (currently localStorage) to Supabase
- **Copy blocks**: Same `.copy-block` UI from guide page for citation copy
- **Nav/footer**: Same as all client pages
- **CSS**: Extends shared `style.css`, page-specific styles inline

## Client Action Items (Standard Set)

These appear on every client dashboard. Additional per-layer actions are defined in `dashboard-data.json`.

| Action ID | Label | Layer |
|-----------|-------|-------|
| global-email-alias | Set up email alias | Global |
| global-website-access | Grant website builder access | Global |
| global-review-workflow | Add review request to customer workflow | Global |
| layer2-publish-hub | Publish Answer Hub page | Layer 2 |
| layer3-publish-facts | Publish Brand Facts page | Layer 3 |
| layer4-publish-json | Add machine-readable data to site | Layer 4 |
| layer5-publish-schema | Add schema markup to pages | Layer 5 |
| layer6-gbp-optimize | Optimize Google Business Profile | Layer 6 |

## Out of Scope

- Real-time notifications to Johnny when a client checks something off (can add later via Supabase webhooks)
- Client-side editing of layer data (we control that)
- Historical progress tracking / changelog
- Multi-user access per client (one access code per client is sufficient)
- Migrating existing GBP guide page checkboxes from localStorage to Supabase (guide pages keep localStorage for now; only dashboard checkboxes use Supabase)
