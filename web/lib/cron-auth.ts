export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string; event?: string };

export function verifyCronBearer(params: {
  bearer: string | null;
  secret: string | undefined;
}): CronAuthResult {
  const cronSecret = params.secret?.trim();
  if (!cronSecret) {
    return { ok: false, status: 503, error: 'Cron secret is not configured', event: 'cron_secret_missing' };
  }

  if (params.bearer !== `Bearer ${cronSecret}`) {
    return { ok: false, status: 401, error: 'Unauthorized cron call' };
  }

  return { ok: true };
}
