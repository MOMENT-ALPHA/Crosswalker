# Repository Guidelines

## Project Structure & Module Organization

The application lives in `src/`; run project commands there. Laravel code belongs in `src/app`, routes in `src/routes`, and migrations, factories, and seeders in `src/database`. The Vue SPA is under `src/resources/js`: pages are in `views`, shared UI in the existing `componets` directory (retain this spelling), state in `stores`, and fixtures in `mock`. PHP tests are in `src/tests/Feature` and `src/tests/Unit`; colocate frontend tests under `resources/js`. Check `doc/要件定義書.md` before domain changes.

## Build, Test, and Development Commands

From `src/`:

- `composer run setup` installs dependencies, initializes `.env` and the database, and builds assets.
- `composer run dev` starts the Laravel development environment.
- `npm run dev` starts Vite for frontend development; `npm run build` creates production assets.
- `composer run test` clears cached configuration and runs PHPUnit.
- `npm run check` runs Prettier checks, ESLint, Vue TypeScript checking, and Vitest.
- `vendor/bin/pint` formats PHP; `npm run format` formats frontend sources.

## Coding Style & Naming Conventions

Use UTF-8, LF endings, a final newline, and four-space indentation (two for YAML). Prettier enforces double quotes, semicolons, trailing commas, and a 200-column limit. Follow Laravel conventions: PascalCase PHP classes, singular models, and snake_case database fields. Use PascalCase Vue filenames and camelCase TypeScript identifiers. Keep `@` and `@css` aliases synchronized between Vite and TypeScript.

## Testing Guidelines

Use PHPUnit for backend behavior and Vitest with jsdom/Vue Test Utils for the SPA. Put integration coverage in `tests/Feature`, isolated logic in `tests/Unit`, and `*.test.ts` or `*.spec.ts` files beside frontend modules. Run a focused PHP test with `php artisan test --filter=Name`, then run `composer run test` and `npm run check` before submission. Add regression tests for fixes; no coverage threshold is configured.

## Commit & Pull Request Guidelines

History uses concise Japanese summaries describing the completed change (for example, `ログイン画面UI調整`). Keep each commit focused and use the same short, imperative style. Pull requests should explain the problem and solution, note verification commands, link relevant issues or requirement sections, and include screenshots for visible UI changes. Call out migrations, environment changes, API compatibility concerns, and remaining follow-up work.

## Security & Configuration

Never commit `.env`, credentials, API keys, or uploaded CSV data. Preserve identifier values as strings so leading zeros are not lost, and keep imports transactional as required by the specification.
