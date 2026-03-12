# Client AEO Progress Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable, encrypted client dashboard page showing AEO layer progress with Supabase-backed checkboxes for client action items.

**Architecture:** Static HTML template rendered per-client from JSON data at build time, encrypted with access codes, deployed to GitHub Pages. Client checkbox state persisted to Supabase (Mixler project). Build script generates + encrypts dashboard for any client slug.

**Tech Stack:** Python (build script), HTML/CSS/JS (template), Supabase JS v2 (CDN), existing AES-GCM encryption (encrypt_proposal.py pattern), GitHub Pages.

**Spec:** `~/aeothis-site/docs/superpowers/specs/2026-03-12-client-progress-dashboard-design.md`

---

## File Structure

```
~/aeothis-tools/
  build_dashboard.py                    # NEW: Build script (reads template + data, injects, encrypts)
  dashboard-data/                       # NEW: Per-client JSON data (build input only, not deployed)
    carpet-hero-carpet-cleaning.json

~/aeothis-site/
  clients/
    dashboard-template.html             # NEW: Reusable dashboard HTML template
    {slug}/
      dashboard/
        index.unencrypted.html          # GENERATED: Build output (unencrypted)
        index.html                      # GENERATED: Build output (encrypted)
  js/
    unlock.js                           # EXISTING: Access gate decrypt logic (no changes)
    dashboard.js                        # NEW: Accordion, progress bar, Supabase checkbox logic
```

---

## Chunk 1: Supabase Table + Dashboard Template

### Task 1: Create Supabase `client_actions` Table

**Files:**
- No local files. Supabase SQL via dashboard or CLI.

- [ ] **Step 1: Create the table and RLS policy**

Run this SQL in the Supabase SQL editor (Mixler project: `dnuygqdmzjswroyzvkjb.supabase.co`):

```sql
-- Create table
CREATE TABLE client_actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_slug text NOT NULL,
  action_id text NOT NULL,
  checked boolean DEFAULT false NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (client_slug, action_id)
);

-- Enable RLS
ALTER TABLE client_actions ENABLE ROW LEVEL SECURITY;

-- Allow anon to read all rows (filtered client-side by slug)
CREATE POLICY "anon_read_client_actions"
  ON client_actions FOR SELECT
  TO anon
  USING (true);

-- Allow anon to insert
CREATE POLICY "anon_insert_client_actions"
  ON client_actions FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon to update (only checked and updated_at columns)
CREATE POLICY "anon_update_client_actions"
  ON client_actions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at on changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_actions_updated_at
  BEFORE UPDATE ON client_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 2: Verify table exists**

Run in SQL editor:
```sql
SELECT * FROM client_actions LIMIT 1;
```
Expected: Empty result set, no error.

- [ ] **Step 3: Test anon upsert**

```bash
curl -s -X POST "https://dnuygqdmzjswroyzvkjb.supabase.co/rest/v1/client_actions" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRudXlncWRtempzd3JveXp2a2piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwODU0NDMsImV4cCI6MjA4NzY2MTQ0M30.c1ql6RXhutfX6_hw5GZq1FblD92_w1agLWqq8U6JKVs" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRudXlncWRtempzd3JveXp2a2piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwODU0NDMsImV4cCI6MjA4NzY2MTQ0M30.c1ql6RXhutfX6_hw5GZq1FblD92_w1agLWqq8U6JKVs" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation,resolution=merge-duplicates" \
  -d '{"client_slug":"test-client","action_id":"test-action","checked":true}'
