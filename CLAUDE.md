# AEOthis Website

## Brand
- **Company name is "AEOthis"** (no space, capital A-E-O, lowercase this). NOT "AEO This".
- **"this" is always lowercase and italic** in display. Use `<em>this</em>` in HTML.
- Email: hello@aeothis.com
- Brand colors: accent purple `#cb6ce6`, CTA blue `#7ed7ed`

## Site
- GitHub Pages, repo: `nart78/aeothis-site`. Static HTML/CSS/JS.
- **Always push after making changes.** Don't ask, just push.
- CSS cache busting: update `?v=` param in index.html `<link>` tag when changing style.css.
- Favicon: `images/favicon-aeothis.png` (already linked in all pages with cache bust param).

## Onboarding Chatbot (Launchpad)
- Located at `/get-started/index.html`
- Bot name: **Aeori**
- Formspree endpoint: `xkovedvd`
- Webhook: `POST https://agents.johnnytran.ca/api/aeothis/submit` with `X-AEO-Token` header
- Honeypot field `_gotcha` added for spam prevention
- Competitors, USPs, and social links use one-at-a-time input pattern with "I'm Done" button
- Mobile: pinch-zoom disabled, `100dvh` + `visualViewport` API for keyboard handling
