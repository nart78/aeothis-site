# Client Proposal Page - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a personalized, branded proposal page template at `aeothis.com/clients/{slug}/` that presents the AEOthis 90-day AEO roadmap to prospective clients.

**Architecture:** Static HTML page matching the existing AEOthis dark-mode design system (Inter font, purple/cyan accents, black backgrounds). No build step. Each client gets their own directory with an `index.html` and `logo.png`. The first client page is built manually as the template; future pages follow the same pattern.

**Tech Stack:** HTML, CSS (shared `style.css` + page-specific inline styles), vanilla JS, GitHub Pages deployment.

---

## Task 1: Add proposal page CSS to the shared stylesheet

**Files:**
- Modify: `/home/ubuntu/aeothis-site/css/style.css` (append new section at end, before responsive queries)

**Step 1: Read the current CSS file to find the insertion point**

Read `/home/ubuntu/aeothis-site/css/style.css` and locate the responsive media queries section (starts around line 944 with `@media`). New styles go before that block.

**Step 2: Add proposal page styles**

Append these styles before the `@media` queries in `style.css`:

```css
/* ── Proposal Page ── */

.proposal-hero {
  padding: 160px 0 80px;
  text-align: center;
  position: relative;
}

.proposal-hero__logo {
  max-width: 280px;
  max-height: 120px;
  margin: 0 auto 32px;
  display: block;
  object-fit: contain;
}

.proposal-hero__client {
  font-size: 48px;
  font-weight: 900;
  letter-spacing: -0.03em;
  margin-bottom: 12px;
}

.proposal-hero__tagline {
  font-size: 22px;
  color: var(--text-light);
  font-weight: 400;
}

.proposal-score {
  display: flex;
  gap: 32px;
  justify-content: center;
  flex-wrap: wrap;
  margin: 48px 0;
}

.proposal-score__card {
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 32px 40px;
  text-align: center;
  min-width: 180px;
}

.proposal-score__value {
  font-size: 48px;
  font-weight: 900;
  color: var(--accent);
  display: block;
}

.proposal-score__label {
  font-size: 14px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-top: 8px;
}

.proposal-month {
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 48px;
  margin-bottom: 32px;
}

.proposal-month__number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--accent);
  color: #000;
  font-weight: 800;
  font-size: 18px;
  margin-right: 16px;
  vertical-align: middle;
}

.proposal-month__title {
  font-size: 28px;
  font-weight: 800;
  display: inline;
  vertical-align: middle;
}

.proposal-month__subtitle {
  font-size: 15px;
  color: var(--text-muted);
  margin-top: 4px;
  margin-bottom: 24px;
}

.proposal-month ul {
  list-style: none;
  padding: 0;
}

.proposal-month ul li {
  padding: 8px 0 8px 28px;
  position: relative;
  color: var(--text-light);
  line-height: 1.6;
}

.proposal-month ul li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 16px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--cta);
}

.proposal-month__note {
  margin-top: 24px;
  padding: 20px 24px;
  background: rgba(203, 108, 230, 0.08);
  border: 1px solid rgba(203, 108, 230, 0.2);
  border-radius: var(--radius);
  font-size: 15px;
  color: var(--text-light);
}

.proposal-month__note strong {
  color: var(--accent);
}

.proposal-includes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 32px 0;
}

.proposal-includes__item {
  padding: 12px 16px 12px 40px;
  position: relative;
  color: var(--text-light);
  line-height: 1.5;
}

.proposal-includes__item::before {
  content: '\2713';
  position: absolute;
  left: 12px;
  color: var(--cta);
  font-weight: 700;
}

.proposal-invest {
  text-align: center;
  padding: 64px 0;
}

.proposal-invest__price {
  font-size: 64px;
  font-weight: 900;
  color: var(--accent);
}

.proposal-invest__period {
  font-size: 24px;
  font-weight: 400;
  color: var(--text-light);
}

.proposal-invest__terms {
  margin-top: 16px;
  color: var(--text-muted);
  font-size: 15px;
}

.proposal-cta {
  text-align: center;
  padding: 48px 0 96px;
}

.proposal-cta .btn {
  font-size: 20px;
  padding: 20px 56px;
}
```

**Step 3: Add responsive overrides inside the existing mobile media query**

Find the `@media (max-width: 768px)` block and add:

```css
.proposal-hero__client { font-size: 32px; }
.proposal-hero__tagline { font-size: 18px; }
.proposal-score { flex-direction: column; align-items: center; }
.proposal-score__card { min-width: auto; width: 100%; max-width: 300px; }
.proposal-month { padding: 32px 24px; }
.proposal-includes { grid-template-columns: 1fr; }
.proposal-invest__price { font-size: 48px; }
```

**Step 4: Commit**

```bash
cd ~/aeothis-site
git add css/style.css
git commit -m "feat: add proposal page styles to shared stylesheet"
```

---

## Task 2: Build the first client proposal page (template)

This task builds the HTML for a specific client. Replace `{slug}`, `{CLIENT_NAME}`, and data values with the actual client's information.

