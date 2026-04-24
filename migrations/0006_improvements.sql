-- Migration 0006 : améliorations majeures
-- 1. Compteur de vues + statut "sold" + boosted + expiration sur listings
ALTER TABLE listings ADD COLUMN views_count INTEGER DEFAULT 0;
ALTER TABLE listings ADD COLUMN boosted_at DATETIME DEFAULT NULL;
ALTER TABLE listings ADD COLUMN expires_at DATETIME DEFAULT NULL;

-- Mettre une expiration par défaut de 60 jours pour les annonces existantes
UPDATE listings SET expires_at = datetime(created_at, '+60 days') WHERE expires_at IS NULL;

-- 2. Table des avis/notes sur les vendeurs
CREATE TABLE IF NOT EXISTS reviews (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  reviewer_id INTEGER NOT NULL,
  seller_id   INTEGER NOT NULL,
  listing_id  INTEGER NOT NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id)   REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (listing_id)  REFERENCES listings(id) ON DELETE CASCADE,
  UNIQUE (reviewer_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_seller   ON reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id);

-- 3. Table rate limiting (pour limiter les publications)
CREATE TABLE IF NOT EXISTS rate_limits (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  action     TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user ON rate_limits(user_id, action, created_at);
