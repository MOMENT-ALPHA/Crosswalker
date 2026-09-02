# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This is **CROSSWALK** (商品識別子管理システム), a product-identifier management system. The full requirements are specified in [doc/要件定義書.md](doc/要件定義書.md) (Japanese) — read it before implementing any screen, API endpoint, or data model, since almost none of the application has been built yet.

Current state:
- **The Vue SPA front end is built, but runs entirely on mock data.** All 7 screens (SCR-001〜SCR-030) exist under `src/resources/js/views/`, with shared components in `src/resources/js/componets/` (note the existing directory-name typo) and `src/resources/js/layouts/`.
- Domain state lives in `src/resources/js/stores/catalog.ts`, seeded from `src/resources/js/mock/data.ts`. It holds items/SKUs/brands/categories/API settings in memory and implements search, uniqueness validation, and CSV validate/commit client-side. **When the backend lands, replace these store actions with axios calls** — the screens only talk to the store, not to `fetch`/`axios`.
- Auth is mocked in `src/resources/js/stores/auth.ts` (`admin` / `password`, persisted via `pinia-plugin-persistedstate`); no server session exists yet.
- `src/routes/web.php` now serves the SPA shell (`resources/views/app.blade.php`) for every path; no API routes exist yet.
- `src/app/Models/` only has the default `User` model; no `Item`/`Sku`/`Brand`/`Category`/API-settings models or migrations exist yet.
- `eslint.config.js` and `vitest.config.ts` now exist; `npm run check` (format + lint + typecheck + test) passes. There are no tests yet (`--passWithNoTests`).
- `src/CLAUDE.md` and `src/AGENTS.md` are Laravel Boost's unconfigured bootstrap stub (not project-specific guidance). If asked to set up Boost, run `composer require laravel/boost --dev && php artisan boost:install` from `src/`, then re-read `src/AGENTS.md` for the generated guidelines.

For anything on the backend side, prefer the requirements doc and this file over pattern-matching against existing code — there isn't yet an existing pattern for most of the domain.

## Repository layout

The actual Laravel application lives in **`src/`**, not the repo root — `cd src` (or prefix commands) before running any PHP/Composer/npm command. The repo root only holds `doc/` (requirements) and `.devcontainer/` (dev environment).

## System architecture (per requirements doc)

- **Backend**: Laravel 13 (PHP 8.3) serving both server-rendered auth/session pages and a JSON API.
- **Frontend**: Vue 3 SPA (`resources/js`, entry `app.ts`), Vue Router (history mode, route names `dashboard` / `items` / `item-detail` / `item-create` / `item-edit` / `csv-import` / `settings`), Pinia (with `pinia-plugin-persistedstate`), Tailwind CSS 4, built with Vite.
- **Database**: MariaDB/MySQL in the devcontainer (`config/database.php` default is `sqlite` locally — check `.env` for the active connection).
- **External API**: a separate, versioned JSON API (`/api/v1/...`) for read-only external access, authenticated via API key + IP/CIDR allowlist (distinct from the Web session auth). See §6–7 of the requirements doc for the endpoint list, response shape, status codes, and security rules (hashed API keys, trusted-proxy IP resolution, rate limiting).

### Domain model

- `items` (品番, "item number") is the top-level entity: item code, brand, category, parent ASIN, memo.
- `skus` (SKU) belong to an item (one item → many SKUs). Each SKU embeds exactly one TQ key (`tq_item_no` + `tq_color_no` + `tq_size`) 1:1 — these are stored as SKU columns, not a separate table, because a SKU and its TQ key are always created/edited/deleted together.
- `brands` and `categories` are simple lookup tables managed from the site-settings screen.
- `api_settings` / `api_allowed_sources` hold the external API's enabled state, hashed API key, and allowed IP/CIDR entries.
- Uniqueness rules to preserve in migrations/validation: `items.item_no` unique; `skus.sku_code` unique; `skus.child_asin` unique when present (nullable-unique); `(tq_item_no, tq_color_no, tq_size)` unique together; brand/category names unique after trimming whitespace. Item/SKU codes and ASIN/TQ values are strings and must preserve leading zeros — never cast them to numeric types.
- Deleting an item cascades to delete its SKUs in the same operation.

### Key screens (see §3–4 of requirements doc for full field/behavior lists)

Login → Dashboard → Item list (search/filter) → Item detail → Item create/edit (with inline multi-row SKU editing, duplicate-to-new-item, unsaved-changes guard) → CSV import (validate-then-commit, whole-file-atomic) → Site settings (brands, categories, API connection settings).

CSV import is transactional per file (§5.3): validation must fully pass before any row is committed, and a mid-import error rolls back the entire file. Uploaded CSVs must be stored outside the public web root with a server-generated filename (§7.3).

## Common commands

Run these from `src/` unless noted.

### PHP / Laravel
```sh
composer install                 # install PHP deps
php artisan dev                  # run local dev (composer run dev wraps this)
php artisan migrate              # run migrations
php artisan test                 # run PHPUnit suite (composer run test wraps this, clearing config cache first)
php artisan test --filter=Name   # run a single test by method/class name
vendor/bin/phpunit tests/Feature/SomeTest.php   # run a single test file directly
vendor/bin/pint                  # format PHP (Laravel Pint)
```

### Frontend
```sh
npm install
npm run dev                      # Vite dev server
npm run build                    # production build
npm run format / format:check    # Prettier
npm run lint                     # ESLint (resources/js, vite/vitest/eslint configs) — needs eslint.config.js, not yet present
npm run typecheck                # vue-tsc --noEmit
npm run test                     # Vitest — needs vitest.config.ts, not yet present
npm run check                    # format:check + lint + typecheck + test, in that order
```

### Path aliases
`@` → `resources/js`, `@css` → `resources/css` (defined in both `vite.config.js` and `tsconfig.json` — keep them in sync if changed).

## Formatting conventions

- Prettier: 4-space indent, double quotes, semicolons, trailing commas everywhere, 200-char print width, strict HTML whitespace sensitivity (see `src/.prettierrc`).
- EditorConfig: LF line endings, 4-space indent (2 for YAML), final newline required, UTF-8.

## Dev environment

The devcontainer (`.devcontainer/`) builds an AlmaLinux 9.6 image with PHP 8.3, Composer, and Node 24, and runs `db` (MySQL 8.0) and `phpmyadmin` (port 8081) alongside the `app` service via Docker Compose. The app source is bind-mounted at `/workspace`; `vendor/` and `node_modules/` use named volumes for caching.
