# Architecture

## Scope and status
Public GitHub skill mirror at skills.itops.dev. Last updated: 2026-10-27, Europe/Lisbon. Implemented and deployed; automatic source propagation verified.

## Current architecture
Existing itops.dev is a static HTML page behind NGINX on the owner's VPS. The mirror has a separate project and has its own virtual host and content directory. `future-letter` is the initial owned source; public forks also contribute skills.

- `src/catalog.mjs`: anonymous repository discovery, validated metadata and immutable source bytes.
- `src/render.mjs`, `web/`: escaped HTML, existing terminal visual identity and local search/copy interactions.
- `src/build.mjs`: static pages, source downloads, ZIP archives and public catalog metadata.
- `src/sync.mjs`: persistent backoff, unserved staging, completed releases and atomic activation.
- `deploy/`: NGINX, systemd service/timer and certificate-renewal hook. Runtime layout is documented in [README.md](README.md).

## Interfaces and data
Implemented: read the public GitHub repositories and their default branches, discover `SKILL.md`, parse metadata as data, and generate a catalog plus individual pages and downloadable original files. Source owner: `yetanotherrepo`. Private repositories and local skill directories are outside discovery. User-approved public forks are included and labelled. Configuration changes invalidate scan caches; unchanged repositories are re-inspected at least daily. Supporting files inside each skill directory are bundled; dependencies elsewhere remain in the source repository.

## Runtime and constraints
Existing DNS already routes skills.itops.dev to the VPS. A dedicated TLS certificate and virtual host serve static files, so catalog reading does not depend on a live GitHub request. Synchronization must respect rate limits, use verified TLS, never execute repository content, and expose only the generated public tree.

## Architectural decisions
- ADR-001, 2026-10-27, accepted: GitHub is the publication source and the website is a mirror, per the user's request. Publish a skill to GitHub first, then verify its mirror.
- ADR-002, 2026-10-27, accepted: isolate the subdomain from the existing homepage and unrelated VPS applications; the visual identity is inherited, not the site routing.
- ADR-003, 2026-10-27, accepted and implemented: periodically regenerate static pages with atomic activation; retain the last valid public data on transient errors, explicitly handle source removal and rate limits.

- ADR-004, 2026-10-27, accepted and implemented: include public forks per the user's explicit answer; show repository provenance without implying original authorship.
- ADR-005, 2026-10-27, accepted and implemented: use a dedicated Node 22 runtime and unprivileged static generator rather than altering global Node or existing applications. No web application backend or GitHub secret is necessary.

## Open questions and planned changes
User confirmed including public forks. Node 22 generates static files; systemd runs every five minutes with kernel flock, an unprivileged service account, persistent backoff and atomic symlink activation. NGINX serves a separate vhost with inert original-source MIME types. Native configuration validation, public HTTPS checks and a real timer-driven update passed. Detailed task state is in [PROGRESS.MD](PROGRESS.MD).

Source visibility changes are applied after a successful public listing; GitHub outages and retry windows can delay removal. Resource limits intentionally bound a single scan; large or invalid sources produce visible partial-update status and journal warnings. No additional architecture change is required by the current request.
