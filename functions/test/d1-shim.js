// Implementación mínima de la API de D1 sobre node:sqlite, para probar las Functions sin Cloudflare.
// Ejecuta las migraciones reales del repo, así el esquema probado es el que se despliega.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MIGRATIONS = fileURLToPath(new URL('../../migrations/', import.meta.url));

export function createD1() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  for (const file of readdirSync(MIGRATIONS).filter(f => f.endsWith('.sql')).sort()) {
    db.exec(readFileSync(MIGRATIONS + file, 'utf8'));
  }

  function prepare(sql) {
    let params = [];
    const statement = {
      bind(...values) { params = values; return statement; },
      async first() { return db.prepare(sql).get(...params) ?? null; },
      async all() { return { results: db.prepare(sql).all(...params), success: true }; },
      async run() { return runSync(); },
      runSync() { const r = db.prepare(sql).run(...params); return { success: true, meta: { changes: Number(r.changes) } }; }
    };
    const runSync = statement.runSync;
    return statement;
  }

  return {
    raw: db,
    prepare,
    async batch(statements) {
      db.exec('BEGIN');
      try {
        const results = statements.map(s => s.runSync());
        db.exec('COMMIT');
        return results;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    }
  };
}
