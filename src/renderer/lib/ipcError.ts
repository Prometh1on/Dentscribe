const IPC_INVOKE_PREFIX = /^Error invoking remote method '[^']*':\s*/;
const ERROR_CLASS_PREFIX = /^(?:Type|Range|Reference|Syntax)?Error:\s*/;

/**
 * Electron's ipcRenderer.invoke rejects with an Error whose message is
 * literally `Error invoking remote method '<channel>': <OriginalName>: <msg>`
 * — meaningless wrapper text to a non-technical dental-office user. This
 * strips it down to the underlying message, then maps the couple of causes
 * users actually hit (the local AI not running) to plain language.
 */
export function toFriendlyErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;

  const message = error.message.replace(IPC_INVOKE_PREFIX, '').replace(ERROR_CLASS_PREFIX, '');

  if (/fetch failed|ECONNREFUSED|ENOTFOUND/i.test(message)) {
    return "Couldn't reach the local AI. Make sure setup is complete (see the Setup button above) and try again.";
  }

  return message || fallback;
}
