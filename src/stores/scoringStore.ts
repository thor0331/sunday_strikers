import { create } from 'zustand';
import { calculateInningsState, type ScoringContext } from '../domain/scoring/scoringEngine';
import { ballEventsRepository, type CreateBallEventInput } from '../repositories/ballEventsRepository';
import { matchRepository } from '../repositories/matchRepository';
import type { BallEvent, DerivedInningsState } from '../types/models';

interface ScoringStore {
  context: ScoringContext | null;
  ballEvents: BallEvent[];
  inningsState: DerivedInningsState | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  setContext: (context: ScoringContext) => void;
  loadInningsState: (context?: ScoringContext) => Promise<DerivedInningsState>;
  createBallEvent: (input: CreateBallEventInput, context?: ScoringContext) => Promise<DerivedInningsState>;
  undoLastBall: (inningsId?: string, context?: ScoringContext) => Promise<{ inningsState: DerivedInningsState; restoredCrease: { strikerId: string; nonStrikerId: string } | null }>;
  reset: () => void;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function resolveContext(current: ScoringContext | null, next?: ScoringContext): ScoringContext {
  const context = next ?? current;
  if (!context) throw new Error('Scoring context is required.');
  return context;
}

// The crease columns on the innings row hold ONLY a pending, un-reflected crease
// change (written at Start and on manual batsman changes). Once a delivery is
// bowled, the change is reflected in the ball event and the replay derives the
// crease from the record, so the columns are cleared here after every ball. This
// keeps the row from going stale after rotations/wickets and survives refresh.
async function clearPersistedCrease(inningsId: string, state: DerivedInningsState) {
  if (state.isCompleted) return;
  try {
    await matchRepository.updateInnings(inningsId, {
      current_striker_id: null,
      current_non_striker_id: null,
      current_bowler_id: null
    });
  } catch (error) {
    console.error('Unable to clear persisted crease:', error);
  }
}

export const useScoringStore = create<ScoringStore>((set, get) => ({
  context: null,
  ballEvents: [],
  inningsState: null,
  isLoading: false,
  isSaving: false,
  error: null,

  setContext: (context) => set({ context }),

  loadInningsState: async (nextContext) => {
    const context = resolveContext(get().context, nextContext);
    set({ isLoading: true, error: null, context });

    try {
      const ballEvents = await ballEventsRepository.getBallEvents(context.inningsId);
      const inningsState = calculateInningsState(context, ballEvents);
      set({ ballEvents, inningsState, isLoading: false });
      return inningsState;
    } catch (error) {
      set({ error: errorMessage(error, 'Unable to load scoring state.'), isLoading: false });
      throw error;
    }
  },

  createBallEvent: async (input, nextContext) => {
    const context = resolveContext(get().context, nextContext);
    set({ isSaving: true, error: null, context });

    try {
      await ballEventsRepository.createBallEvent(input);
      const ballEvents = await ballEventsRepository.getBallEvents(context.inningsId);
      const inningsState = calculateInningsState(context, ballEvents);
      set({ ballEvents, inningsState, isSaving: false });
      await clearPersistedCrease(context.inningsId, inningsState);
      return inningsState;
    } catch (error) {
      set({ error: errorMessage(error, 'Unable to save ball event.'), isSaving: false });
      throw error;
    }
  },

  undoLastBall: async (inningsId, nextContext) => {
    const context = resolveContext(get().context, nextContext);
    set({ isSaving: true, error: null, context });

    try {
      const deleted = await ballEventsRepository.deleteLastBallEvent(inningsId ?? context.inningsId);
      const ballEvents = await ballEventsRepository.getBallEvents(context.inningsId);
      const inningsState = calculateInningsState(context, ballEvents);
      set({ ballEvents, inningsState, isSaving: false });

      let restoredCrease: { strikerId: string; nonStrikerId: string } | null = null;
      if (deleted && !inningsState.isCompleted) {
        restoredCrease = { strikerId: deleted.strikerId, nonStrikerId: deleted.nonStrikerId };
        try {
          await matchRepository.updateInnings(context.inningsId, {
            current_striker_id: deleted.strikerId,
            current_non_striker_id: deleted.nonStrikerId
          });
        } catch (error) {
          console.error('Unable to re-arm persisted crease after undo:', error);
        }
      } else {
        await clearPersistedCrease(context.inningsId, inningsState);
      }

      return { inningsState, restoredCrease };
    } catch (error) {
      set({ error: errorMessage(error, 'Unable to undo last ball.'), isSaving: false });
      throw error;
    }
  },

  reset: () => set({ context: null, ballEvents: [], inningsState: null, isLoading: false, isSaving: false, error: null })
}));

