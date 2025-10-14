import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

type SnackbarType = 'info' | 'error' | 'success' | 'warning';

interface Snackbar {
  id: string;
  message: string;
  type: SnackbarType;
}

const initialState = {
  queue: [] as Snackbar[],
};

export const SnackbarStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    enqueue: (message: string, type: SnackbarType, ms = 2000) => {
      const id = Math.random().toString(36);
      patchState(store, (state) => {
        return {
          ...state,
          queue: [...state.queue, { message, type, id }],
        };
      });
      setTimeout(() => {
        patchState(store, (state) => {
          return {
            ...state,
            queue: state.queue.filter((snackbar) => snackbar.id !== id),
          };
        });
      }, ms);
    },
    dequeue: (id: string) => {
      patchState(store, (state) => {
        return {
          ...state,
          queue: state.queue.filter((snackbar) => snackbar.id !== id),
        };
      });
    },
  })),
);