```

Expected: 201 with the inserted row JSON. Clean up: `DELETE FROM client_actions WHERE client_slug = 'test-client';`

---

### Task 2: Create Dashboard JavaScript (`dashboard.js`)

**Files:**
- Create: `~/aeothis-site/js/dashboard.js`

This file handles: accordion expand/collapse, progress bar calculation, Supabase checkbox read/write, copy-to-clipboard for citation copy, and MutationObserver for post-decrypt init (same pattern as `guide.js`).

- [ ] **Step 1: Write `dashboard.js`**

```javascript
(function () {
  'use strict';

  // Supabase config (Mixler project, anon key)
  var SUPABASE_URL = 'https://dnuygqdmzjswroyzvkjb.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRudXlncWRtempzd3JveXp2a2piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwODU0NDMsImV4cCI6MjA4NzY2MTQ0M30.c1ql6RXhutfX6_hw5GZq1FblD92_w1agLWqq8U6JKVs';

  // ---- Helpers ----

  function supaFetch(method, path, body) {
    var headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    };
    if (method === 'POST') {
      headers['Prefer'] = 'return=representation,resolution=merge-duplicates';
    }
    var opts = { method: method, headers: headers };
    if (body) opts.body = JSON.stringify(body);
    return fetch(SUPABASE_URL + '/rest/v1/' + path, opts).then(function (r) { return r.json(); });
  }

  // ---- Accordion ----

  function initAccordion() {
    document.querySelectorAll('.dash-layer__header').forEach(function (header) {
      header.addEventListener('click', function () {
        var layer = header.closest('.dash-layer');
        var isOpen = layer.classList.contains('is-open');
        // Close all others
        document.querySelectorAll('.dash-layer.is-open').forEach(function (el) {
          el.classList.remove('is-open');
        });
        if (!isOpen) layer.classList.add('is-open');
      });
    });
  }

  // ---- Progress Bar ----

  function calcProgress(data) {
    // Layer 6 progress comes from citations (40% bucket), not the layer bucket
    var nonCitationLayers = data.layers.filter(function (l) {
      return l.status !== 'na' && l.number !== 6;
    });
    var completedLayers = nonCitationLayers.filter(function (l) { return l.status === 'complete'; });

    // Citation count (covers Layer 6)
    var totalCitations = 9;
    var doneCitations = 0;
    var layer6 = data.layers.find(function (l) { return l.number === 6; });
    if (layer6 && layer6.citations) {
      layer6.citations.forEach(function (month) {
        month.items.forEach(function (c) {
          if (c.status === 'complete') doneCitations++;
        });
      });
    }

    // Non-citation active layers share 60%, citations get 40%
    var layerWeight = nonCitationLayers.length > 0 ? 60 / nonCitationLayers.length : 0;
    var citationWeight = totalCitations > 0 ? 40 / totalCitations : 0;

    var pct = Math.round(
      completedLayers.length * layerWeight +
      doneCitations * citationWeight
    );

    // For the summary text, count all active layers including L6
    var allActive = data.layers.filter(function (l) { return l.status !== 'na'; });
    var allComplete = allActive.filter(function (l) { return l.status === 'complete'; });

    return {
      pct: Math.min(pct, 100),
      layersDone: allComplete.length,
      layersTotal: allActive.length,
      citationsDone: doneCitations,
      citationsTotal: totalCitations
    };
  }

  function renderProgress(stats) {
    var fill = document.getElementById('dash-progress-fill');
    var label = document.getElementById('dash-progress-label');
    if (fill) fill.style.width = stats.pct + '%';
    if (label) {
      label.textContent = stats.layersDone + ' of ' + stats.layersTotal +
        ' layers complete, ' + stats.citationsDone + ' of ' +
        stats.citationsTotal + ' citations placed';
    }
  }

  // ---- Supabase Checkboxes ----

  var checkboxState = {};

  function loadCheckboxes(slug) {
    return supaFetch('GET', 'client_actions?client_slug=eq.' + encodeURIComponent(slug) + '&select=action_id,checked')
      .then(function (rows) {
        if (Array.isArray(rows)) {
          rows.forEach(function (r) { checkboxState[r.action_id] = r.checked; });
        }
        applyCheckboxes();
      })
      .catch(function () { /* offline fallback: checkboxes start unchecked */ });
  }

  function applyCheckboxes() {
    document.querySelectorAll('[data-action-id]').forEach(function (el) {
      var id = el.getAttribute('data-action-id');
      var box = el.querySelector('.dash-checkbox');
      var label = el.querySelector('.dash-action-label');
      if (checkboxState[id]) {
        if (box) box.classList.add('is-checked');
        if (label) label.classList.add('is-done');
      } else {
        if (box) box.classList.remove('is-checked');
        if (label) label.classList.remove('is-done');
      }
    });
  }

  function toggleAction(slug, actionId) {
    var newVal = !checkboxState[actionId];
    checkboxState[actionId] = newVal;
    applyCheckboxes();

    supaFetch('POST', 'client_actions', {
      client_slug: slug,
      action_id: actionId,
      checked: newVal
    }).catch(function () { /* silently fail, local state still updated */ });
  }

  // ---- Copy to clipboard ----

  function initCopy() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-copy]');
      if (!btn) return;
      var text = btn.getAttribute('data-copy');
      if (text.charAt(0) === '#') {
        var el = document.getElementById(text.slice(1));
        if (el) text = el.textContent;
      }
      navigator.clipboard.writeText(text).then(function () {
        var orig = btn.textContent;
        btn.textContent = 'Copied!';
        btn.classList.add('is-copied');
        setTimeout(function () {
          btn.textContent = orig;
          btn.classList.remove('is-copied');
        }, 1500);
      });
    });
  }

  // ---- Citation toggle ----

  function initCitationToggle() {
    document.addEventListener('click', function (e) {
      var toggle = e.target.closest('.dash-citation__toggle');
      if (!toggle) return;
      var row = toggle.closest('.dash-citation');
      if (row) row.classList.toggle('is-expanded');
    });
  }

  // ---- Render ----

  function renderActionItem(action) {
    var noteHtml = action.note || '';
    if (action.link) {
      noteHtml += ' <a href="' + action.link + '" target="_blank">Open guide &rarr;</a>';
    }
    return '<div class="dash-action" data-action-id="' + action.id + '">' +
      '<div class="dash-checkbox"></div>' +
      '<div>' +
        '<div class="dash-action-label">' + action.label + '</div>' +
        (noteHtml ? '<div class="dash-action-note">' + noteHtml + '</div>' : '') +
      '</div>' +
    '</div>';
  }

  function renderCitations(citations) {
    var html = '';
    citations.forEach(function (month) {
      html += '<div class="dash-citations-month">Month ' + month.month + '</div>';
      month.items.forEach(function (c, idx) {
        var dotClass = c.status === 'complete' ? 'dash-citation__dot--complete' : 'dash-citation__dot--pending';
        var dateStr = c.date || '';
        var copyId = 'citation-' + month.month + '-' + idx;
        var hasToggle = c.copy ? 'style="display:inline"' : 'style="display:none"';

        html += '<div class="dash-citation">' +
          '<div class="dash-citation__row">' +
            '<div class="dash-citation__dot ' + dotClass + '"></div>' +
            '<div class="dash-citation__name">' + c.name + '</div>' +
            '<div class="dash-citation__platform">' + c.platform + '</div>' +
            (dateStr ? '<div class="dash-citation__date">' + dateStr + '</div>' : '') +
            '<div class="dash-citation__toggle" ' + hasToggle + '>View copy</div>' +
          '</div>';

        if (c.copy) {
          html += '<div class="dash-citation__copy-wrap">' +
            '<div class="copy-block">' +
              '<div class="copy-block__header">' +
                '<span class="copy-block__label">Citation copy</span>' +
                '<button class="copy-block__btn" data-copy="#' + copyId + '">Copy</button>' +
              '</div>' +
              '<div class="copy-block__text" id="' + copyId + '">' + c.copy + '</div>' +
            '</div>' +
          '</div>';
        }

        html += '</div>';
      });
    });
    return html;
  }

  function renderDashboard(data) {
    // Render global actions
    var globalEl = document.getElementById('dash-global-actions');
    if (globalEl && data.globalActions && data.globalActions.length) {
      var globalHtml = '<div class="dash-getting-started__title">Getting Started</div>';
      data.globalActions.forEach(function (a) { globalHtml += renderActionItem(a); });
      globalEl.innerHTML = globalHtml;
    }

    // Render layers
    var layersEl = document.getElementById('dash-layers');
    if (!layersEl) return;

    var layersHtml = '';
    var statusLabels = { complete: 'Complete', in_progress: 'In Progress', upcoming: 'Upcoming', na: 'N/A' };

    data.layers.forEach(function (layer) {
      var statusClass = layer.status.replace('_', '_');
      var completeClass = layer.status === 'complete' ? ' is-complete' : '';
      var naClass = layer.status === 'na' ? ' is-na' : '';

      layersHtml += '<div class="dash-layer' + completeClass + naClass + '" data-layer="' + layer.number + '">';

      // Header
      layersHtml += '<div class="dash-layer__header">' +
        '<div class="dash-layer__status dash-layer__status--' + statusClass + '"></div>' +
        '<div class="dash-layer__info">' +
          '<div class="dash-layer__name">Layer ' + layer.number + ': ' + layer.name + '</div>' +
        '</div>' +
        '<span class="dash-layer__badge dash-layer__badge--' + statusClass + '">' + (statusLabels[layer.status] || layer.status) + '</span>' +
        '<span class="dash-layer__arrow">&#9654;</span>' +
      '</div>';

      // Body
      layersHtml += '<div class="dash-layer__body"><div class="dash-layer__content">';
      layersHtml += '<div class="dash-layer__desc">' + layer.description + '</div>';

      if (layer.completedDate) {
        layersHtml += '<div class="dash-layer__date">Completed: ' + layer.completedDate + '</div>';
      }
      if (layer.liveUrl) {
        layersHtml += '<a class="dash-layer__link" href="' + layer.liveUrl + '" target="_blank" rel="noopener">View live page &rarr;</a>';
      }

      // Citations (Layer 6)
      if (layer.citations) {
        layersHtml += renderCitations(layer.citations);
      }

      // Per-layer client actions
      if (layer.clientActions && layer.clientActions.length) {
        layersHtml += '<div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06);">';
        layersHtml += '<div class="dash-getting-started__title" style="margin-top:0;">Your Action Items</div>';
        layer.clientActions.forEach(function (a) { layersHtml += renderActionItem(a); });
        layersHtml += '</div>';
      }

      layersHtml += '</div></div></div>';
    });

    layersEl.innerHTML = layersHtml;
  }

  // ---- Init ----

  function initDashboard() {
    if (typeof DASHBOARD_DATA === 'undefined') return;
    var data = DASHBOARD_DATA;

    renderDashboard(data);
    var stats = calcProgress(data);
    renderProgress(stats);
    initAccordion();
    initCopy();
    initCitationToggle();
    loadCheckboxes(data.client);

    // Bind checkbox clicks
    document.addEventListener('click', function (e) {
      var actionEl = e.target.closest('[data-action-id]');
      if (!actionEl) return;
      // Don't toggle if clicking a link inside
      if (e.target.closest('a')) return;
      toggleAction(data.client, actionEl.getAttribute('data-action-id'));
    });
  }

  // Init: either content is already visible or we wait for unlock decryption
  // DASHBOARD_DATA is placed outside the encrypted blob (in the locked page),
  // so it's always available. We just wait for the DOM containers to appear.
  if (document.getElementById('dash-layers')) {
    initDashboard();
  } else {
    var observer = new MutationObserver(function (mutations, obs) {
      if (document.getElementById('dash-layers')) {
        initDashboard();
        obs.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
```

- [ ] **Step 2: Verify file created**

```bash
ls -la ~/aeothis-site/js/dashboard.js
```
Expected: File exists.

- [ ] **Step 3: Commit**

```bash
cd ~/aeothis-site && git add js/dashboard.js && git commit -m "feat: add dashboard.js with accordion, progress bar, and Supabase checkboxes"
```

---

### Task 3: Create Dashboard HTML Template

**Files:**
- Create: `~/aeothis-site/clients/dashboard-template.html`

This is the reusable template. The build script injects `DASHBOARD_DATA` JSON and the client name into marked placeholders. The JS in `dashboard.js` renders all dynamic content.

**Key patterns from existing pages:**
- Nav: same as guide page (`../../../images/AEOthis_logo_wide.png` relative path)
- CSS: shared `style.css` + inline `<style>` block (guide page pattern)
- Footer: same as guide page
- The `<!-- DASHBOARD_DATA_PLACEHOLDER -->` comment gets replaced by the build script with `<script>const DASHBOARD_DATA = {...};</script>`

- [ ] **Step 1: Write `dashboard-template.html`**

The template uses the AEOthis dark theme. It renders:
1. Hero section with client logo + name + "Your AEO Progress"
2. Progress bar
3. "Getting Started" section for global actions (checkboxes)
4. Accordion layers (1-7), each with status badge, description, live URL, citations (for layer 6), and per-layer client actions

The template JS reads `DASHBOARD_DATA` to render layer cards, citation rows, and action items.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><!-- TITLE_PLACEHOLDER --> - AEO Dashboard | AEOthis</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" type="image/png" href="/images/favicon-aeothis.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../../css/style.css?v=20260312">
  <style>
    /* Dashboard hero */
    .dash-hero { padding: 100px 0 40px; text-align: center; }
    .dash-hero__logo { max-width: 160px; margin: 0 auto 24px; }
    .dash-hero__title { font-size: 2.2rem; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.02em; }
    .dash-hero__sub { font-size: 1.1rem; color: var(--text-light, #94a3b8); }

    /* Progress bar */
    .dash-progress { max-width: 680px; margin: 0 auto 48px; padding: 0 24px; }
    .dash-progress__bar { height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; margin-bottom: 10px; }
    .dash-progress__fill { height: 100%; background: linear-gradient(90deg, var(--accent, #cb6ce6), var(--cta, #7ed7ed)); border-radius: 4px; transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1); width: 0%; }
    .dash-progress__label { font-size: 0.85rem; color: var(--text-muted, rgba(255,255,255,0.45)); text-align: center; }

    /* Getting started section */
    .dash-getting-started { max-width: 720px; margin: 0 auto 48px; padding: 0 24px; }
    .dash-getting-started__title { font-size: 1.1rem; font-weight: 700; color: var(--accent, #cb6ce6); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; font-size: 0.85rem; }

    /* Action items (shared between global and per-layer) */
    .dash-action { display: flex; align-items: flex-start; gap: 12px; padding: 12px 0; cursor: pointer; -webkit-user-select: none; user-select: none; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .dash-action:last-child { border-bottom: none; }
    .dash-checkbox { width: 22px; height: 22px; border: 2px solid rgba(255,255,255,0.2); border-radius: 6px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all 0.2s; margin-top: 1px; background: transparent; }
    .dash-checkbox.is-checked { background: var(--success, #10b981); border-color: var(--success, #10b981); }
    .dash-checkbox.is-checked::after { content: '\2713'; color: #fff; font-size: 13px; font-weight: 700; }
    .dash-action-label { font-size: 0.95rem; font-weight: 600; line-height: 1.5; }
    .dash-action-label.is-done { text-decoration: line-through; opacity: 0.5; }
    .dash-action-note { font-size: 0.85rem; color: var(--text-light, #94a3b8); margin-top: 2px; line-height: 1.5; }
    .dash-action-note a { color: var(--cta, #7ed7ed); text-decoration: underline; text-underline-offset: 2px; }

    /* Accordion layers */
    .dash-layers { max-width: 720px; margin: 0 auto; padding: 0 24px 64px; }
    .dash-layer { background: rgba(255,255,255,0.03); border: 1px solid var(--border, rgba(255,255,255,0.1)); border-radius: 16px; margin-bottom: 12px; overflow: hidden; transition: border-color 0.3s; }
    .dash-layer.is-complete { border-color: rgba(16, 185, 129, 0.3); }
    .dash-layer.is-na { opacity: 0.45; }
    .dash-layer__header { padding: 20px 24px; display: flex; align-items: center; gap: 14px; cursor: pointer; -webkit-user-select: none; user-select: none; }
    .dash-layer__status { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
    .dash-layer__status--complete { background: var(--success, #10b981); color: #fff; }
    .dash-layer__status--complete::after { content: '\2713'; }
    .dash-layer__status--in_progress { background: #f59e0b; color: #fff; }
    .dash-layer__status--in_progress::after { content: '\2022'; font-size: 18px; }
    .dash-layer__status--upcoming { background: rgba(255,255,255,0.1); color: var(--text-muted, #64748b); }
    .dash-layer__status--upcoming::after { content: '\2013'; }
    .dash-layer__status--na { background: rgba(255,255,255,0.05); color: var(--text-muted, #64748b); }
    .dash-layer__status--na::after { content: '\2013'; }
    .dash-layer__info { flex: 1; }
    .dash-layer__name { font-size: 1.05rem; font-weight: 700; }
    .dash-layer__badge { font-size: 0.75rem; font-weight: 600; padding: 3px 10px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
    .dash-layer__badge--complete { background: rgba(16,185,129,0.15); color: #10b981; }
    .dash-layer__badge--in_progress { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .dash-layer__badge--upcoming { background: rgba(255,255,255,0.06); color: var(--text-muted); }
    .dash-layer__badge--na { background: rgba(255,255,255,0.04); color: var(--text-muted); }
    .dash-layer__arrow { color: var(--text-muted); transition: transform 0.3s; font-size: 0.8rem; }
    .dash-layer.is-open .dash-layer__arrow { transform: rotate(90deg); }

    /* Accordion body (hidden by default) */
    .dash-layer__body { max-height: 0; overflow: hidden; transition: max-height 0.4s cubic-bezier(0.22, 1, 0.36, 1); }
    .dash-layer.is-open .dash-layer__body { max-height: 2000px; }
    .dash-layer__content { padding: 0 24px 24px; border-top: 1px solid rgba(255,255,255,0.06); }
    .dash-layer__desc { font-size: 0.93rem; color: var(--text-light, #94a3b8); line-height: 1.7; padding-top: 20px; margin-bottom: 16px; }
    .dash-layer__date { font-size: 0.82rem; color: var(--text-muted); margin-bottom: 16px; }
    .dash-layer__link { display: inline-block; font-size: 0.88rem; color: var(--cta, #7ed7ed); text-decoration: underline; text-underline-offset: 2px; margin-bottom: 16px; }

    /* Citations (Layer 6) */
    .dash-citations-month { font-size: 0.8rem; font-weight: 600; color: var(--accent, #cb6ce6); text-transform: uppercase; letter-spacing: 0.05em; margin: 20px 0 10px; }
    .dash-citation { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 14px 18px; margin-bottom: 8px; }
    .dash-citation__row { display: flex; align-items: center; gap: 12px; }
    .dash-citation__dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .dash-citation__dot--complete { background: #10b981; }
    .dash-citation__dot--pending { background: #f59e0b; }
    .dash-citation__name { flex: 1; font-size: 0.93rem; font-weight: 600; }
    .dash-citation__platform { font-size: 0.82rem; color: var(--text-muted); }
    .dash-citation__date { font-size: 0.82rem; color: var(--text-muted); }
    .dash-citation__toggle { font-size: 0.82rem; color: var(--cta, #7ed7ed); cursor: pointer; padding: 2px 8px; border-radius: 4px; background: rgba(126,215,237,0.08); display: none; }
    .dash-citation__copy-wrap { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; }
    .dash-citation.is-expanded .dash-citation__copy-wrap { max-height: 500px; }

    /* Reuse copy-block from guide page */
    .copy-block { background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; overflow: hidden; margin-top: 12px; }
    .copy-block__header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(255,255,255,0.04); border-bottom: 1px solid rgba(255,255,255,0.06); }
    .copy-block__label { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .copy-block__btn { background: rgba(203,108,230,0.12); border: none; color: var(--accent, #cb6ce6); cursor: pointer; font-size: 0.82rem; font-weight: 600; font-family: inherit; padding: 6px 14px; border-radius: 6px; transition: all 0.2s; }
    .copy-block__btn:hover { background: rgba(203,108,230,0.22); }
    .copy-block__btn.is-copied { background: rgba(16,185,129,0.15); color: var(--success, #10b981); }
    .copy-block__text { padding: 14px; font-size: 0.92rem; color: var(--text-light); line-height: 1.7; }

    /* Section divider */
    .dash-divider { max-width: 720px; margin: 0 auto 32px; padding: 0 24px; }
    .dash-divider hr { border: none; height: 1px; background: rgba(255,255,255,0.06); }

    /* Footer */
    .dash-footer { text-align: center; padding: 48px 0; font-size: 0.85rem; color: var(--text-muted); }
    .dash-footer a { color: var(--accent, #cb6ce6); }

    /* Mobile */
    @media (max-width: 640px) {
      .dash-hero { padding: 80px 0 32px; }
      .dash-hero__title { font-size: 1.7rem; }
      .dash-layer__header { padding: 16px 18px; gap: 10px; }
      .dash-layer__content { padding: 0 18px 20px; }
      .dash-layer__name { font-size: 0.95rem; }
      .dash-citation__row { flex-wrap: wrap; gap: 6px; }
      .dash-citation__platform, .dash-citation__date { font-size: 0.78rem; }
    }
  </style>
</head>
<body>

  <nav class="nav">
    <div class="container nav__inner">
      <a href="https://aeothis.com" class="nav__logo">
        <img src="../../../images/AEOthis_logo_wide.png" alt="AEOthis" height="32">
      </a>
      <div class="nav__links"></div>
    </div>
  </nav>

  <!-- Hero -->
  <section class="dash-hero">
    <div class="container">
      <img src="../logo.png" alt="<!-- TITLE_PLACEHOLDER -->" class="dash-hero__logo">
      <h1 class="dash-hero__title"><!-- TITLE_PLACEHOLDER --></h1>
      <p class="dash-hero__sub">Your AEO Progress</p>
    </div>
  </section>

  <!-- Progress bar -->
  <div class="dash-progress">
    <div class="dash-progress__bar"><div class="dash-progress__fill" id="dash-progress-fill"></div></div>
    <div class="dash-progress__label" id="dash-progress-label">Loading...</div>
  </div>

  <!-- Getting Started (global actions) -->
  <div class="dash-getting-started" id="dash-global-actions">
    <div class="dash-getting-started__title">Getting Started</div>
    <!-- Rendered by JS from DASHBOARD_DATA.globalActions -->
  </div>

  <div class="dash-divider"><hr></div>

  <!-- Layers accordion -->
  <div class="dash-layers" id="dash-layers">
    <!-- Rendered by JS from DASHBOARD_DATA.layers -->
  </div>

  <footer class="dash-footer">
    <div class="container">
      Questions? Email <a href="mailto:hello@aeothis.com">hello@aeothis.com</a> anytime.<br>
      &copy; 2026 AEO<em>this</em>
    </div>
  </footer>

  <!-- DASHBOARD_DATA_PLACEHOLDER -->
  <script src="../../../js/dashboard.js"></script>

</body>
</html>
```

- [ ] **Step 2: Verify rendering logic**

The `renderDashboard()` function is already included in `dashboard.js` (Task 2). It builds all DOM elements from `DASHBOARD_DATA`: global actions, layer cards, citation rows, and per-layer action items. No additional JS file needed.

- [ ] **Step 3: Verify template renders locally**

Open `dashboard-template.html` in a browser with a test `DASHBOARD_DATA` injected manually (add a `<script>` tag before the placeholder). Verify:
- Progress bar renders and animates
- Accordion layers expand/collapse
- Checkboxes toggle visually
- Citation copy expands

- [ ] **Step 4: Commit**

```bash
cd ~/aeothis-site && git add clients/dashboard-template.html js/dashboard.js && git commit -m "feat: add dashboard template and rendering JS"
```

---

## Chunk 2: Build Script + First Client

### Task 4: Create Carpet Hero Dashboard Data

**Files:**
- Create: `~/aeothis-tools/dashboard-data/carpet-hero-carpet-cleaning.json`

- [ ] **Step 1: Write the data file**

Populate from the progress tracking file at `~/.claude/projects/-home-ubuntu/memory/project_carpet-hero-progress.md` and the client config at `~/aeothis-tools/clients/carpet-hero-carpet-cleaning.json`.

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
      "description": "Built your Answer Hub page ranking the top carpet cleaners in Calgary with you as the top pick.",
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
      "number": 3,
      "name": "Brand Facts Page",
      "status": "complete",
      "completedDate": "2026-03-12",
      "description": "Created a neutral, fact-based page with all your verifiable business details for AI verification.",
      "liveUrl": "https://carpethero.ca/brand-facts",
      "clientActions": [
        {
          "id": "layer3-publish-facts",
          "label": "Publish Brand Facts page on your site",
          "note": "Paste the HTML block we provided into a new GoDaddy page."
        }
      ]
    },
    {
      "number": 4,
      "name": "Machine-Readable Data",
      "status": "complete",
      "completedDate": "2026-03-12",
      "description": "Added structured JSON-LD data to your homepage so AI can read your business facts directly.",
      "liveUrl": null,
      "clientActions": [
        {
          "id": "layer4-publish-json",
          "label": "Add machine-readable data to your homepage",
          "note": "Paste the JSON-LD script block into your GoDaddy homepage HTML."
        }
      ]
    },
    {
      "number": 5,
      "name": "Schema Markup",
      "status": "complete",
      "completedDate": "2026-03-12",
      "description": "Added Organization, Service, and FAQPage schema markup across all key pages.",
      "liveUrl": null,
      "clientActions": [
        {
          "id": "layer5-publish-schema",
          "label": "Add schema markup to your pages",
          "note": "Paste the schema script blocks into each GoDaddy page as instructed."
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
              "copy": null
            }
          ]
        },
        {
          "month": 2,
          "items": [
            { "name": "TBD", "platform": "TBD", "status": "pending", "date": null, "copy": null },
            { "name": "TBD", "platform": "TBD", "status": "pending", "date": null, "copy": null },
            { "name": "TBD", "platform": "TBD", "status": "pending", "date": null, "copy": null }
          ]
        },
        {
          "month": 3,
          "items": [
            { "name": "TBD", "platform": "TBD", "status": "pending", "date": null, "copy": null },
            { "name": "TBD", "platform": "TBD", "status": "pending", "date": null, "copy": null },
            { "name": "TBD", "platform": "TBD", "status": "pending", "date": null, "copy": null }
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
    },
    {
      "number": 7,
      "name": "AI Shopping",
      "status": "na",
      "completedDate": null,
      "description": "Not applicable for service businesses.",
      "liveUrl": null,
      "clientActions": []
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
      "note": "Ask satisfied customers to leave a Google review after each job."
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/aeothis-tools && git add dashboard-data/carpet-hero-carpet-cleaning.json && git commit -m "feat: add Carpet Hero dashboard data"
```

---

### Task 5: Create Build Script

**Files:**
- Create: `~/aeothis-tools/build_dashboard.py`

The build script:
1. Reads template from `~/aeothis-site/clients/dashboard-template.html`
2. Reads client data from `~/aeothis-tools/dashboard-data/{slug}.json`
3. Reads access code from `~/aeothis-site/clients/{slug}/.access-code`
4. Replaces `<!-- TITLE_PLACEHOLDER -->` with client name
5. Replaces `<!-- DASHBOARD_DATA_PLACEHOLDER -->` with `<script>const DASHBOARD_DATA = {...};</script>`
6. Writes `index.unencrypted.html`
7. Encrypts to `index.html` using `encrypt_proposal.py` encryption logic (adapted for `../../../` depth)

- [ ] **Step 1: Write `build_dashboard.py`**

```python
#!/usr/bin/env python3
"""Build client AEO progress dashboard pages.

Usage:
    python3 build_dashboard.py <slug>
    python3 build_dashboard.py --all
"""

import argparse
import base64
import json
import os
import re
import sys

TOOLS_DIR = os.path.dirname(os.path.abspath(__file__))
SITE_DIR = os.path.expanduser('~/aeothis-site')
TEMPLATE_PATH = os.path.join(SITE_DIR, 'clients', 'dashboard-template.html')
DATA_DIR = os.path.join(TOOLS_DIR, 'dashboard-data')
CLIENTS_DIR = os.path.join(TOOLS_DIR, 'clients')
ITERATIONS = 100000


def encrypt_aes_gcm(plaintext_bytes, code, salt):
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.primitives import hashes

    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITERATIONS)
    key = kdf.derive(code.encode('utf-8'))
    iv = os.urandom(12)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(iv, plaintext_bytes, None)
    return iv, ciphertext


def get_access_code(slug):
    """Get access code from .access-code file or client config."""
    code_path = os.path.join(SITE_DIR, 'clients', slug, '.access-code')
    if os.path.exists(code_path):
        with open(code_path) as f:
            return f.read().strip()

    # Fallback: check if there's an access code in the proposal dir
    print(f'Warning: No .access-code file found for {slug}', file=sys.stderr)
    return None


def build_dashboard(slug):
    # Read template
    if not os.path.exists(TEMPLATE_PATH):
        print(f'Error: Template not found at {TEMPLATE_PATH}', file=sys.stderr)
        sys.exit(1)

    with open(TEMPLATE_PATH, 'r', encoding='utf-8') as f:
        template = f.read()

    # Read client dashboard data
    data_path = os.path.join(DATA_DIR, f'{slug}.json')
    if not os.path.exists(data_path):
        print(f'Error: No dashboard data for {slug} at {data_path}', file=sys.stderr)
        sys.exit(1)

    with open(data_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    client_name = data.get('clientName', slug.replace('-', ' ').title())

    # Get access code
    code = get_access_code(slug)
    if not code:
        print(f'Error: No access code found for {slug}', file=sys.stderr)
        sys.exit(1)

    # Build unencrypted HTML
    html = template.replace('<!-- TITLE_PLACEHOLDER -->', client_name)
    data_script = f'<script>const DASHBOARD_DATA = {json.dumps(data)};</script>'
    html = html.replace('<!-- DASHBOARD_DATA_PLACEHOLDER -->', data_script)

    # Output paths
    dash_dir = os.path.join(SITE_DIR, 'clients', slug, 'dashboard')
    os.makedirs(dash_dir, exist_ok=True)
    unencrypted_path = os.path.join(dash_dir, 'index.unencrypted.html')
    encrypted_path = os.path.join(dash_dir, 'index.html')

    # Write unencrypted
    with open(unencrypted_path, 'w', encoding='utf-8') as f:
        f.write(html)

    # Encrypt
    # Extract content between </nav> and <footer
    nav_end = html.find('</nav>')
    footer_start = html.find('<footer')
    if nav_end == -1 or footer_start == -1:
        print(f'Error: Could not find content boundaries in template', file=sys.stderr)
        sys.exit(1)

    content_start = nav_end + len('</nav>')
    content = html[content_start:footer_start].strip()

    # IMPORTANT: Remove the DASHBOARD_DATA script from encrypted content.
    # Script tags injected via innerHTML don't execute in browsers.
    # The data script will be placed outside the encrypted blob in the locked page.
    content = re.sub(r'<script>const DASHBOARD_DATA.*?</script>', '', content, flags=re.DOTALL).strip()

    salt = os.urandom(16)
    iv, ciphertext = encrypt_aes_gcm(content.encode('utf-8'), code, salt)

    salt_b64 = base64.b64encode(salt).decode('ascii')
    iv_b64 = base64.b64encode(iv).decode('ascii')
    ct_b64 = base64.b64encode(ciphertext).decode('ascii')

    # Extract head content
    head_match = re.search(r'<head>(.*?)</head>', html, re.DOTALL)
    head_content = head_match.group(1).strip() if head_match else ''

    # Extract nav
    nav_match = re.search(r'(<nav.*?</nav>)', html, re.DOTALL)
    nav_html = nav_match.group(1) if nav_match else ''

    # Extract footer
    footer_match = re.search(r'(<footer.*?</footer>)', html, re.DOTALL)
    footer_html = footer_match.group(1) if footer_match else ''

    # Extract DASHBOARD_DATA script to place outside encrypted blob
    data_script = f'<script>const DASHBOARD_DATA = {json.dumps(data)};</script>'

    # Build locked page (note: ../../../ depth for dashboard)
    locked_page = f'''<!DOCTYPE html>
<html lang="en">
<head>
{head_content}
</head>
<body class="is-locked">

  <div id="access-gate" class="access-gate"
    data-slug="{slug}"
    data-salt="{salt_b64}"
    data-iv="{iv_b64}"
    data-ciphertext="{ct_b64}">
    <img src="../../../images/AEOthis_logo_wide.png" alt="AEOthis" class="access-gate__logo">
    <div class="access-gate__client">{client_name}</div>
    <div class="access-gate__heading">Enter your access code</div>
    <div class="access-gate__inputs">
      <input type="number" class="access-gate__digit" min="0" max="9" inputmode="numeric" pattern="[0-9]" aria-label="Digit 1">
      <input type="number" class="access-gate__digit" min="0" max="9" inputmode="numeric" pattern="[0-9]" aria-label="Digit 2">
      <input type="number" class="access-gate__digit" min="0" max="9" inputmode="numeric" pattern="[0-9]" aria-label="Digit 3">
      <input type="number" class="access-gate__digit" min="0" max="9" inputmode="numeric" pattern="[0-9]" aria-label="Digit 4">
      <input type="number" class="access-gate__digit" min="0" max="9" inputmode="numeric" pattern="[0-9]" aria-label="Digit 5">
      <input type="number" class="access-gate__digit" min="0" max="9" inputmode="numeric" pattern="[0-9]" aria-label="Digit 6">
    </div>
    <button class="access-gate__btn" disabled>Unlock</button>
    <div class="access-gate__error"></div>
  </div>

  {nav_html}

  <main></main>

  {footer_html}

  <script src="../../../js/unlock.js"></script>
  {data_script}
  <script src="../../../js/dashboard.js"></script>

</body>
</html>'''

    with open(encrypted_path, 'w', encoding='utf-8') as f:
        f.write(locked_page)

    print(f'Built: {encrypted_path}')
    print(f'Backup: {unencrypted_path}')
    print(f'Access code: {code}')
    print(f'URL: https://aeothis.com/clients/{slug}/dashboard/')


def main():
    parser = argparse.ArgumentParser(description='Build client AEO progress dashboards.')
    parser.add_argument('slug', nargs='?', help='Client slug (e.g., carpet-hero-carpet-cleaning)')
    parser.add_argument('--all', action='store_true', help='Build all clients with dashboard data')
    args = parser.parse_args()

    if args.all:
        if not os.path.exists(DATA_DIR):
            print(f'Error: No dashboard data directory at {DATA_DIR}', file=sys.stderr)
            sys.exit(1)
        for f in sorted(os.listdir(DATA_DIR)):
            if f.endswith('.json'):
                slug = f[:-5]
                print(f'\n--- Building {slug} ---')
                build_dashboard(slug)
    elif args.slug:
        build_dashboard(args.slug)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Make executable**

```bash
chmod +x ~/aeothis-tools/build_dashboard.py
```

- [ ] **Step 3: Commit**

```bash
cd ~/aeothis-tools && git add build_dashboard.py && git commit -m "feat: add dashboard build script"
```

---

### Task 6: Build and Deploy Carpet Hero Dashboard

- [ ] **Step 1: Run the build**

```bash
cd ~/aeothis-tools && python3 build_dashboard.py carpet-hero-carpet-cleaning
```

Expected output:
```
Built: ~/aeothis-site/clients/carpet-hero-carpet-cleaning/dashboard/index.html
Backup: ~/aeothis-site/clients/carpet-hero-carpet-cleaning/dashboard/index.unencrypted.html
Access code: 034049
URL: https://aeothis.com/clients/carpet-hero-carpet-cleaning/dashboard/
```

- [ ] **Step 2: Test unencrypted version locally**

Open `~/aeothis-site/clients/carpet-hero-carpet-cleaning/dashboard/index.unencrypted.html` in browser. Verify:
- Progress bar shows correct percentage
- All 7 layers render in accordion
- Layer 6 shows citation rows with month headers
- Global action checkboxes appear in "Getting Started"
- Per-layer action checkboxes appear inside layers
- Clicking a checkbox hits Supabase (check Network tab)
- Citation "View copy" toggle works (once citations have copy text)

- [ ] **Step 3: Test encrypted version**

Open `index.html` in browser. Enter access code `034049`. Verify:
- Access gate appears, accepts code
- Dashboard renders after unlock
- All functionality works post-decrypt (accordion, checkboxes, progress)

- [ ] **Step 4: Commit and push**

```bash
cd ~/aeothis-site && git add clients/carpet-hero-carpet-cleaning/dashboard/ && git commit -m "feat: add Carpet Hero progress dashboard"
git push
```

- [ ] **Step 5: Verify live**

Visit `https://aeothis.com/clients/carpet-hero-carpet-cleaning/dashboard/` and confirm it works with code `034049`.
