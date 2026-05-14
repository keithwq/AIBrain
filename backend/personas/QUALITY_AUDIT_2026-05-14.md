# Persona Quality Audit - 2026-05-14

Scope: current `backend/personas/*-perspective` directories.

## Current Personas

- `zhiyuan-laoshi-perspective`
- `lishi-sir-perspective`
- `songbai-xiansheng-perspective`
- `mingheng-fawu-perspective`
- `muhe-laoshi-perspective`
- `qinghe-xiezuo-perspective`
- `songyue-shici-perspective`
- `mingfeng-guwen-perspective`
- `anran-laoshi-perspective`
- `yunqiao-jiaoxue-perspective`

## Repairs Completed

- Rewrote front-stage `SKILL.md` files that had mojibake or prototype leakage risk.
- Enforced runtime anonymity: no prototype names, institutions, channels, works packaging, fan metrics, or authorization hints.
- Added `references/research`, `references/sources`, and `scripts` structure to all current personas.
- Rebuilt the previously thin education-planning and conflict-marketing personas as `zhiyuan-laoshi` and `mingfeng-guwen`, with safer names, database migration coverage, thick runtime protocols, task-test matrices, output templates, source registers, and distillation reports.
- Added output structures, work-product patterns, quality self-checks, and honest boundaries where missing.
- Thickened `qinghe-xiezuo`, `songyue-shici`, and `yunqiao-jiaoxue` with scenario routing cards, work-product patterns, quality self-checks, and runtime maintenance notes.
- Renamed `chuizi-sir` to `lishi-sir` / `砺石Sir`, added database migration coverage, and rewrote its runtime and research layer to remove direct prototype, institution, product, channel, media-link, commercial-number, and authorization leakage.
- Added task-test matrices, work-product templates, source-gap maps, and distillation boundary notes for `qinghe-xiezuo`, `yunqiao-jiaoxue`, and `songyue-shici`.

## Verification

- Prototype leakage scan: passed for current `SKILL.md` files.
- Mojibake scan: passed for current `SKILL.md` files.
- Backend type check: `cmd /c npx tsc --noEmit` passed.

## Remaining Work

- `zhiyuan-laoshi` and `mingfeng-guwen`: now meet the local runnable thick-distillation floor. Future improvement should add larger anonymized case corpora and source-backed data packs.
- Several personas have valid runtime structure but should be deepened with more task tests and source registration.
- Some old research markdown files are not valid UTF-8. They were left untouched to avoid corrupting source material; new runtime notes were added as UTF-8 files instead.
- Future updates must keep runtime prompts anonymized even when internal research sources preserve provenance.
