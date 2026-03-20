# Client Proposal Page - Design Document

> **Status: Completed** — Implemented 2026-03-09. This document is an archived planning record.

**Date:** 2026-03-09
**Status:** Approved
**Project:** AEOthis client-facing proposal pages

---

## Overview

A personalized, branded webpage for each AEOthis prospect at `aeothis.com/clients/{slug}/`. The page serves as a combined service overview and 90-day roadmap. It replaces PDFs and email attachments with a premium, shareable URL.

The service is fully managed. The client does nothing except create one email alias during onboarding.

---

## Business Context

- **Single package offering:** $300/month, 3-month minimum
- **Full-service model:** AEOthis handles everything (no client homework)
- **Currently free:** Pricing is displayed but no payment collected during validation phase
- **Future state:** Accept button will lead to agreement signing and payment flow

---

## Page Structure

### 1. Navigation Bar
- AEOthis logo (top left)
- Minimal nav: link back to aeothis.com
- Consistent with main site styling

### 2. Hero / Header
- Client's company logo (large, centered or prominent)
- Client's company name
- Tagline: "Your 90-Day AEO Roadmap" or similar
- Co-branded feel: client is the star, AEOthis frames it

### 3. Where You Stand Today
- Current AEO score and letter grade (from Aeona data)
- Mention rate and platform breakdown
- 2-3 sentences contextualizing their position
- If no Aeona data exists yet, a general industry visibility gap statement

### 4. Your 90-Day Roadmap

#### Month 1: Foundation
**What we deliver:**
- Answer Intent Mapping (25 queries across ChatGPT, Perplexity, Gemini, Claude, Grok)
- Baseline AEO score and competitor analysis report
- Answer Hub page built and installed on your site
- Brand Facts page built and installed on your site
- Machine-readable brand data (`brand-facts.json`) deployed
- Schema markup added (Organization, FAQPage)
- 3 third-party citations on high-authority platforms

**What we need from you (one-time only):**
- Create an email alias (e.g., `aeo@yourdomain.com`) forwarding to us
- Grant temporary WordPress admin access for page installation

#### Month 2: Build
**What we deliver:**
- Follow-up AEO scan measuring early movement
- 3 additional third-party citations
- Content refinements based on query performance data
- Schema optimization based on Month 1 results
- Progress report

#### Month 3: Accelerate
**What we deliver:**
- 3 final third-party citations (9 total across engagement)
- Full before-vs-after AEO score comparison
- Final results report with competitive positioning
- Recommendations for ongoing optimization
- Complete handoff: all accounts, credentials, and assets documented

### 5. What's Included
Bullet summary of the full package:
- Full 7-layer AEO implementation
- 25-query AI visibility mapping across 5 platforms
- Answer Hub page
- Brand Facts page
- Schema markup optimization
- Machine-readable brand data
- 9 third-party citations over 3 months
- Monthly progress reports
- Fully managed. We handle everything.

### 6. Investment
- $300/month
- 3-month minimum (90 days to see results)
- No long-term lock-in after initial term
- Note for free phase: "This engagement is complimentary" (or similar)

### 7. Call to Action
- Prominent button: "Let's Get Started" or "Accept Proposal"
- Current: simple FormSpree confirmation or email trigger
- Future: agreement page with digital signature + Stripe payment

---

## Visual Design

- Matches existing AEOthis site style
- Font: Inter
- Accent purple: `#cb6ce6`
- CTA blue: `#7ed7ed`
- Navy tones: `#004370`, `#003059`
- Client logo displayed prominently in hero section
- AEOthis branding in nav bar (not competing with client logo)
- Responsive (mobile-friendly)

---

## Technical Implementation

### File Structure
```
aeothis-site/
  clients/
    {slug}/
      index.html      # Proposal page
      logo.png         # Client logo (auto-extracted)
```

### Logo Extraction (Automated)
When generating a proposal page, Claude will:
1. Fetch the client's website
2. Check for logo in this priority order:
   - Organization schema `logo` property
   - Open Graph image (`og:image`)
   - Header `<img>` tag (typically the site logo)
   - Apple touch icon / favicon (fallback, lower quality)
3. Download the best available image
4. Save to `clients/{slug}/logo.png` (or `.svg` if available)

### Data Sources
- Client config JSON from `~/aeothis-tools/clients/{slug}.json`
- Aeona analysis data from `~/aeothis-tools/data/{client_name}/`
- If no data exists, run Aeona scan first

### Generation Process
1. Fetch client website, extract logo
2. Pull or generate Aeona data
3. Build personalized HTML from template
4. Commit to `aeothis-site` repo
5. GitHub Pages deploys automatically

### Privacy
- Client pages are not linked from main site navigation
- URL is shared directly with the client (private link)
- No indexing (add `<meta name="robots" content="noindex">` to prevent search engines)

---

## What's NOT in v1
- Payment processing (Stripe)
- Digital signature / agreement flow
- Client login or dashboard
- Auto-generation script (pages built by Claude per client)
- Analytics tracking per proposal page

---

## Future Enhancements
- Accept flow: agreement page with e-signature
- Payment integration (Stripe checkout)
- Proposal generator script (like aeo_generator.py but for proposals)
- Client dashboard showing progress against roadmap
- Expiration dates on proposals
