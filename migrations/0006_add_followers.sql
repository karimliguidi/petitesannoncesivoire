-- Table followers : abonnements entre utilisateurs
CREATE TABLE IF NOT EXISTS followers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  follower_id INTEGER NOT NULL,  -- celui qui suit
  followed_id INTEGER NOT NULL,  -- celui qui est suivi
  created_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(follower_id, followed_id),
  FOREIGN KEY(follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(followed_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_followers_follower ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_followed ON followers(followed_id);
