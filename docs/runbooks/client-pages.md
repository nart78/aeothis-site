# Runbook: Building Client Pages on aeothis-site

This runbook covers creating the three types of per-client pages: the encrypted proposal page, the GBP guide page, and the progress dashboard. All pages live under `clients/{slug}/` in the repo.

**Working directory:** `~/aeothis-site/`

---

## Prerequisites

Before creating any client page:

- Client config exists at `~/aeothis-tools/clients/{slug}.json`
- Aeona analysis data exists at `~/aeothis-tools/data/{client name}/aeona_{date}.json`
- Client slug confirmed (lowercase, hyphens, no special characters)

---

## Page 1: Encrypted Proposal Page

The proposal page is the primary sales deliverable. It contains the AEO score, competitor analysis, service overview, and pricing.

**Steps:**

Use the `aeodon-proposal` skill. It handles the full workflow:
1. Generates proposal page HTML from client config and Aeona data
2. Runs `encrypt_proposal.py` to AES-encrypt the content
3. Writes the encrypted HTML to `clients/{slug}/index.html`
4. Creates `clients/{slug}/.access-code` with the plaintext access code
5. Commits and pushes to the repo

Follow the skill's instructions for execution. The access code generated in this step is what goes into the proposal email.

**Verify:** After the push, visit `https://aeothis.com/clients/{slug}/` and confirm:
- Page loads and shows the access code prompt
- Entering the correct code from `.access-code` decrypts and renders the content
- Client name and data look correct

---

## Page 2: GBP Guide Page

The GBP guide page delivers the Google Business Profile optimization checklist to the client. This page must exist before the guide email can be sent. The guide is encrypted using the same access code as the proposal page.

**`guide/` directory structure:**
```
guide/
  index.unencrypted.html    # Plaintext guide content (not committed publicly)
  guide.js                  # Checkbox/progress/copy-to-clipboard interactivity
  index.html                # AES-256-GCM encrypted version (committed, served to client)
```

**Steps:**

1. Generate pre-filled client data from aeothis-tools:
   ```bash
   cd ~/aeothis-tools
   python3 gbp_guide.py <slug>
   ```
   This outputs a formatted terminal guide with all client-specific fields populated (categories, description, services, social links, Q&A). Use this output as the content source for the guide page.

2. Build `index.unencrypted.html` from the Carpet Hero template at:
   `~/aeothis-site/clients/carpet-hero-carpet-cleaning/guide/index.unencrypted.html`
   Customize with the client's data from the `gbp_guide.py` output. Asset paths use `../../../` (3 levels deep from site root).

3. Copy `guide.js` from the Carpet Hero template:
   ```bash
   cp ~/aeothis-site/clients/carpet-hero-carpet-cleaning/guide/guide.js \
      ~/aeothis-site/clients/{slug}/guide/guide.js
   ```

4. Encrypt the guide page. Note: `encrypt_proposal.py` is hardcoded to `clients/{slug}/index.html` and cannot encrypt guide pages directly. The guide page uses the same AES-256-GCM + PBKDF2 approach as the proposal page but requires a custom invocation. Use the Carpet Hero guide as the reference for the expected output structure, and encrypt using the same salt/ciphertext/data-attributes pattern with the code from `clients/{slug}/.access-code`.

5. Push to aeothis-site:
   ```bash
   cd ~/aeothis-site
   git add clients/{slug}/guide/
   git commit -m "Add GBP guide page for {slug}"
   git push
   ```

6. Verify: Visit `https://aeothis.com/clients/{slug}/guide/` and confirm the page loads and decrypts correctly with the access code.

7. Then send the guide email:
   ```bash
   cd ~/aeothis-tools
   python3 send_guide_email.py <slug> --review
   ```
   Get Johnny's approval before sending live.

---

## Page 3: Progress Dashboard

The progress dashboard shows the client's layer completion status and citation count.

**Prerequisite:** A dashboard data file must exist at `~/aeothis-tools/dashboard-data/{slug}.json` before running the build script. This file must be created manually for each client. Reference the Carpet Hero template at `~/aeothis-tools/dashboard-data/carpet-hero-carpet-cleaning.json` for the expected structure.

**Steps:**

1. Create `~/aeothis-tools/dashboard-data/{slug}.json` from the client config and progress tracking files.

2. Generate from aeothis-tools:
   ```bash
   cd ~/aeothis-tools
   python3 build_dashboard.py <slug>
   ```
   This produces both `dashboard/index.unencrypted.html` and the encrypted `dashboard/index.html`. Encryption uses the access code from `clients/{slug}/.access-code` (same code as the proposal page).

3. No manual save needed -- the script writes directly to `~/aeothis-site/clients/{slug}/dashboard/`.

4. Push:
   ```bash
   cd ~/aeothis-site
   git add clients/{slug}/dashboard/
   git commit -m "Add progress dashboard for {slug}"
   git push
   ```

4. Verify: Visit `https://aeothis.com/clients/{slug}/dashboard/` and confirm it renders correctly.

---

## Directory Structure After All Three Pages Are Built

```
clients/
  {slug}/
    index.html          # Encrypted proposal page
    .access-code        # Plaintext access code (committed, not public-linked)
    guide/
      index.html        # GBP guide page
    dashboard/
      index.html        # Progress dashboard
```

---

## Updating Client Pages

If client data changes (new scores, updated business info, revised pricing):

1. Regenerate the affected page using the relevant tool in aeothis-tools.
2. Overwrite the existing file.
3. If regenerating the proposal page, a new access code is generated. Update the client's `.access-code` file and note that any previously issued access codes will no longer work.
4. Push the updated files.
