# Sunday Strikers

Production-ready mobile-first PWA for a private Sunday cricket group.

## Generated Phases

### Phase 1: Database and Security

- Supabase schema migrations.
- Match-based availability.
- Required match names for custom labels such as Match 1, Sunday Final, or Revenge Match.
- Super Overs as linked child matches with their own innings, ball events, winner, and result.
- Group settings with group name and logo.
- Match awards with Man of the Match support and future award types.
- Match notes.
- Player photo and group asset storage policies.
- Row Level Security policies for public reads, public availability marking, and admin-only writes.

### Phase 2: TypeScript Domain Types

- Supabase-style `Database` type.
- App-level cricket models.
- Ball event model.
- Derived innings state model.

### Phase 3: Scoring Engine First

- Pure event-sourced scoring reducer.
- Strike rotation.
- Legal and illegal delivery handling.
- Bowling and batting figures.
- Target chase state.
- Undo Last Ball by removing the latest event and recalculating state.

### Phase 4: App Foundation

- Vite React TypeScript app shell.
- React Router route map.
- Tailwind setup.
- PWA setup.
- Public and admin layout skeletons.

### Phase 5: Match-Day Functionality

- Supabase admin login with `is_admin` verification.
- Protected admin routes.
- Player CRUD with photo upload to `player-photos`.
- Match-specific availability with Available, Unavailable, and Maybe statuses.
- Season create, edit, and set active.
- Match creation with required match name, date, overs, players per team, notes, and captains.
- Manual team selection.
- Draft team selection.
- Toss winner and bat/bowl workflow.
- Toss completion creates both innings rows.
- Super Over creation for completed tied parent matches.
- Repository pattern services for auth, players, seasons, availability, matches, and statistics.
- React Query hooks for server state.
- Zustand stores connected to repository services for players, seasons, matches, availability, auth UI, and team workflow state.

### Phase 6: Scoring Persistence

- `ballEventsRepository` for `ball_events` persistence.
- `createBallEvent()`, `getBallEvents()`, and `deleteLastBallEvent()`.
- Snake-case Supabase rows mapped to camel-case scoring engine events.
- React Query hooks for ball event reads, scoring writes, and undo.
- Zustand scoring store connected to Supabase and `calculateInningsState()`.
- After every saved ball or undo, ball events are reloaded from Supabase and innings state is recalculated from the existing scoring engine.

## Important Files

- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_rls_policies.sql`
- `supabase/migrations/003_storage_policies.sql`
- `src/types/database.ts`
- `src/types/models.ts`
- `src/domain/scoring/scoringEngine.ts`
- `src/domain/scoring/scoringEngine.test.ts`
- `src/repositories/`
- `src/hooks/`
- `src/stores/`
- `src/repositories/ballEventsRepository.ts`
- `src/hooks/useBallEvents.ts`
- `src/stores/scoringStore.ts`

## Verification

The test suite is written with Vitest:

```bash
npm install
npm test
```

This local Codex environment has Node available through the bundled runtime, but `npm` is not currently available on PATH, so dependency installation and Vitest execution could not be completed here.
