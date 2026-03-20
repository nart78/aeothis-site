# Client Onboarding Page - Implementation Plan

> **Status: Completed** — Implemented 2026-03-09. This document is an archived planning record.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a guided two-step onboarding wizard at `clients/{slug}/onboard/` that collects email alias and website access info, with provider-specific instructions.

**Architecture:** Static HTML page matching AEOthis design system. Two-step card-based wizard with expandable instruction sections. Form submits via fetch() to existing webhook endpoint. Provider instructions are hardcoded per client based on MX records and site_check data.

**Tech Stack:** HTML, CSS (shared style.css + inline), vanilla JS, FormSpree (v1) or webhook (future).

---

### Task 1: Add onboarding page CSS to shared stylesheet

**Files:**
- Modify: `/home/ubuntu/aeothis-site/css/style.css`

**Step 1: Read the CSS file and find insertion point**

Read `/home/ubuntu/aeothis-site/css/style.css`. Find the `/* === RESPONSIVE === */` section. Insert new styles before it, after the existing proposal analysis styles.

**Step 2: Add onboarding styles**

Insert before the responsive section:

```css
/* ── Onboarding Page ── */

.onboard-hero {
  padding: 140px 0 40px;
  text-align: center;
}

.onboard-hero__logo {
  max-width: 200px;
  max-height: 80px;
  margin: 0 auto 24px;
  display: block;
  object-fit: contain;
}

.onboard-hero__title {
  font-size: 36px;
  font-weight: 900;
  letter-spacing: -0.02em;
  margin-bottom: 8px;
}

.onboard-hero__sub {
  font-size: 18px;
  color: var(--text-light);
}

.onboard-step {
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 40px;
  margin-bottom: 24px;
  max-width: 640px;
  margin-left: auto;
  margin-right: auto;
}

.onboard-step__header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.onboard-step__number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--accent);
  color: #000;
  font-weight: 800;
  font-size: 16px;
  flex-shrink: 0;
}

.onboard-step__title {
  font-size: 22px;
  font-weight: 800;
}

.onboard-step__desc {
  color: var(--text-light);
  line-height: 1.7;
  margin-bottom: 8px;
  font-size: 15px;
}

.onboard-step__why {
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 20px;
}

.onboard-howto {
  margin-bottom: 20px;
}

.onboard-howto__toggle {
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 16px;
  color: var(--cta);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  text-align: left;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: inherit;
}

.onboard-howto__toggle:hover {
  border-color: var(--cta);
}

.onboard-howto__icon {
  transition: transform 0.2s ease;
  font-size: 12px;
}

.onboard-howto.is-open .onboard-howto__icon {
  transform: rotate(180deg);
}

.onboard-howto__content {
  display: none;
  padding: 20px;
  margin-top: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.onboard-howto.is-open .onboard-howto__content {
  display: block;
}

.onboard-howto__content ol {
  padding-left: 20px;
  margin: 0;
}

.onboard-howto__content ol li {
  color: var(--text-light);
  line-height: 1.8;
  font-size: 14px;
  margin-bottom: 4px;
}

.onboard-howto__content code {
  background: rgba(126, 215, 237, 0.1);
  color: var(--cta);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}

.onboard-input {
  width: 100%;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-size: 15px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.onboard-input:focus {
  border-color: var(--accent);
}

.onboard-input::placeholder {
  color: var(--text-muted);
}

.onboard-checkbox {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-size: 15px;
  color: var(--text-light);
}

.onboard-checkbox input[type="checkbox"] {
  width: 20px;
  height: 20px;
  accent-color: var(--accent);
  cursor: pointer;
}

.onboard-submit {
  text-align: center;
  max-width: 640px;
  margin: 32px auto 0;
}

.onboard-submit .btn {
  font-size: 18px;
  padding: 18px 48px;
  width: 100%;
}

.onboard-submit .btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.onboard-confirm {
  text-align: center;
  max-width: 640px;
  margin: 0 auto;
  padding: 60px 0;
  display: none;
}

.onboard-confirm.is-visible {
  display: block;
}

.onboard-confirm__check {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(81, 207, 102, 0.15);
  color: #51cf66;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin-bottom: 24px;
}

.onboard-confirm__title {
  font-size: 28px;
  font-weight: 800;
  margin-bottom: 12px;
}

.onboard-confirm__desc {
  color: var(--text-light);
  font-size: 16px;
  line-height: 1.7;
}
```

**Step 3: Add responsive overrides inside existing `@media (max-width: 768px)` block**

```css
.onboard-hero__title { font-size: 28px; }
.onboard-step { padding: 28px 20px; }
.onboard-step__title { font-size: 18px; }
```

**Step 4: Commit**

```bash
cd ~/aeothis-site
git add css/style.css
git commit -m "feat: add onboarding wizard styles to shared stylesheet"
```

---

### Task 2: Build the Fit Kids Care onboarding page

