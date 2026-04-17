--Follow react and nextjs best practices
Specially this one /notes/you-might-not-need-effect.md

## Changelog Rule

When your work in a conversation includes **user-facing changes**, update `app/changelog/page.ts` before finishing:

### What counts as user-facing

- New features, pages, or UI components
- Visual/UX changes (layout, styling, copy)
- Bug fixes that affected user behavior
- Removed features or breaking changes

### What does NOT go in the changelog

- Internal refactors with no visible change
- Dependency bumps (unless they fix a user-visible bug)
- Code cleanup, linting, type fixes
- Dev tooling, CI/CD, or config changes
- Test additions/changes

### How to update

1. If the changes fit an existing unreleased version entry at the top of the array, add items to it.
2. If this is a new release (user says so, or the top entry already has a different scope), add a new entry at the **top** of the `changelog` array with a bumped version:
   - **patch** (x.x.+1) for bug fixes
   - **minor** (x.+1.0) for new features
   - **major** (+1.0.0) for breaking changes
3. Each entry needs: `version`, `date` (YYYY-MM-DD), `title` (short summary), and `changes` grouped by type (`added`, `changed`, `fixed`, `removed`).
4. Keep descriptions concise — one line per item, written from the user's perspective (e.g. "Added zoom controls to editor" not "Implemented useZoom hook").
