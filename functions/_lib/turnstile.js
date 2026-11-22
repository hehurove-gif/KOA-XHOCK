// Verificación de Cloudflare Turnstile (captcha sin fricción). Solo se exige si existe el secret TURNSTILE_SECRET,
// así el sitio sigue funcionando mientras no se configure. Docs: developers.cloudflare.com/turnstile/get-started/server-side-validation/
export async function verifyTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return { ok: true, skipped: true };
  const response = String(token || '');
  if (!response || response.length > 2048) return { ok: false, reason: 'missing' };

  const base = String(env.TURNSTILE_API_BASE || 'https://challenges.cloudflare.com').replace(/\/$/, '');
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET);
  body.append('response', response);
  if (ip) body.append('remoteip', ip);
  try {
    const result = await fetch(`${base}/turnstile/v0/siteverify`, { method: 'POST', body, signal: AbortSignal.timeout(5000) });
    const data = await result.json();
    return data && data.success === true ? { ok: true } : { ok: false, reason: 'failed', codes: data?.['error-codes'] || [] };
  } catch (error) {
    console.error('turnstile: verification unavailable', error?.message);
    return { ok: false, reason: 'unavailable' };
  }
}
