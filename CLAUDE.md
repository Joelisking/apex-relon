# CLAUDE.md — Relon CRM / Apex Consulting & Surveying

## Project Overview

**Relon CRM** customized for **Apex Consulting & Surveying, Inc.** — a single-tenant, AI-enhanced CRM and Business Performance Dashboard purpose-built for a DBE/MBE/EBE land surveying firm in Fort Wayne, IN.

**Stack:**
- **Frontend:** Next.js 16 (App Router) + Tailwind CSS + shadcn/ui — lives in `frontend/`
- **Backend:** NestJS + Prisma + PostgreSQL — lives in `backend/`
- **AI:** Multi-provider (Anthropic Claude, OpenAI GPT-4o, Google Gemini)
- **Package manager:** npm (root monorepo with workspaces; use `npm` not `yarn` or `bun`)

**Key business context:** This system must beat QFactor (bizwatt.com), a competitor built for land surveyors. Our advantages are AI, bottleneck analytics, full CRM pipeline, workflow automation, and QuickBooks integration.

---

## Permissions & Defaults

- **Web search is permitted without asking.** When unsure about an API, library, behavior, or best practice — search first, then act.
- You may read, write, and edit files freely. For destructive git operations (reset, force push, branch delete), confirm first.
- Do NOT auto-commit unless explicitly asked.
- **Interactive CLI commands** (e.g. `prisma migrate dev`, `git rebase -i`) require a TTY and cannot be run by Claude. When you need one, give the user the exact command to paste and run themselves (prefix with `! ` if in the Claude Code prompt).
- **Prisma schema changes:** Use `npx prisma migrate dev --name <description>` to create a migration file, then commit it. The migration will be applied automatically at deployment via `prisma migrate deploy` in the Dockerfile. Do NOT use `prisma db push` for schema changes — it bypasses migration tracking and will cause deployment failures. The drift issue that previously required `db push` has been resolved (all 22 migrations baselined on 2026-03-21).

---

## How to Use Agents, Skills & Plugins

### Always check available tools first
Before starting a complex task, identify which specialized tools apply:

- **`feature-dev:feature-dev` skill** — Use for any non-trivial new feature. Handles codebase exploration, architecture design, and guided implementation.
- **`frontend-design:frontend-design` skill** — Use when building or redesigning UI components, pages, or layouts. Produces polished, production-grade output.
- **`figma:implement-design` skill** — Use when given a Figma URL to implement. Produces 1:1 visual fidelity code.
- **`claude-developer-platform` skill** — Use when working with the Anthropic SDK, Claude API calls, or AI integration code.
- **`hookify:hookify` skill** — Use to create hooks that prevent recurring unwanted behaviors.
- **`simplify` skill** — Run after writing code to review for quality, reuse, and efficiency.

### Agent subagent types to use proactively
- **`Explore` agent** — For broad codebase exploration before making changes to unfamiliar areas.
- **`Plan` agent** — For designing architecture before touching code. Use for multi-file or multi-module changes.
- **`feature-dev:code-explorer` agent** — Deep-dive into existing feature implementation before adding to it.
- **`feature-dev:code-architect` agent** — Get a blueprint with specific files to create/modify.
- **`feature-dev:code-reviewer` agent** — Run after implementation to catch bugs, security issues, and quality problems.
- **`voltagent-core-dev:backend-developer` agent** — NestJS module, service, controller, and Prisma schema work.
- **`voltagent-core-dev:frontend-developer` agent** — React/Next.js component and page work.
- **`voltagent-core-dev:fullstack-developer` agent** — End-to-end features spanning backend + frontend.
- **`voltagent-data-ai:ai-engineer` agent** — AI integration, prompt engineering, and multi-provider AI work.

