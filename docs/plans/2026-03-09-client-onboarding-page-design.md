# Client Onboarding Page - Design Document

> **Status: Completed** — Implemented 2026-03-09. This document is an archived planning record.

**Date:** 2026-03-09
**Status:** Approved
**Project:** AEOthis client onboarding wizard
**Depends on:** Client proposal page (2026-03-09-client-proposal-page-design.md)

---

## Overview

A guided, two-step onboarding page at `aeothis.com/clients/{slug}/onboard/` that collects the two things we need from each client: an email alias and website access. Provider-specific instructions are pre-populated based on data we already have from site_check.py and MX record lookups.

---

## User Flow

1. Client views proposal page at `clients/{slug}/`
2. Client clicks "Let's Get Started" button
3. Button links to `clients/{slug}/onboard/` (not mailto)
4. Client completes two guided steps
5. Form submits to webhook at `agents.johnnytran.ca/api/aeothis/`
6. Johnny gets notified
7. Client sees confirmation message

---

## Page Structure

### Navigation
- Same nav as proposal page (AEOthis logo, link back to aeothis.com)
- `<meta name="robots" content="noindex, nofollow">`

### Hero
- Client logo (reuse `../logo.png`)
- "Welcome aboard, {Client Name}"
- Subtext: "Just two quick things and we'll get to work."

### Step 1: Email Alias

**Card layout with:**
- Step number indicator (circled "1")
- Title: "Create an email alias"
- What: "Create an email alias like `aeo@{domain}` that forwards to `hello@aeothis.com`"
- Why: "We use this to set up third-party profiles on your behalf. Every account will belong to your domain, so you keep full ownership."
- Expandable "Show me how" section (collapsed by default, click to expand)
  - Provider-specific numbered steps (see Provider Instructions below)
- Input field: text input for the alias they created
  - Placeholder: `aeo@{domain}`
  - Validation: must contain `@{domain}`

### Step 2: Website Access

**Card layout with:**
- Step number indicator (circled "2")
- Title: "Grant us website access"
- What: "Grant us temporary access to your website so we can install your AEO pages."
- Why: "We'll add your Answer Hub, Brand Facts page, and schema markup. This typically takes one session, and you can revoke access after."
- Expandable "Show me how" section (collapsed by default)
  - CMS-specific numbered steps (see Provider Instructions below)
- Input fields vary by CMS:
  - **Wix:** Checkbox confirmation "I've sent the invite to hello@aeothis.com"
  - **WordPress:** Login URL + Username + Password fields
  - **Squarespace:** Checkbox confirmation "I've sent the invite to hello@aeothis.com"
  - **Shopify:** Checkbox confirmation "I've sent the invite to hello@aeothis.com"

### Submit Button
- "I'm Ready, Let's Go"
- Disabled until both steps are filled/checked
- Posts JSON to webhook endpoint

### Confirmation State
- After successful submit, form hides and shows:
- Checkmark animation
- "You're all set. We'll start work this week and send you your first progress report within 30 days."
- No further action needed from client

---

## Provider Instructions (Pre-written)

### Email Providers

**Google Workspace:**
1. Go to admin.google.com and sign in
2. Click "Directory" then "Users"
3. Click the user you want to add the alias to
4. Click "User information" then "Alternate email addresses"
5. Click "Add alternate email"
6. Type `aeo` in the alias field
7. Click "Save"
8. Set up forwarding: go to Gmail settings for the alias, forward to hello@aeothis.com

**Microsoft 365:**
1. Go to admin.microsoft.com
2. Click "Users" then "Active users"
3. Select the user
4. Click "Manage email aliases"
5. Add `aeo@yourdomain.com`
6. Set up a forwarding rule to hello@aeothis.com

**GoDaddy:**
1. Go to email.godaddy.com
2. Click "Create Forwarding"
3. Enter `aeo` as the alias
4. Set forward-to as `hello@aeothis.com`
5. Click "Create"

**cPanel / Webmail:**
1. Log in to your cPanel
2. Under "Email," click "Forwarders"
3. Click "Add Forwarder"
4. Enter `aeo` in the address field
5. Enter `hello@aeothis.com` as the destination
6. Click "Add Forwarder"

### CMS Providers

**Wix:**
1. Go to your Wix Dashboard
2. Click "Settings" in the left menu
3. Click "Roles & Permissions"
4. Click "Invite People"
5. Enter `hello@aeothis.com`
6. Set role to "Admin"
7. Click "Send Invite"

**WordPress:**
1. Log in to your WordPress admin (usually yourdomain.com/wp-admin)
2. Go to "Users" then "Add New User"
3. Enter username: `aeothis`
4. Enter email: `hello@aeothis.com`
5. Set role to "Administrator"
6. Click "Add New User"
(Or share your existing admin login below)

**Squarespace:**
1. Go to your Squarespace Dashboard
2. Click "Settings" then "Permissions"
3. Click "Invite Contributor"
4. Enter `hello@aeothis.com`
5. Set permission to "Administrator"
6. Click "Invite"

**Shopify:**
1. Go to your Shopify Admin
2. Click "Settings" then "Users and permissions"
3. Click "Add staff"
4. Enter `hello@aeothis.com`
5. Check all permissions
6. Click "Send invite"

---

## Technical Implementation

### File Structure
```
aeothis-site/
  clients/
    {slug}/
      index.html          # Proposal page
      logo.png            # Client logo
      onboard/
        index.html         # Onboarding wizard
```

### Form Submission
- POST to `https://agents.johnnytran.ca/api/aeothis/onboard`
- Include `X-AEO-Token` header (same as get-started chatbot)
- JSON payload:
  ```json
  {
    "client": "{slug}",
    "email_alias": "aeo@fitkids.ca",
    "website_access": {
      "type": "wix_invite",
      "confirmed": true
    }
  }
  ```
- For WordPress credential submissions:
  ```json
  {
    "client": "{slug}",
    "email_alias": "aeo@fitkids.ca",
    "website_access": {
      "type": "wordpress_credentials",
      "login_url": "https://...",
      "username": "...",
      "password": "..."
    }
  }
  ```

### Webhook Endpoint
- Extend existing `webhook/app.py` to handle `/onboard` route
- Save submission to `submissions/{slug}_onboard_{date}.json`
- Send notification to Johnny (Telegram or email)

### Proposal Page Change
- Update CTA button href from `mailto:...` to `onboard/`

### Styling
- Reuse existing proposal page CSS classes where possible
- New classes needed for the wizard steps, expandable sections, and form inputs
- Match AEOthis design system (Inter, purple accent, dark theme)

### Detection Data (Pre-populated Per Client)
When building an onboarding page, Claude will:
1. Run `dig MX {domain} +short` to detect email provider
2. Use site_check.py data or known CMS from client config
3. Select the matching instruction set for both email and CMS
4. Hardcode the correct instructions into the page

---

## What's NOT in v1
- Webhook `/onboard` endpoint (can be added when first client submits, or use FormSpree initially)
- Automated Telegram notification on submit
- Password field encryption beyond HTTPS
- Multi-step progress indicator
