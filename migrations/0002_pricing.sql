-- Tarifas por categoría: cada jugador guarda lo que se le cobró (unidad menor) y su categoría.
-- Los pedidos anteriores quedan con NULL (se cobraban al precio único de aquella edición).
ALTER TABLE players ADD COLUMN unit_amount INTEGER;
ALTER TABLE players ADD COLUMN price_tier TEXT;
