# Agent Center concept

A working, clickable concept of a redesigned Mutual of Enumclaw agent portal. It is a static site (HTML, CSS, and plain JavaScript) with no build step and no backend, so it runs on GitHub Pages as is.

All member, policy, claim, and agency data is fictional. The resource library uses document titles from the November 2026 inventory of today's agent site; it contains no internal URLs or hostnames.

## What works

| Area | Try this |
| --- | --- |
| Today | Filter the "Needs your attention" queue, send a pay link, resend a signature request, mark items done |
| Global search | Type "alva", "PA-8834", or a form name; arrow keys and Enter work; press `/` to focus search |
| Book of business | Filter households; open a member |
| Member view | Switch tabs, take a payment, text a pay link, enroll in Easy Pay, upload a document |
| Service and billing | Add a vehicle with VIN `JTMB6RFV5RD000000`, review, and issue; choose "Change coverage limits" to see the underwriting path |
| Quote and submit | Describe a business ("family winery with tasting room"), check appetite, complete the questionnaires, attach loss runs, submit |
| Claims | Report a claim for any member and see it on their record |
| Resources | Search 186 real library items; filter by line, type, and state |
| Ask MOE | Ask about a type of business, a form, or "Summarize the Alvarez account before my call" |

Changes are saved in the browser's local storage so the demo survives a reload. Use **Reset demo** in the top bar to start over.

## Deploy to GitHub Pages

1. Create a repository and push these files to the `main` branch.
2. In the repository, open **Settings > Pages** and set **Source** to **GitHub Actions**.
3. The workflow in `.github/workflows/pages.yml` deploys on every push to `main`. The site URL appears on the workflow run and under **Settings > Pages**.

Alternative without Actions: set **Source** to **Deploy from a branch**, choose `main` and `/ (root)`.

**Visibility.** On GitHub Free, Pages sites are public. To restrict the site to your organization, use a private repository on GitHub Enterprise Cloud and set the Pages visibility to private.

## Run locally

Any static file server works:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Project structure

```
index.html                 App shell: header, navigation, modal and toast roots
assets/css/app.css         Styles built on the MOE design system tokens
assets/js/data.js          Fictional demo data and SAMPLE appetite rules
assets/js/resources.js     Resource library generated from the site inventory
assets/js/app.js           Hash router, views, and interactions
assets/img/                MOE logo
architecture/              Phase 1 and phase 2 architecture diagrams
```

## Replacing demo data with real services

Each view reads from the in-memory state built from `data.js`. To connect to the orchestration layer (AWS API Gateway), replace those reads with API calls in `app.js`; the view functions are the only consumers.

`APPETITE_SAMPLE` in `data.js` holds placeholder rules for the demo. They are not MOE underwriting guidance and should be replaced with rules maintained by underwriting.

## Accessibility

Keyboard navigation throughout, visible focus, labeled form fields, dialog focus trapping with Escape to close, live region announcements for confirmations, reduced-motion support, and layouts that fit a 390 px phone screen.