### MCP tools available
- **`mcp__nestjs-mcp__*`** — Use for generating NestJS boilerplate (controllers, services, modules, DTOs, entities, guards, interceptors). Always prefer these over writing from scratch.
- **`mcp__shadcn__*`** — Use for finding, viewing, and adding shadcn/ui components. Check `mcp__shadcn__search_items_in_registries` before building a UI component that might already exist.
- **`mcp__next-devtools__*`** — Use for Next.js 16 diagnostics, error detection, and documentation lookup.
- **`mcp__ide__getDiagnostics`** — Run after making code changes to catch TypeScript errors immediately.

---

## Workflow Guidelines

### Before implementing anything
1. **Read the relevant files.** Never propose changes to code you haven't read.
2. **Use `Explore` or `feature-dev:code-explorer`** for unfamiliar modules.
3. **Check `mcp__shadcn__search_items_in_registries`** before building a new UI component.
4. **Check `mcp__nestjs-mcp__nestjs_generate_*`** before writing NestJS boilerplate manually.
5. **Web search** if unsure about library APIs, NestJS patterns, Next.js 16 App Router behavior, Prisma syntax, or QuickBooks/external API details.

### While implementing
- Run `mcp__ide__getDiagnostics` after significant code changes.
- For multi-file features, use `Plan` agent or `EnterPlanMode` before writing code.
- Parallel tool calls where steps are independent — maximize efficiency.

### After implementing
- Run `simplify` skill to review code quality.
- Run `feature-dev:code-reviewer` agent for non-trivial changes.
- Run `mcp__shadcn__get_audit_checklist` after adding new UI components.

---

## Project Architecture

```
Relon-Apex/
├── backend/src/
│   ├── ai/              # Multi-provider AI (Claude, GPT-4o, Gemini)
│   ├── auth/            # JWT + RBAC authentication
│   ├── clients/         # Client management
│   ├── contacts/        # Contact management
│   ├── custom-fields/   # Dynamic custom field system
│   ├── dashboard/       # Executive dashboard metrics
│   ├── files/           # File management
│   ├── forecast/        # Revenue forecasting & targets
│   ├── forms/           # Lead capture forms
│   ├── leads/           # Lead/prospective project pipeline
│   ├── notifications/   # In-app + email notifications
│   ├── permissions/     # Granular 56-permission RBAC
│   ├── pipeline/        # Pipeline stage management
│   ├── products/        # Products & services catalog
│   ├── projects/        # Project management
│   ├── quotes/          # Quote builder
│   ├── reports/         # Reports & analytics
│   ├── roles/           # Role definitions
│   ├── settings/        # Tenant settings
│   ├── tasks/           # Task management
│   ├── workflows/       # No-code automation engine
│   └── app.module.ts
├── frontend/
│   ├── app/             # Next.js 16 App Router pages
│   ├── components/      # Reusable React components
│   ├── contexts/        # React context providers
│   ├── hooks/           # Custom React hooks
│   └── lib/             # Utilities, API clients
└── apex-relon-strategy.md  # Full product strategy & roadmap
```

### Modules planned but not yet built (per strategy doc)
- `backend/src/quickbooks/` — QuickBooks Online integration (CRITICAL PATH)
- `backend/src/time-tracking/` — Native time tracking + QB Time sync
- `backend/src/bottleneck/` — Delay & bottleneck analytics engine

---

## Key Conventions

### Backend (NestJS)
- All modules follow: `module.ts` → `controller.ts` → `service.ts` → `dto/` → `entities/`
- Use `@nestjs/common` decorators consistently.
- Prisma for all DB access — no raw SQL unless necessary.
- All endpoints are tenant-scoped (`tenantId` on every query).
- DTOs use `class-validator` decorators for validation.
- Generate boilerplate with `mcp__nestjs-mcp__nestjs_generate_*` tools.

### Frontend (Next.js 16 + shadcn/ui)
- App Router only — no Pages Router patterns.
- Components use shadcn/ui as the base — check `mcp__shadcn__search_items_in_registries` first.
- Tailwind CSS for styling — no inline styles, no CSS modules.
- TypeScript strict mode.
- Use `mcp__next-devtools__nextjs_index` and `mcp__next-devtools__nextjs_call` for runtime diagnostics.

