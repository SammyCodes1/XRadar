/**
 * Serializes on-chain publishes so two cron/overlaps never share a nonce.
 * Each job fetches `pending` nonce after the previous job finishes.
 */
let tail: Promise<unknown> = Promise.resolve();

export function enqueuePublish<T>(job: () => Promise<T>): Promise<T> {
  const run = tail.then(job, job);
  tail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
