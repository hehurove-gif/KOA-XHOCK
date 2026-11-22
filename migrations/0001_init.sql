-- Esquema de registros XHOCK (Cloudflare D1 / SQLite).
-- Aplicar: npx wrangler d1 migrations apply koa-xhock --remote

-- Un pedido = una compra (comprador + N jugadores).
CREATE TABLE orders (
  id                    TEXT PRIMARY KEY,                -- UUID; también es client_reference_id en Stripe
  created_at            TEXT NOT NULL,                   -- ISO 8601 UTC
  updated_at            TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','awaiting_payment','paid','failed','expired','refunded','review')),
  first_name            TEXT NOT NULL,
  last_name             TEXT NOT NULL,
  email                 TEXT NOT NULL,
  phone                 TEXT NOT NULL,
  country               TEXT NOT NULL,
  quantity              INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 10),
  unit_amount           INTEGER NOT NULL,                -- unidad menor (centavos)
  amount_total          INTEGER NOT NULL,
  currency              TEXT NOT NULL,                   -- minúsculas: 'usd', 'mxn'
  payload_hash          TEXT NOT NULL,                   -- evita pedidos duplicados por doble envío
  stripe_session_id     TEXT UNIQUE,
  stripe_payment_intent TEXT,
  checkout_url          TEXT,
  paid_at               TEXT,
  terms_accepted_at     TEXT NOT NULL,
  terms_version         TEXT NOT NULL,
  attribution           TEXT,                            -- JSON con UTMs / click IDs
  ip_hash               TEXT,                            -- nunca se guarda la IP
  notes                 TEXT
);
CREATE INDEX idx_orders_status ON orders(status, created_at);
CREATE INDEX idx_orders_email ON orders(email);
CREATE INDEX idx_orders_hash ON orders(payload_hash, created_at);
CREATE INDEX idx_orders_payment_intent ON orders(stripe_payment_intent);

-- Jugadores de cada pedido. `team` lo asigna KOA (D1 dashboard, SQL o futura pantalla).
CREATE TABLE players (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  position_no INTEGER NOT NULL,                          -- 1..N dentro del pedido
  name        TEXT NOT NULL,
  age         INTEGER NOT NULL CHECK (age BETWEEN 5 AND 99),
  position    TEXT NOT NULL,
  jersey_size TEXT NOT NULL,
  team        TEXT,
  UNIQUE (order_id, position_no)
);
CREATE INDEX idx_players_order ON players(order_id);

-- Eventos de Stripe ya procesados (idempotencia del webhook).
CREATE TABLE webhook_events (
  id          TEXT PRIMARY KEY,                          -- evt_...
  type        TEXT NOT NULL,
  received_at TEXT NOT NULL
);

-- Límite de peticiones por ventana fija.
CREATE TABLE rate_limits (
  key          TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL
);
