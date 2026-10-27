# Progress

## Project and objective
Build and deploy skills.itops.dev as an automatic mirror of the owner's public GitHub skills, with the visual identity of itops.dev. Phase: delivered.

## Current status
2026-10-27, Europe/Lisbon. User requested removing all skills except the letter skill (existing source name `future-letter`). Deployed the explicit selection: only `future-letter/SKILL.md` remains live. Ten tests pass; all 42 old page/archive/source URLs for the 14 removed skills return 404. The retained skill page, archive and original source return 200.

## Completed
- Confirmed the GitHub owner: `yetanotherrepo`; `future-letter` is publicly available.
- Inspected the homepage's black background, green Courier-style text, and cursor.
- Read current project guidance, mandatory FPF gate, Kovodstvo and Impeccable references.
- Impeccable context ran once for this project; no existing product/design files were present.
- Implemented anonymous GitHub discovery, full pagination/tree traversal, immutable blob validation, bounded bundles and static search/detail/download pages.
- Deployed isolated Node 22.23.4, unprivileged synchronization service, five-minute timer and dedicated NGINX HTTPS virtual host.
- Published reviewed site source, DESIGN.md and .impeccable/design.json; anonymous README access and ten deployed source/config hashes matched the local repository.
- Saved the user's future-publication workflow in local agent instructions: GitHub source plus verified mirror, including public forks, with no implicit private-skill publication.

## In progress
- No active implementation task remains.

## Next steps
- For future approved publications, add the exact source to `publishedSkills` and verify its mirror.
- Investigate only actionable service warnings or requested product changes.

## Blocked and open questions
- No blocker or unresolved product scope question.

## Decisions and constraints
- User authorized deployment at skills.itops.dev and automatic mirroring of public skills.
- GitHub is the source; local/private installed skills are not implicitly approved for publication.
- Preserve the main itops.dev website and unrelated services.
- No tokens or private source data are required for public mirroring.
- Public documentation is in English under the parent project guide; visitor copy follows the skill's language and the current Russian request.

## Verification
- DNS: requested subdomain resolves through itops.dev to the existing VPS.
- HTTPS homepage read successfully and visually inspected.
- SSH host trust checks passed; server reports `vps`, user `root`; NGINX active.
- Nine Node tests pass: metadata/path safety, Markdown, pagination/tree completion, immutable hashes/limits, reconciliation/backoff, exact ZIP bytes, interrupted build cleanup, persisted listing backoff, and exact generic chat handoff.
- Browser captures at 1440px and 390px. Copy success, empty search and reset verified; copy also works on the production HTTPS origin.
- Independent security review: no remaining actionable findings after recovery, backoff, malformed-link and resource-limit fixes.
- Independent Impeccable finish verdict: `ship`; generic handoff and metadata placement findings resolved. Manual detector returned `[]`.
- Native `nginx -t` and `systemd-analyze verify` passed. A dedicated TLS certificate was issued; renewal uses the existing Certbot timer and a scoped NGINX reload hook.
- All 15 public skill pages, ZIP archives and original files returned HTTP 200; ZIP and raw SKILL.md bytes matched. Original files have text/plain, CSP and nosniff. Hidden paths are denied and unknown pages return 404.
- Timer execution at 13:15 UTC (Europe/Lisbon) automatically mirrored future-letter commit `4ac2c431d613d1682155164f9c4450aac5d30ed7`, including its new mirror link; no manual refresh triggered that check.
- Existing itops.dev homepage SHA-256 stayed `7f1863a3efcc315d47ee11ba7f435556a6e7198b7d7fb9f75b66e393b8f1e329`.
- Certificate renewal after expiry, a real future server reboot and long-duration availability were not simulated.

## Progress log
- 2026-10-27: established the separate mirror project and verified existing hosting and visual reference.

- 2026-10-27: user confirmed inclusion of forks; live discovery now finds 15 skills across 12 repositories. Fixed five issues from independent security review; staging cleanup now recovers interrupted builds.

- 2026-10-27: HTTPS deployment and automatic timer propagation verified; both independent reviews completed, no open material fixes.

- 2026-10-27: source repository published publicly (initial commit `cced753`); design documenter completed and validated tokens. Final future-letter commit `f92bc08` was also confirmed on the mirror after its progress-record update.

- 2026-10-27: latest user request supersedes broad discovery. Added exact source selection, filtered cached fallbacks, and confirmed a one-skill local build; no GitHub source repository deletion is part of this change.

- 2026-10-27: production refresh completed at 14:02 UTC with one skill and no warnings. Verified catalog/sitemap pruning, 42 removed URLs returning 404, retained source returning 200, and security review with no findings. Updated the durable publication rule to require exact selection.
