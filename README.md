# skills.itops.dev

A public, automatically refreshed mirror of explicitly selected AI skills published by [yetanotherrepo](https://github.com/yetanotherrepo). The current selection contains only `future-letter`. Visit **[skills.itops.dev](https://skills.itops.dev)** to browse, search, copy installation instructions, or download a skill.

The visitor interface is in Russian and follows the black, green, monospace identity of [itops.dev](https://itops.dev). GitHub remains the source of truth. The mirror never uploads local skills or executes instructions from a repository.

## Publish a skill

1. Publish the skill in a public repository under `yetanotherrepo`. Put `SKILL.md` at the repository root or in a dedicated skill directory. A public repository or fork is eligible only when its exact skill path is selected in the mirror configuration.
2. Give `SKILL.md` YAML frontmatter containing `name` (lowercase letters, digits, hyphens) and `description` (non-empty text). Keep supporting files in that skill directory. A nearby `README.md` becomes the human-readable guide; `agents/openai.yaml` may supply the display name and short description.
3. For an explicitly approved publication, add its repository name and exact `SKILL.md` path to `publishedSkills` in `catalog.config.json`, then deploy that configuration. Currently only `future-letter: ["SKILL.md"]` is selected.
4. Push to the repository's default branch. The mirror checks GitHub every five minutes. During GitHub rate limits or outages, publication may take longer.
5. Open the catalog, find the skill, and compare its displayed commit with GitHub. Do not call publication complete until both locations are verified.

Publishing one skill does not authorize publishing other local or private skills. A skill inside a larger repository can depend on files or tools outside its directory; the site explains this, and links to its source. Forks are labelled without claiming that the account owner wrote them.

## Run locally

Use Node.js 22 or later. These commands run from this repository's directory:

```sh
npm ci --ignore-scripts
npm test
npm run sync
npm run build
npm run preview
```

The preview prints its localhost URL. Set `PORT` to choose a port; otherwise the operating system assigns an available one. `npm run sync` writes its private working cache to `.cache/` and atomically publishes a local copy under `dist-published/current/`. `npm run build` creates `dist/` from the cached snapshot for preview. Run local sync commands sequentially.

No GitHub token is required or read. All requests use anonymous public endpoints.

## Configuration and troubleshooting

`catalog.config.json` controls the explicit `publishedSkills` selection, discovery and limits. Missing or empty selection publishes no skills; unselected public repositories and paths are excluded, including cached fallback content. Runtime environment variables are optional for local use:

- `STATE_DIR`: working cache and backoff state (default `.cache`).
- `PUBLISH_DIR`: releases and active symlink (default `dist-published`).
- `OUTPUT_DIR`: destination of the preview build (default `dist`).
- `PREVIEW_DIR`: directory served by the preview (default `dist`).
- `PORT`: localhost preview port (default: an available ephemeral port).

If a new skill is missing, check that its exact repository/path pair is selected in `publishedSkills`, its repository is public, its default branch contains a valid `SKILL.md`, and the file is outside generated/ignored directories. Standard nested directories such as `.github/skills/` are supported. A configuration change invalidates scan caches on the next run.

If the catalog is stale, inspect the service journal and backoff state. GitHub outages or rate limits keep the last published site available. Fix the reported source or wait for the retry window, then start the service again. Do not delete working state or disable TLS validation to bypass an error.

If a copy button cannot use the clipboard, the page reveals and selects the text for manual copying. An archive includes the skill directory's files, not every dependency elsewhere in a larger repository.

## Production operation

The dedicated NGINX virtual host serves `/var/www/skills.itops.dev/current`. A systemd timer runs every five minutes with a small randomized delay. The unprivileged `skills-mirror` user generates the site; root owns the application and its isolated Node runtime. The operating system's `flock` releases synchronization locks even after a crash or reboot.

| Path | Purpose |
| --- | --- |
| `/opt/skills-mirror/app` | Application and locked dependencies |
| `/opt/skills-mirror/runtime` | Isolated Node.js 22 runtime |
| `/var/lib/skills-mirror` | Catalog cache, backoff state, kernel lock |
| `/var/www/skills.itops.dev/current` | Atomic link to the active static release |
| `/var/www/skills.itops.dev/releases` | Completed releases, normally the latest three |
| `/var/www/skills.itops.dev/.staging` | Unserved build area, cleared on the next run |
| `/var/www/skills.itops.dev/acme` | TLS renewal challenge files |

Useful server commands:

```sh
systemctl start skills-mirror.service
systemctl status skills-mirror.timer
journalctl -u skills-mirror.service -n 30 --no-pager
nginx -t
```

Use `systemctl start` for manual server refreshes so the same user, sandbox and lock apply. Exit status 2 means a partial source update with warnings; the journal names the affected source. Backoff is stored independently of a successful catalog. A successful public repository listing prunes missing/private repositories. If GitHub's listing is unavailable, the last site remains until a subsequent successful check; changing source visibility does not guarantee immediate removal during an outage.

The repository contains reviewed systemd and NGINX files under `deploy/`. Install the HTTP-only virtual host first, obtain a certificate for this exact subdomain with Certbot's webroot plugin and the existing ACME account, then activate `deploy/nginx.conf` after `nginx -t`. Install the scoped deploy hook for certificate renewal. Never replace unrelated virtual hosts or the global Node runtime. Run `systemd-analyze verify` before enabling the timer.

## Bounds and trust

`catalog.config.json` configures the owner, fork inclusion, ignored directories and resource limits. Current limits are 1 MiB per file, 8 MiB and 250 files per skill, 300 skills and 64 MiB of source bytes per catalog. Trees are fully paginated or traversed; an incomplete repository listing is never published. Large or invalid sources are reported in the journal.

Only regular Git blobs are included. Git blob hashes are verified against immutable commit URLs. YAML aliases and unrecognized tags are rejected. Markdown HTML is escaped; images become explicit links. Original files are served as `text/plain` with `nosniff`, and ZIP files contain the original bytes. Dotfiles, generated directories, and repository administration documents are excluded. No source-provided code is run. Third-party source instructions remain the visitor's responsibility to review before installation.

A failed build keeps the active site. Incomplete staging is cleaned on startup; successful builds switch the current symlink atomically. Completed backup releases are retained for recovery. The homepage, other domains, and their applications are outside this project.

## Project records

- [architecture.md](architecture.md) — components, data flow and decisions.
- [PROGRESS.MD](PROGRESS.MD) — verified work and remaining tasks.
- [PRODUCT.md](PRODUCT.md) — audience and product constraints.
- [DESIGN.md](DESIGN.md) — visual system captured from the implementation.
