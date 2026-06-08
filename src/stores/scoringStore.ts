import { create } from 'zustand';
import { calculateInningsState, type ScoringContext } from '../domain/scoring/scoringEngine';
import { ballEventsRepository, type CreateBallEventInput } from '../repositories/ballEventsRepository';
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
  undoLastBall: (inningsId?: string, context?: ScoringContext) => Promise<DerivedInningsState>;
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
      await ballEventsRepository.deleteLastBallEvent(inningsId ?? context.inningsId);
      const ballEvents = await ballEventsRepository.getBallEvents(context.inningsId);
      const inningsState = calculateInningsState(context, ballEvents);
      set({ ballEvents, inningsState, isSaving: false });
      return inningsState;
    } catch (error) {
      set({ error: errorMessage(error, 'Unable to undo last ball.'), isSaving: false });
      throw error;
    }
  },

  reset: () => set({ context: null, ballEvents: [], inningsState: null, isLoading: false, isSaving: false, error: null })
}));