**Files:**
- Create: `/home/ubuntu/aeothis-site/clients/{slug}/index.html`

**Step 1: Create the client directory**

```bash
mkdir -p ~/aeothis-site/clients/{slug}
```

**Step 2: Write the proposal HTML**

Create `/home/ubuntu/aeothis-site/clients/{slug}/index.html` with the following structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>{CLIENT_NAME} - AEO Proposal | AEOthis</title>
  <link rel="icon" href="../../images/favicon.svg?v=20260301c">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../css/style.css?v=20260309">
</head>
<body>

  <!-- Navigation -->
  <nav class="nav">
    <div class="container nav__inner">
      <a href="https://aeothis.com" class="nav__logo">
        <img src="../../images/AEOthis_logo_wide.png" alt="AEOthis" height="32">
      </a>
      <div class="nav__links">
        <a href="https://aeothis.com" class="nav__link">aeothis.com</a>
      </div>
    </div>
  </nav>

  <!-- Hero: Client branding -->
  <section class="proposal-hero">
    <div class="container container--narrow">
      <img src="logo.png" alt="{CLIENT_NAME}" class="proposal-hero__logo">
      <h1 class="proposal-hero__client">{CLIENT_NAME}</h1>
      <p class="proposal-hero__tagline">Your 90-Day AEO Roadmap</p>
    </div>
  </section>

  <!-- Where You Stand Today -->
  <section class="section">
    <div class="container container--narrow">
      <div class="section__header">
        <h2>Where You Stand Today</h2>
        <p>{2-3 sentences about the client's current AI visibility, pulled from Aeona data or written as a general industry gap statement.}</p>
      </div>
      <div class="proposal-score">
        <div class="proposal-score__card animate-on-scroll">
          <span class="proposal-score__value">{SCORE}/100</span>
          <span class="proposal-score__label">AEO Score</span>
        </div>
        <div class="proposal-score__card animate-on-scroll delay-1">
          <span class="proposal-score__value">{MENTION_RATE}%</span>
          <span class="proposal-score__label">AI Mention Rate</span>
        </div>
        <div class="proposal-score__card animate-on-scroll delay-2">
          <span class="proposal-score__value">{GRADE}</span>
          <span class="proposal-score__label">Grade</span>
        </div>
      </div>
    </div>
  </section>

  <!-- 90-Day Roadmap -->
  <section class="section section--alt">
    <div class="container container--narrow">
      <div class="section__header">
        <h2>Your 90-Day Roadmap</h2>
      </div>

      <!-- Month 1 -->
      <div class="proposal-month animate-on-scroll">
        <div>
          <span class="proposal-month__number">1</span>
          <h3 class="proposal-month__title">Foundation</h3>
        </div>
        <p class="proposal-month__subtitle">Weeks 1-4</p>
        <ul>
          <li>Answer Intent Mapping: 25 queries tested across ChatGPT, Perplexity, Gemini, Claude, and Grok</li>
          <li>Baseline AEO score and competitor analysis report</li>
          <li>Answer Hub page built and installed on your website</li>
          <li>Brand Facts page built and installed on your website</li>
          <li>Machine-readable brand data deployed at your domain</li>
          <li>Schema markup added (Organization, FAQPage)</li>
          <li>3 third-party citations placed on high-authority platforms</li>
        </ul>
        <div class="proposal-month__note">
          <strong>One-time setup from you:</strong> Create an email alias (e.g., aeo@yourdomain.com) forwarding to us, and grant temporary admin access to your website for page installation. That's it. We handle the rest.
        </div>
      </div>

      <!-- Month 2 -->
      <div class="proposal-month animate-on-scroll">
        <div>
          <span class="proposal-month__number">2</span>
          <h3 class="proposal-month__title">Build</h3>
        </div>
        <p class="proposal-month__subtitle">Weeks 5-8</p>
        <ul>
          <li>Follow-up AEO scan measuring early movement across all platforms</li>
          <li>3 additional third-party citations on high-authority platforms</li>
          <li>Content refinements based on which queries are gaining traction</li>
          <li>Schema markup optimization based on Month 1 performance data</li>
          <li>Progress report with before-and-after comparison</li>
        </ul>
      </div>

      <!-- Month 3 -->
      <div class="proposal-month animate-on-scroll">
        <div>
          <span class="proposal-month__number">3</span>
          <h3 class="proposal-month__title">Accelerate</h3>
        </div>
        <p class="proposal-month__subtitle">Weeks 9-12</p>
        <ul>
          <li>3 final third-party citations (9 total across the engagement)</li>
          <li>Full before-vs-after AEO score comparison across all platforms</li>
          <li>Final results report with competitive positioning analysis</li>
          <li>Recommendations for ongoing optimization beyond the initial term</li>
          <li>Complete handoff: all accounts, credentials, and assets documented and transferred to you</li>
        </ul>
      </div>
    </div>
  </section>

  <!-- What's Included -->
  <section class="section">
    <div class="container container--narrow">
      <div class="section__header">
        <h2>What's Included</h2>
        <p>Everything you need to get recommended by AI. Fully managed. We handle it all.</p>
      </div>
      <div class="proposal-includes">
        <div class="proposal-includes__item animate-on-scroll">Full 7-layer AEO implementation</div>
        <div class="proposal-includes__item animate-on-scroll delay-1">25-query AI visibility mapping</div>
        <div class="proposal-includes__item animate-on-scroll delay-2">Answer Hub page</div>
        <div class="proposal-includes__item animate-on-scroll delay-3">Brand Facts page</div>
        <div class="proposal-includes__item animate-on-scroll delay-4">Schema markup optimization</div>
        <div class="proposal-includes__item animate-on-scroll delay-5">Machine-readable brand data</div>
        <div class="proposal-includes__item animate-on-scroll delay-6">9 third-party citations over 3 months</div>
        <div class="proposal-includes__item animate-on-scroll delay-7">Monthly progress reports</div>
      </div>
    </div>
  </section>

  <!-- Investment -->
  <section class="section section--alt">
    <div class="container container--narrow">
      <div class="proposal-invest">
        <h2>Investment</h2>
        <div style="margin-top: 32px;">
          <span class="proposal-invest__price">$300</span>
          <span class="proposal-invest__period">/month</span>
        </div>
        <p class="proposal-invest__terms">3-month minimum engagement. Results take 90 days to compound. No long-term lock-in after the initial term.</p>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="section">
    <div class="container container--narrow">
      <div class="proposal-cta">
        <h2 style="margin-bottom: 24px;">Ready to get started?</h2>
        <a href="mailto:hello@aeothis.com?subject=AEO%20Proposal%20-%20{CLIENT_NAME}" class="btn">Let's Get Started</a>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <div class="container">
      <p>&copy; 2026 AEO<em>this</em>. All rights reserved.</p>
    </div>
  </footer>

  <!-- Scroll animations (same as main site) -->
  <script>
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
      document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
    }
  </script>

