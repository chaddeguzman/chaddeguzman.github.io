# Chad De Guzman - Portfolio

A responsive, single-page portfolio presenting Chad De Guzman's profile, technical skills,
professional timeline, featured projects, public GitHub activity, and contact details. The site
also includes ChadBot, a Gemini-powered assistant that answers questions using the portfolio as
context.

**Live site:** [chaddeguzman.github.io](https://chaddeguzman.github.io)

## Features

- Responsive desktop, tablet, and mobile layouts
- Dark and light themes
- Reading mode for a focused browsing experience
- Active navigation, smooth scrolling, reveal animations, and animated statistics
- Profile, technical stack, career timeline, project highlights, and J4F project teaser sections
- Live public repository and GitHub statistics loaded from the GitHub REST API
- Current-year contribution heatmap generated through the GitHub GraphQL API
- Daily contribution refresh at `03:00 UTC`, with the local equivalent shown in the visitor's timezone
- Copy-to-clipboard contact control and accessible keyboard-friendly interactions
- Movable Gemini-powered ChadBot with conversation history, local visitor memory, prompt cooldown,
  quota-friendly error messages, and responsive positioning

## Technology

- Semantic HTML5
- CSS custom properties, Grid, Flexbox, responsive media queries, and animations
- Vanilla JavaScript with Fetch, Intersection Observer, Pointer Events, and Web Storage
- Google Gemini Generative Language API using `gemini-3.1-flash-lite`
- GitHub REST and GraphQL APIs
- GitHub Actions and GitHub Pages

The project has no application framework or runtime package dependencies. GitHub Pages serves the
static files produced by the deployment workflow.

## Project Structure

```text
.
|-- .github/workflows/
|   |-- deploy-pages.yml                 # Builds and deploys the static Pages artifact
|   `-- update-github-contributions.yml  # Refreshes contribution data every day
|-- assets/
|   |-- data/github-contributions.json   # Generated current-year contribution calendar
|   |-- images/                          # Profile image and favicon
|   |-- features.css                     # Reading mode and feature-specific styles
|   |-- fonts.css                        # Font declarations/imports
|   `-- style.css                        # Main portfolio layout and theme styles
|-- chatbot/
|   |-- chat_api.js                      # Gemini configuration, prompts, requests, and parsing
|   |-- script.js                        # Chat UI, memory, limits, dragging, and message handling
|   `-- style.css                        # ChadBot presentation and responsive styles
|-- scripts/
|   |-- features.js                      # Animated counters and reading mode
|   `-- script.js                        # Portfolio UI and GitHub data rendering
|-- index.html                           # Portfolio content and page structure
`-- README.md
```

## Run Locally

Clone the repository and serve its root with any static HTTP server. For example:

```powershell
git clone https://github.com/chaddeguzman/chaddeguzman.github.io.git
cd chaddeguzman.github.io
python -m http.server 8000
```

Then open `http://localhost:8000`. Serving over HTTP is preferable to opening `index.html`
directly because the portfolio fetches JSON and GitHub API resources.

The committed `chatbot/chat_api.js` contains the placeholder `__CHADBOT_API__`, so ChadBot will
report that its API key is not configured during ordinary local use. Do not commit a real API key.

## ChadBot Configuration

Create a GitHub Actions repository secret named `CHADBOT_API`. During deployment,
`deploy-pages.yml` copies the site into a temporary artifact and replaces `__CHADBOT_API__` only
inside that artifact. Deployment fails when the secret is missing.

Because ChadBot runs in the browser, the deployed key can be inspected by visitors even though it
is absent from the repository. In Google Cloud:

1. Restrict the key to the Generative Language API.
2. Add an HTTP referrer restriction for `https://chaddeguzman.github.io/*`.
3. Configure suitable project quotas and billing alerts.

The ten-prompt limit and three-minute cooldown are user-experience controls, not security
boundaries. They use browser storage and can be reset by a visitor.

## GitHub Data Automation

Repository cards, repository count, and star count are requested in the browser from GitHub's REST
API. Contribution data follows a separate automated flow:

1. `update-github-contributions.yml` runs daily at `03:00 UTC` and can also be started manually.
2. The workflow requests the current calendar year from GitHub's GraphQL API.
3. It writes the result to `assets/data/github-contributions.json` and commits changed data to
   `main`.
4. It dispatches the Pages deployment workflow so the refreshed heatmap is published.

The displayed total covers the current calendar year, which may differ from the rolling one-year
total shown on a GitHub profile. GitHub may also start scheduled workflows a few minutes late.

## Deployment

Pushing to `main` or manually dispatching `deploy-pages.yml` publishes the site through GitHub
Pages. The workflow requires these repository permissions:

- Read repository contents
- Write GitHub Pages deployments
- Issue an OpenID Connect identity token

The contribution workflow requires write access to repository contents and Actions so it can
commit generated data and dispatch a fresh Pages deployment.

## Customization

- Edit portfolio content and section markup in `index.html`.
- Update the main design tokens and responsive layout in `assets/style.css`.
- Modify reading mode in `assets/features.css` and `scripts/features.js`.
- Adjust GitHub rendering and contribution display behavior in `scripts/script.js`.
- Update ChadBot instructions and model configuration in `chatbot/chat_api.js`.
- Update ChadBot interaction behavior and client-side limits in `chatbot/script.js`.

When changing the scheduled contribution refresh, remember that GitHub Actions cron expressions
always use UTC.

## Links

- [Live portfolio](https://chaddeguzman.github.io)
- [GitHub profile](https://github.com/chaddeguzman)
- [LinkedIn](https://www.linkedin.com/in/chad-de-guzman/)
- [Instagram](https://www.instagram.com/bebo.chad/)
- [Just for Fun projects](https://chaddeguzman.github.io/j4fprojects)

## License and Reuse

No license file is currently included. The source is publicly viewable, but reuse rights are not
granted automatically; contact the repository owner before redistributing substantial portions.

---

Last updated: July 2026
