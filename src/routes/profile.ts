import { Hono } from 'hono'
import type { Bindings } from '../index'
import { verifyToken, hashPassword } from './auth'

type Variables = { userId: number; userName: string }

async function authMiddleware(c: any, next: any) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return c.json({ error: 'Non authentifié' }, 401)
  const token = authHeader.slice(7)
  const secret = c.env.JWT_SECRET || 'default-secret-change-in-prod'
  const payload = await verifyToken(token, secret)
  if (!payload || payload.exp < Math.floor(Date.now() / 1000)) return c.json({ error: 'Token expiré' }, 401)
  c.set('userId', payload.sub)
  c.set('userName', payload.name)
  await next()
}

async function adminMiddleware(c: any, next: any) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return c.json({ error: 'Non authentifié' }, 401)
  const token = authHeader.slice(7)
  const secret = c.env.JWT_SECRET || 'default-secret-change-in-prod'
  const payload = await verifyToken(token, secret)
  if (!payload || payload.exp < Math.floor(Date.now() / 1000)) return c.json({ error: 'Token expiré' }, 401)
  // Vérifier rôle admin en DB
  const user = await c.env.DB.prepare('SELECT is_admin FROM users WHERE id = ?').bind(payload.sub).first<{ is_admin: number }>()
  if (!user?.is_admin) return c.json({ error: 'Accès réservé aux administrateurs' }, 403)
  c.set('userId', payload.sub)
  await next()
}

export const profileRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// ⚠️ Routes statiques AVANT routes paramétrées