**Files:**
- Create: `/home/ubuntu/aeothis-site/clients/fit-kids-care/onboard/index.html`

**Step 1: Create the directory**

```bash
mkdir -p ~/aeothis-site/clients/fit-kids-care/onboard
```

**Step 2: Write the onboarding page HTML**

Create `/home/ubuntu/aeothis-site/clients/fit-kids-care/onboard/index.html`:

Key details for Fit Kids Care:
- **Client name:** Fit Kids Care
- **Domain:** fitkids.ca
- **Email provider:** Google Workspace (MX records: aspmx.l.google.com)
- **CMS:** Wix (detected from wixstatic.com assets)
- **Logo path:** `../logo.png` (one level up from onboard/)
- **CSS path:** `../../../css/style.css?v=20260309`
- **AEOthis logo:** `../../../images/AEOthis_logo_wide.png`
- **noindex/nofollow:** yes
- **Form submission:** For v1, use FormSpree endpoint `xkovedvd` (same as get-started chatbot). Future: webhook.

Page structure:
1. Nav (same as proposal page, adjusted relative paths)
2. Hero: client logo + "Welcome aboard, Fit Kids Care" + "Just two quick things and we'll get to work."
3. Step 1 card: Email alias
   - Desc: Create an email alias like `aeo@fitkids.ca` that forwards to `hello@aeothis.com`
   - Why: We use this to set up third-party profiles on your behalf. Every account will belong to your domain, so you keep full ownership.
   - Expandable "Show me how" with Google Workspace instructions:
     1. Go to `admin.google.com` and sign in
     2. Click "Directory" then "Users"
     3. Click the user you want to add the alias to
     4. Click "User information" then "Alternate email addresses"
     5. Click "Add alternate email"
     6. Type `aeo` in the alias field
     7. Click "Save"
     8. Then go to Gmail, click Settings, Forwarding, and forward `aeo@fitkids.ca` to `hello@aeothis.com`
   - Input: text field, placeholder `aeo@fitkids.ca`
4. Step 2 card: Website access
   - Desc: Grant us temporary access to your website so we can install your AEO pages.
   - Why: We'll add your Answer Hub, Brand Facts page, and schema markup. This typically takes one session, and you can revoke access after.
   - Expandable "Show me how" with Wix instructions:
     1. Go to your Wix Dashboard
     2. Click "Settings" in the left menu
     3. Click "Roles & Permissions"
     4. Click "Invite People"
     5. Enter `hello@aeothis.com`
     6. Set role to "Admin"
     7. Click "Send Invite"
   - Checkbox: "I've sent the invite to hello@aeothis.com"
5. Submit button: "I'm Ready, Let's Go" (disabled until both fields filled)
6. Confirmation div (hidden by default): checkmark + "You're all set. We'll start work this week and send you your first progress report within 30 days."
7. Footer: same as proposal page

JavaScript needed:
- Toggle expandable sections on click
- Enable/disable submit button based on input + checkbox state
- On submit: POST to FormSpree, hide form, show confirmation
- Honeypot field `_gotcha` for spam prevention

**CRITICAL RULES:**
- NEVER use em dashes
- Brand name: AEO`<em>`this`</em>` in all copy
- No jargon in instructions. Plain language.

**Step 3: Commit**

```bash
cd ~/aeothis-site
git add clients/fit-kids-care/onboard/index.html
git commit -m "feat: add Fit Kids Care onboarding wizard page"
```

---

### Task 3: Update proposal page CTA to link to onboarding

**Files:**
- Modify: `/home/ubuntu/aeothis-site/clients/fit-kids-care/index.html`

**Step 1: Change the CTA href**

Find:
```html
<a href="mailto:hello@aeothis.com?subject=I'm%20in%2C%20AEOthis%20site!" class="btn btn--large">Let's Get Started</a>
```

Replace with:
```html
<a href="onboard/" class="btn btn--large">Let's Get Started</a>
```

**Step 2: Commit**

```bash
cd ~/aeothis-site
git add clients/fit-kids-care/index.html
git commit -m "feat: link proposal CTA to onboarding wizard"
```

---

### Task 4: Deploy and verify

**Step 1: Push to GitHub**

```bash
cd ~/aeothis-site && git push origin main
```

**Step 2: Wait for GitHub Pages build**

```bash
sleep 30 && gh api repos/nart78/aeothis-site/pages/builds --jq '.[0] | {status, created_at}'
```

Expected: `"status": "built"`

**Step 3: Verify the live onboarding page**

Use WebFetch to check `https://aeothis.com/clients/fit-kids-care/onboard/` loads correctly:
- Page title contains "Fit Kids Care"
- Two step cards visible
- "Show me how" sections present
- Submit button present
- noindex meta tag in source

**Step 4: Verify proposal page CTA links to onboard/**

Check that `https://aeothis.com/clients/fit-kids-care/` has the updated CTA button pointing to `onboard/`.
