# Proposal Access Gate - Design Document

**Date:** 2026-03-09
**Status:** Approved

## Summary

Client proposal pages at `aeothis.com/clients/{slug}/` are protected by a 6-digit access code. The proposal HTML is AES-encrypted at build time. Clients enter the code to decrypt and view the proposal in-browser. No backend required.

## Requirements

- Proposals must not be viewable without the correct code (not just hidden, actually encrypted)
- Static site on GitHub Pages, no server-side logic
- Code entry persists for 7 days in the browser (localStorage)
- Lock screen shows AEOthis branding + client name (no logo, no content hints)
- 6-digit code auto-generated at build time, displayed to operator in terminal
- Onboard pages remain unprotected

## Technical Approach

### Encryption (Build Time - Python)

- Script: `~/aeothis-tools/encrypt_proposal.py`
- Input: client slug (e.g., `fit-kids-care`)
- Reads `~/aeothis-site/clients/{slug}/index.html`
- Extracts content inside `<main>` tags
- Generates random 6-digit code
- Derives AES-256-GCM key via PBKDF2 (100,000 iterations, random salt, SHA-256)
- Encrypts the `<main>` content
- Outputs transformed `index.html` with lock screen + encrypted payload
- Saves original as `index.unencrypted.html` (gitignored)
- Prints access code to terminal
- Optional `--code` flag to reuse a specific code

### Decryption (Client Side - JavaScript)

- Shared script: `~/aeothis-site/js/unlock.js`
- On code entry: PBKDF2 key derivation with same parameters + AES-GCM decrypt
- On success: inject decrypted HTML into `<main>`, reinitialize scroll animations
- On failure: AES-GCM throws DOMException, show error state
- Persistence: store `{code, expiry}` in localStorage keyed by `aeothis-access-{slug}`
- On revisit within 7 days: auto-decrypt without showing lock screen

### Lock Screen UI

- Dark background (`#050505`) matching site theme
- AEOthis logo centered
- Client name below logo (stored unencrypted in page as data attribute)
- "Enter your access code" heading
- Six individual digit input boxes, auto-advance on input
- Purple focus border (`#cb6ce6`), cyan unlock button (`#7ed7ed`)
- Error: boxes shake + "Invalid code" message
- Fully responsive, no scroll animations on lock screen

### Crypto Compatibility

Python encryption and JS decryption must use identical parameters:
- Algorithm: AES-256-GCM
- Key derivation: PBKDF2 with SHA-256, 100,000 iterations
- Salt: 16 bytes, random, stored in page
- IV: 12 bytes, random, stored in page
- Ciphertext + auth tag stored as base64 in a data attribute

### Files

- **New:** `~/aeothis-tools/encrypt_proposal.py`
- **New:** `~/aeothis-site/js/unlock.js`
- **Modified:** `~/aeothis-site/css/style.css` (lock screen styles)
- **Modified:** `.gitignore` (add `*.unencrypted.html`)
- **Transformed:** Each `clients/{slug}/index.html` after encryption

## Workflow

1. Create proposal page as usual (full HTML with Aeona data)
2. Run `python3 ~/aeothis-tools/encrypt_proposal.py {slug}`
3. Terminal outputs the 6-digit code
4. `git push` to deploy
5. Send client URL + code separately

## Security Notes

- 6-digit keyspace (1M combinations) is sufficient. PBKDF2 with 100K iterations makes brute-force in-browser impractical.
- Code stored in localStorage for 7-day persistence. Acceptable given threat model (casual access prevention, not adversarial).
- No retry limit needed. AES-GCM decryption failure is the natural gatekeeper.