### Configurable Dropdown Pattern (STANDARD)
Any form field that accepts a finite set of string values (e.g. industry, segment, role, status, category) **must** use `CreatableSelect` backed by the `DropdownOption` system — never a plain `<Input>` or hard-coded `<Select>`. This gives admins control over options without code changes.

**How `CreatableSelect` works (important):**
- The component stores and emits the **label** (human-readable display string, e.g. `"Government"`), NOT the `value` key (e.g. `"government"`).
- `DropdownOption.value` is a dedup key used internally in the DB — it never flows into form fields or gets stored on the entity.
- `DropdownOption.label` is what gets stored on the entity (e.g. `client.industry = "Government"`).
- Matching in the `<Select>` is done by `opt.label`, so the `value` prop passed to `<CreatableSelect>` must be the label string (e.g. the DB value already stored for that entity).

**Pattern for a new dropdown field:**
1. Add a new `category` string (e.g. `'client_industry'`) to `DropdownCategory` in `frontend/lib/types.ts`.
2. Add seed data in `backend/src/settings/settings.service.ts` → `onModuleInit()` using the same `upsert` / count-guard pattern as existing seeds. Seed labels in Title Case.
3. Register the category in the `CATEGORIES` array in `frontend/components/admin/DropdownOptionsView.tsx` (set `hasColor`/`hasIcon` as needed).
4. In the form component:
   - Add a `useState<DropdownOption[]>([])` for the options.
   - Fetch with `settingsApi.getDropdownOptions('<category>')` in `useEffect`.
   - Render `<CreatableSelect>` with `onOptionCreated` calling `settingsApi.createDropdownOption({ category, value: label.toLowerCase().replace(/\s+/g, '_'), label })`.
   - The form field default/loaded value should be the **label string** (what's stored in the DB).
5. The `"Add new..."` option is always the **first** item in the dropdown list (this is built into `CreatableSelect` via `ADD_NEW_SENTINEL`).

See `frontend/components/clients/CreateCustomerDialog.tsx` → `industry` field as the canonical example.

### AI Integration
- Multi-provider support: Anthropic Claude (primary), OpenAI GPT-4o, Google Gemini.
- AI features live in `backend/src/ai/`.
- Use `claude-developer-platform` skill when writing Anthropic SDK code.
- Default to `claude-sonnet-4-6` for production AI features.

### Roles Are Always Dynamic — Never Hardcode Them

**STRICT RULE:** Role names must never be hardcoded anywhere in the codebase — not in frontend components, not in backend DTOs, not in constants arrays.

- **Frontend:** Use `rolesApi.getAll()` (via `useQuery`) to fetch available roles and derive any role-based UI (dropdowns, filters, display labels) from that response.
- **Backend DTOs:** Use `@IsString()` on role fields — never `@IsEnum(['CEO', 'ADMIN', ...])` or any hardcoded role array.
- **Project team sections:** Do not hardcode named-role slots (e.g. "QS", "Designer"). Use the `ProjectAssignment` table and derive the role label from the roles API.
- **Crew role dropdowns:** Always populated from `rolesApi.getAll()`, never from a local `const CREW_ROLES = [...]` array.

This applies to any context: user forms, project assignments, kanban filters, dashboard widgets, pipeline logic, email templates, DTOs.

### Surveying Domain Context
- Pipeline stages use surveying lifecycle (Inquiry → Field Work → Processing → Delivery).
- Key custom fields: Parcel Number, County, Township/Section/Range, INDOT Des Number, Crew Lead.
- Service types: Topographic, Boundary, ROW Engineering, Construction Staking, ALTA/NSPS, Cell Tower, Subdivision Plat, Environmental.

---

## Decision Defaults

| Decision | Default |
|---|---|
| ORM | Prisma |
| Auth | JWT (existing auth module) |
| UI components | shadcn/ui first, then custom |
| AI provider | Anthropic Claude (claude-sonnet-4-6) |
| API style | REST (NestJS controllers) |
| Maps (future) | Google Maps JS API or Mapbox GL |
| QuickBooks auth | OAuth 2.0 via Intuit |
| QB API client | Axios wrapper (not `node-quickbooks`) |
| Package manager | npm |

---

## Common Tasks → Right Tool

| Task | Use |
|---|---|
| New NestJS module | `mcp__nestjs-mcp__nestjs_generate_module` + `nestjs_generate_controller` + `nestjs_generate_service` |
| New DTO with validation | `mcp__nestjs-mcp__nestjs_generate_dto` |
| New TypeORM/Prisma entity | `mcp__nestjs-mcp__nestjs_generate_entity` |
| New shadcn component | `mcp__shadcn__search_items_in_registries` → `mcp__shadcn__get_add_command_for_items` |
| Next.js runtime error | `mcp__next-devtools__nextjs_index` → `mcp__next-devtools__nextjs_call` |
| New full feature (backend + frontend) | `feature-dev:feature-dev` skill |
| New UI page or section | `frontend-design:frontend-design` skill |
| AI/Claude API code | `claude-developer-platform` skill |
| Post-implementation review | `feature-dev:code-reviewer` agent + `simplify` skill |
| Unknown API/library behavior | Web search (always permitted) |
| NestJS security audit | `mcp__nestjs-mcp__nestjs_security_audit` |
| TypeScript errors | `mcp__ide__getDiagnostics` |

---

## Modular Code (STRICT)

Every file must have a single, clear responsibility. Do not put everything in one file.

**Backend rules:**
- Each NestJS module gets its own directory: `module.ts`, `controller.ts`, `service.ts`, `dto/`, `entities/` — never merge these.
- A service must not exceed ~300 lines. If it does, split into focused sub-services (e.g. `leads-query.service.ts`, `leads-mutation.service.ts`).
- DTOs live in `dto/` — never inline them in controller or service files.
- Helper/utility logic goes in a dedicated `*.helper.ts` or `*.util.ts` file, not stuffed into the service.

**Frontend rules:**
- One component per file. No file may export multiple distinct UI components.
- Dialogs, forms, tables, and cards are always separate files — never nested inside a page file.
- Custom hooks go in `hooks/` — not inlined in components.
- API client functions go in `lib/api/` — not inlined in components or hooks.
- If a component file exceeds ~250 lines, it must be split into sub-components.

**General rules:**
- If you find yourself thinking "I'll just add this here for now" — stop and create the right file instead.
- Shared types belong in `lib/types.ts` (frontend) or a dedicated `*.types.ts` file (backend) — not in the file that first needed them.
- Never add a new feature to a file that already has a different responsibility.
- Constants and enums shared across files belong in a dedicated `*.constants.ts` file — not scattered inline.
- Never co-locate test logic with production code. Tests live in `*.spec.ts` / `*.test.ts` files alongside the unit under test.

---

## React Best Practices

### Component Design
- Prefer **composition over inheritance** — build small, focused components and compose them.
- A component does one thing. If it fetches data, transforms it, AND renders a complex layout, split it.
- Pass only the props a component needs. If you're drilling 3+ props down, use context or restructure.
- Avoid anonymous functions and object literals as JSX props — they create new references on every render and break memoization.

```tsx
// Bad — new function reference every render
<Button onClick={() => handleClick(id)} />

// Good
const handleClickItem = useCallback(() => handleClick(id), [id]);
<Button onClick={handleClickItem} />
```

### Server vs Client Components (Next.js App Router)
- **Default to Server Components.** Only add `"use client"` when you need browser APIs, event handlers, or React state/effects.
- Push `"use client"` as far down the component tree as possible — never make an entire page client-side just because one leaf needs interactivity.
- Data fetching belongs in Server Components or Route Handlers — never `useEffect` + fetch for initial page data.
- Use `Suspense` + `loading.tsx` for async Server Component boundaries.

### Hooks
- Follow the Rules of Hooks strictly — only call hooks at the top level, never inside conditionals or loops.
- **`useEffect` dependencies must be complete and honest.** If adding a dependency breaks things, the underlying logic is wrong — fix it, don't suppress the lint rule.
- Effects are for synchronizing with external systems (DOM, timers, subscriptions). Avoid using `useEffect` for derived state or data transformation — compute it inline or with `useMemo`.
- Extract complex effect logic into a custom hook in `hooks/` — never leave a multi-step effect inline in a component.

### State Management
- Keep state as local as possible. Only lift state when multiple siblings need it.
- Never mutate state directly — always return new objects/arrays.
- For form state, use `react-hook-form` — do not manually manage every field with `useState`.
- Use `useReducer` when state transitions are complex (multiple related values, next state depends on previous).
- Contexts are for low-frequency, global values (auth, theme, tenant config) — not for high-frequency updates like form state or list filters.

### Performance
- `React.memo`, `useMemo`, and `useCallback` are **opt-in optimizations** — only add them when there's a measured performance problem, not preemptively.
- Virtualize long lists (100+ rows) with a library like `react-window` or `TanStack Virtual` — never render unbounded lists.
- Avoid expensive computations in the render path — move them into `useMemo` with correct deps.
- Keys in lists must be **stable, unique IDs** — never use array index unless the list is static and never reordered.

```tsx
// Bad
items.map((item, i) => <Row key={i} {...item} />)

// Good
items.map((item) => <Row key={item.id} {...item} />)
```

### Error & Loading States
- Every async operation needs an explicit loading state and error state — never leave the UI empty.
- Use `ErrorBoundary` components around data-heavy sections to prevent full-page crashes.
- Show skeleton loaders (shadcn `Skeleton`) for content that loads asynchronously — not spinners that block interaction.

### Data Fetching Patterns
- Use TanStack Query (`useQuery`, `useMutation`) for all client-side data fetching — never raw `useEffect` + `fetch`.
- Queries belong in custom hooks in `hooks/` (e.g. `useProjects`, `useClientById`) — not inlined in components.
- Invalidate queries after mutations — never manually patch the cache unless necessary.

---

## TypeScript Best Practices

- **No `any`.** Use `unknown` if the type is truly unknown, then narrow it. If you reach for `any`, stop and model the type properly.
- **No `as` type assertions** except at system boundaries (API response parsing, external SDK return types). Inside the application, if you need `as`, the types are wrong.
- Define explicit types/interfaces for all API response shapes, component props, and shared data structures in `lib/types.ts`.
- Use **discriminated unions** to model state machines (e.g. `{ status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: string }`).
- Prefer `interface` for object shapes that may be extended; prefer `type` for unions, intersections, and mapped types.
- Use the `satisfies` operator for config objects to get type-checking without widening the inferred type.
- Avoid non-null assertions (`!`) — handle the `null`/`undefined` case explicitly.
- Enable and respect strict mode — do not add `@ts-ignore` or `@ts-expect-error` without a comment explaining why.

---

## What NOT to Do

- Do not auto-commit without being asked.
- Do not use `yarn` or `bun` — use `npm`.
- Do not skip reading existing code before modifying it.
- Do not add extra features, abstractions, or "improvements" beyond what was requested.
- Do not add docstrings or comments to code you didn't write or change.
- Do not build a UI component from scratch if shadcn/ui has it.
- Do not write NestJS boilerplate from scratch if an MCP tool generates it.
- Do not guess at QuickBooks API behavior — web search or read Intuit docs.
- **Do not put multiple components, services, or responsibilities in one file.** Split first, always.
