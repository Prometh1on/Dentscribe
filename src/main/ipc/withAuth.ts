import type { IpcMainInvokeEvent } from 'electron';
import type { DatabaseInstance } from '../db/types';
import { requireSession } from '../auth/sessionGuard';

export interface GuardedHandlerContext {
  userId: string;
  /** Raw IPC event, exposed for the rare handler that needs to stream progress back via `event.sender.send(...)` (e.g. long-running setup/download steps). Most handlers ignore this. */
  event: IpcMainInvokeEvent;
}

type GuardedHandler<TArgs extends unknown[], TResult> = (
  ctx: GuardedHandlerContext,
  ...args: TArgs
) => Promise<TResult> | TResult;

/**
 * The mandatory choke point for every IPC channel — validates the session
 * (and its 15-minute inactivity window) before the handler runs. Register
 * every channel through this, never a bare ipcMain.handle.
 */
export function withAuth<TArgs extends unknown[], TResult>(
  db: DatabaseInstance,
  handler: GuardedHandler<TArgs, TResult>
) {
  return async (event: IpcMainInvokeEvent, token: string, ...args: TArgs): Promise<TResult> => {
    const session = requireSession(db, token);
    return handler({ userId: session.userId, event }, ...args);
  };
}