// GET /api/profile/me — mon profil complet
profileRoutes.get('/me', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const user = await c.env.DB.prepare(
      'SELECT id, name, email, phone, city, bio, avatar, created_at FROM users WHERE id = ?'
    ).bind(userId).first()
    if (!user) return c.json({ error: 'Utilisateur introuvable' }, 404)
    return c.json({ user })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// PUT /api/profile/me — mettre à jour mon profil
profileRoutes.put('/me', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const { name, phone, city, bio, avatar } = await c.req.json()
    if (!name?.trim()) return c.json({ error: 'Le nom est obligatoire' }, 400)
    if (avatar && avatar.length > 300000) return c.json({ error: 'Avatar trop grand (max 220 Ko)' }, 400)

    await c.env.DB.prepare(
      'UPDATE users SET name = ?, phone = ?, city = ?, bio = ?, avatar = ? WHERE id = ?'
    ).bind(name.trim(), phone || null, city || null, bio || null, avatar || null, userId).run()
    return c.json({ message: 'Profil mis à jour' })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// PUT /api/profile/me/password — changer mot de passe
profileRoutes.put('/me/password', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const { current_password, new_password } = await c.req.json()
    if (!current_password || !new_password) return c.json({ error: 'Les deux mots de passe sont requis' }, 400)
    if (new_password.length < 6) return c.json({ error: 'Le nouveau mot de passe doit faire au moins 6 caractères' }, 400)

    const user = await c.env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(userId).first<{ password_hash: string }>()
    if (!user) return c.json({ error: 'Utilisateur introuvable' }, 404)

    const currentHash = await hashPassword(current_password)
    if (currentHash !== user.password_hash) return c.json({ error: 'Mot de passe actuel incorrect' }, 401)

    const newHash = await hashPassword(new_password)
    await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(newHash, userId).run()
    return c.json({ message: 'Mot de passe mis à jour' })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// ── ADMIN ROUTES ─────────────────────────────────────────────
// ⚠️ Ces routes doivent être avant GET /:id pour éviter que "admin" soit capturé comme un ID

// GET /api/profile/admin/stats — statistiques globales
profileRoutes.get('/admin/stats', adminMiddleware, async (c) => {
  try {
    const totalUsers     = await c.env.DB.prepare('SELECT COUNT(*) as n FROM users').first<{n:number}>()
    const totalListings  = await c.env.DB.prepare('SELECT COUNT(*) as n FROM listings').first<{n:number}>()
    const activeListings = await c.env.DB.prepare("SELECT COUNT(*) as n FROM listings WHERE status='active'").first<{n:number}>()
    const totalMessages  = await c.env.DB.prepare('SELECT COUNT(*) as n FROM messages').first<{n:number}>()
    const totalFavs      = await c.env.DB.prepare('SELECT COUNT(*) as n FROM favorites').first<{n:number}>()
    const newUsersToday  = await c.env.DB.prepare("SELECT COUNT(*) as n FROM users WHERE date(created_at)=date('now')").first<{n:number}>()
    const newListingsToday = await c.env.DB.prepare("SELECT COUNT(*) as n FROM listings WHERE date(created_at)=date('now')").first<{n:number}>()

    // Top catégories
    const { results: topCats } = await c.env.DB.prepare(
      "SELECT category, COUNT(*) as count FROM listings WHERE status='active' GROUP BY category ORDER BY count DESC LIMIT 5"
    ).all()

    // Derniers utilisateurs
    const { results: latestUsers } = await c.env.DB.prepare(
      'SELECT id, name, email, city, created_at FROM users ORDER BY created_at DESC LIMIT 10'
    ).all()

    return c.json({
      stats: {
        total_users: totalUsers?.n || 0,
        total_listings: totalListings?.n || 0,
        active_listings: activeListings?.n || 0,
        total_messages: totalMessages?.n || 0,
        total_favorites: totalFavs?.n || 0,
        new_users_today: newUsersToday?.n || 0,
        new_listings_today: newListingsToday?.n || 0,
      },
      top_categories: topCats,
      latest_users: latestUsers
    })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// GET /api/profile/admin/listings — toutes les annonces (admin)
profileRoutes.get('/admin/listings', adminMiddleware, async (c) => {
  try {
    const status = c.req.query('status') || 'active'
    const limit  = parseInt(c.req.query('limit') || '50')
    const offset = parseInt(c.req.query('offset') || '0')
    const { results } = await c.env.DB.prepare(`
      SELECT l.id, l.title, l.category, l.price, l.location, l.status, l.created_at,
             u.name as author_name, u.email as author_email
      FROM listings l JOIN users u ON l.user_id = u.id
      WHERE l.status = ?
      ORDER BY l.created_at DESC LIMIT ? OFFSET ?
    `).bind(status, limit, offset).all()
    return c.json({ listings: results })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// DELETE /api/profile/admin/listings/:id — supprimer une annonce (admin)
profileRoutes.delete('/admin/listings/:id', adminMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    await c.env.DB.prepare('DELETE FROM listings WHERE id = ?').bind(id).run()
    return c.json({ message: "Annonce supprimée par l'administrateur" })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// GET /api/profile/admin/users — liste des utilisateurs (admin)
profileRoutes.get('/admin/users', adminMiddleware, async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT u.id, u.name, u.email, u.city, u.is_admin, u.created_at,
             COUNT(l.id) as listings_count
      FROM users u
      LEFT JOIN listings l ON l.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `).all()
    return c.json({ users: results })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// PUT /api/profile/admin/users/:id/toggle-admin — promouvoir/rétrograder admin
profileRoutes.put('/admin/users/:id/toggle-admin', adminMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const user = await c.env.DB.prepare('SELECT is_admin FROM users WHERE id = ?').bind(id).first<{ is_admin: number }>()
    if (!user) return c.json({ error: 'Utilisateur introuvable' }, 404)
    const newVal = user.is_admin ? 0 : 1
    await c.env.DB.prepare('UPDATE users SET is_admin = ? WHERE id = ?').bind(newVal, id).run()
    return c.json({ is_admin: newVal, message: newVal ? 'Promu administrateur' : 'Rôle admin retiré' })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// GET /api/profile/:id — profil public d'un utilisateur (⚠️ DOIT être APRÈS les routes admin)
profileRoutes.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.json({ error: 'ID invalide' }, 400)

    const user = await c.env.DB.prepare(
      'SELECT id, name, city, bio, avatar, created_at FROM users WHERE id = ?'
    ).bind(id).first()
    if (!user) return c.json({ error: 'Utilisateur introuvable' }, 404)

    const { results: listings } = await c.env.DB.prepare(`
      SELECT id, title, category, price, location, created_at,
             CASE WHEN image_data IS NOT NULL AND image_data != '' THEN 1 ELSE 0 END as has_image
      FROM listings WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 20
    `).bind(id).all()

    return c.json({ user, listings })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})