</body>
</html>
```

**Step 3: Commit**

```bash
cd ~/aeothis-site
git add clients/{slug}/index.html
git commit -m "feat: add proposal page for {CLIENT_NAME}"
```

---

## Task 3: Extract and save the client's logo

**Files:**
- Create: `/home/ubuntu/aeothis-site/clients/{slug}/logo.png`

**Step 1: Fetch the client's website**

Use WebFetch to load the client's homepage. Check for:
1. `<script type="application/ld+json">` containing Organization schema with `logo` field
2. `<meta property="og:image" content="...">` tag
3. `<img>` tags inside `<header>`, `<nav>`, or elements with class containing "logo"
4. `<link rel="apple-touch-icon" href="...">` as a fallback

**Step 2: Download the best logo found**

```bash
curl -L -o ~/aeothis-site/clients/{slug}/logo.png "{LOGO_URL}"
```

If the logo is SVG, save as `logo.svg` and update the `<img>` src in index.html.

**Step 3: Verify the logo looks correct**

Open the file to confirm it's a valid image and not a 404 page or placeholder.

**Step 4: Commit**

```bash
cd ~/aeothis-site
git add clients/{slug}/logo.png
git commit -m "feat: add client logo for {CLIENT_NAME}"
```

---

## Task 4: Personalize the page with Aeona data

**Files:**
- Modify: `/home/ubuntu/aeothis-site/clients/{slug}/index.html`

**Step 1: Check for existing Aeona data**

```bash
ls ~/aeothis-tools/data/"{CLIENT_NAME}"/aeona_*.json 2>/dev/null
```

If no data exists, check if a client config exists at `~/aeothis-tools/clients/{slug}.json`. If so, run:

```bash
cd ~/aeothis-tools && python3 aeona.py analyze {slug}
```

If no client config exists either, use a general statement instead of score cards.

**Step 2: Extract key metrics from Aeona data**

Read the most recent `aeona_*.json` file and pull:
- `overall_score` (the 0-100 AEO score)
- `grade` (letter grade A-F)
- `mention_rate` (percentage)
- Any notable competitor data for the narrative paragraph

**Step 3: Update the HTML with real values**

Replace the placeholder values in the "Where You Stand Today" section:
- `{SCORE}` with actual score
- `{MENTION_RATE}` with actual rate
- `{GRADE}` with actual grade
- Update the narrative paragraph with specific findings

**Step 4: Commit**

```bash
cd ~/aeothis-site
git add clients/{slug}/index.html
git commit -m "feat: personalize proposal with Aeona data for {CLIENT_NAME}"
```

---

## Task 5: Deploy and verify

**Step 1: Push to GitHub**

```bash
cd ~/aeothis-site && git push origin main
```

**Step 2: Wait for GitHub Pages deployment (usually 30-60 seconds)**

**Step 3: Verify the live page**

Use a browser or WebFetch to confirm:
- `https://aeothis.com/clients/{slug}/` loads correctly
- Logo displays properly
- All sections render as expected
- `noindex` meta tag is present (check page source)
- CTA button links to correct mailto
- Page is responsive on mobile viewport

**Step 4: Share the URL with Johnny for review**

The proposal page is live at: `https://aeothis.com/clients/{slug}/`
