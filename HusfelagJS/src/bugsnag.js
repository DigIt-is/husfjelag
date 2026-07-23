import Bugsnag from '@bugsnag/js';

// Started only when an API key is configured (Vercel: REACT_APP_BUGSNAG_API_KEY).
// Without a key (e.g. local dev) this is a graceful no-op and errors still log to the console.
const apiKey = process.env.REACT_APP_BUGSNAG_API_KEY;
let started = false;

if (apiKey) {
  try {
    Bugsnag.start({
      apiKey,
      releaseStage: process.env.REACT_APP_ENV || process.env.NODE_ENV || 'production',
      enabledReleaseStages: ['production', 'staging'],
    });
    started = true;
  } catch (e) {
    // Never let error-reporting setup break the app.
    console.error('[bugsnag] failed to start', e);
  }
}

/**
 * Report an error. Always logs to the console; also sends to Bugsnag when configured.
 * @param {Error|any} error   the error (Error instance preferred)
 * @param {string} context    a short "area:action" tag
 * @param {object} [metadata] extra structured context
 */
export function notifyError(error, context, metadata) {
  console.error(`[${context}]`, error, metadata || '');
  if (!started) return;
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    Bugsnag.notify(err, (event) => {
      event.context = context;
      if (metadata) event.addMetadata('context', metadata);
    });
  } catch (e) {
    console.error('[bugsnag] notify failed', e);
  }
}
