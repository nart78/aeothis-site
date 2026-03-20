# Runbook: Deploying Changes to aeothis-site

This runbook covers making changes to the public site and pushing them live. The site is on GitHub Pages -- there is no build step. Push to main and the changes are live within 1-2 minutes.

---

## Standard Deploy

After making any file changes:

```bash
cd ~/aeothis-site
git add <changed files>
git commit -m "brief description of change"
git push
```

**Rule:** Push immediately after every change. Do not batch up unrelated changes. Do not ask for confirmation before pushing.

---

## CSS Changes

When modifying `style.css`:

1. Make the CSS changes
2. Update the `?v=` query parameter on ALL `<link>` tags referencing `style.css` in index.html and any other pages that include it. Example: `style.css?v=3` to `style.css?v=4`.
3. Commit and push.

Skipping the version bump means visitors with cached CSS will not see the updates.

---

## Adding a New Page or Section

1. Create the HTML file at the correct path.
2. Ensure brand rules are applied: `AEO<em>this</em>` for the brand name in all visible text.
3. Use the site's color palette: purple accent `#cb6ce6`, CTA blue `#7ed7ed`.
4. Link the page from relevant navigation or CTA if applicable.
5. Add the page to `sitemap.xml` if it is a publicly indexed page.
6. Push.

---

## Verifying a Deploy

GitHub Pages deploys within ~60-120 seconds of a push. To verify:

- Wait 2 minutes, then load the affected page in a browser (or via `curl -s <url> | head -20`).
- If the change is not visible, check for CSS cache issues (hard refresh) or check the GitHub Pages build status in the repo settings.

---

## Emergency Rollback

If a bad deploy needs reverting:

```bash
cd ~/aeothis-site
git revert HEAD
git push
```

Or reset to a specific commit:

```bash
git log --oneline -5   # find the target commit
git revert <commit>
git push
```

Never force-push to main. GitHub Pages deploys from main; a force-push can create deploy conflicts.
