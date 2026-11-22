// POST /api/admin/team  { "player_ids": [1,2,3], "team": "Azul" }  — asigna (o limpia, con "") el equipo de varios jugadores.
// Mismo token que el listado. Solo toca la columna players.team.
import { json, methodNotAllowed } from '../../_lib/http.js';
import { adminGate } from '../../_lib/admin-auth.js';

const MAX_IDS = 300;


export async function onRequestPost({ request, env }) {
  const denied = await adminGate(request, env);
  if (denied) return denied;

  let body;
  try { body = await request.json(); } catch { return json(400, { error: 'Malformed JSON body.' }); }
  const ids = Array.isArray(body?.player_ids) ? body.player_ids : null;
  if (!ids || ids.length === 0 || ids.length > MAX_IDS || !ids.every(id => Number.isInteger(id) && id > 0)) {
    return json(422, { error: `player_ids must be 1–${MAX_IDS} positive integers.` });
  }
  const team = typeof body.team === 'string' ? body.team.normalize('NFC').replace(/[\u0000-\u001F\u007F]/g, '').trim() : null;
  if (team === null || team.length > 40) return json(422, { error: 'team must be a string of up to 40 characters ("" clears it).' });

  const statements = ids.map(id => env.DB.prepare('UPDATE players SET team = ?1 WHERE id = ?2').bind(team || null, id));
  const results = await env.DB.batch(statements);
  const updated = results.reduce((sum, r) => sum + (r.meta?.changes || 0), 0);
  return json(200, { updated, team: team || null });
}

export async function onRequest() {
  return methodNotAllowed('POST');
}
