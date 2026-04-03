import { Hono } from 'hono'
import type { Bindings } from '../index'
import { verifyToken } from './auth'

type Variables = { userId: number }

async function authMiddleware(c: any, next: any) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return c.json({ error: 'Non authentifié' }, 401)
  const token = authHeader.slice(7)
  const secret = c.env.JWT_SECRET || 'default-secret-change-in-prod'
  const payload = await verifyToken(token, secret)
  if (!payload || payload.exp < Math.floor(Date.now() / 1000)) return c.json({ error: 'Token expiré' }, 401)
  c.set('userId', payload.sub)
  await next()
}

async function adminMiddleware(c: any, next: any) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return c.json({ error: 'Non authentifié' }, 401)
  const token = authHeader.slice(7)
  const secret = c.env.JWT_SECRET || 'default-secret-change-in-prod'
  const payload = await verifyToken(token, secret)
  if (!payload || payload.exp < Math.floor(Date.now() / 1000)) return c.json({ error: 'Token expiré' }, 401)
  const user = await c.env.DB.prepare('SELECT is_admin FROM users WHERE id = ?').bind(payload.sub).first<{ is_admin: number }>()
  if (!user?.is_admin) return c.json({ error: 'Accès réservé aux administrateurs' }, 403)
  c.set('userId', payload.sub)
  await next()
}

export const reportsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// POST /api/reports — signaler une annonce
reportsRoutes.post('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const { listing_id, reason, details } = await c.req.json()
    if (!listing_id || !reason) return c.json({ error: 'Annonce et motif requis' }, 400)

    const listing = await c.env.DB.prepare(
      "SELECT id, user_id FROM listings WHERE id = ? AND status = 'active'"
    ).bind(listing_id).first<{ id: number; user_id: number }>()
    if (!listing) return c.json({ error: 'Annonce introuvable' }, 404)
    if (listing.user_id === userId) return c.json({ error: 'Vous ne pouvez pas signaler votre propre annonce' }, 400)

    // Vérifier si déjà signalé
    const existing = await c.env.DB.prepare(
      'SELECT id FROM reports WHERE listing_id = ? AND user_id = ?'
    ).bind(listing_id, userId).first()
    if (existing) return c.json({ error: 'Vous avez déjà signalé cette annonce' }, 409)

    await c.env.DB.prepare(
      'INSERT INTO reports (listing_id, user_id, reason, details) VALUES (?, ?, ?, ?)'
    ).bind(listing_id, userId, reason, details || null).run()

    // Notifier les admins si l'annonce a 3+ signalements
    const countRow = await c.env.DB.prepare(
      "SELECT COUNT(*) as n FROM reports WHERE listing_id = ? AND status = 'pending'"
    ).bind(listing_id).first<{ n: number }>()

    if ((countRow?.n || 0) >= 3) {
      const admins = await c.env.DB.prepare('SELECT id FROM users WHERE is_admin = 1').all<{ id: number }>()
      for (const admin of admins.results) {
        await c.env.DB.prepare(
          'INSERT OR IGNORE INTO notifications (user_id, type, title, body) VALUES (?, ?, ?, ?)'
        ).bind(admin.id, 'system', '⚠️ Annonce signalée 3+ fois', `L\'annonce #${listing_id} a reçu plusieurs signalements`).run()
      }
    }

    return c.json({ message: 'Signalement envoyé, merci !' }, 201)
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// GET /api/reports/admin — liste des signalements (admin)
reportsRoutes.get('/admin', adminMiddleware, async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT r.id, r.reason, r.details, r.status, r.created_at,
             l.id as listing_id, l.title as listing_title,
             u.name as reporter_name, u.email as reporter_email,
             (SELECT COUNT(*) FROM reports r2 WHERE r2.listing_id = r.listing_id AND r2.status='pending') as total_reports
      FROM reports r
      JOIN listings l ON r.listing_id = l.id
      JOIN users u ON r.user_id = u.id
      WHERE r.status = 'pending'
      ORDER BY total_reports DESC, r.created_at DESC
      LIMIT 100
    `).all()
    return c.json({ reports: results })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// PUT /api/reports/:id/resolve — résoudre un signalement (admin)
reportsRoutes.put('/:id/resolve', adminMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    await c.env.DB.prepare("UPDATE reports SET status = 'resolved' WHERE id = ?").bind(id).run()
    return c.json({ message: 'Signalement résolu' })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// DELETE /api/reports/:listingId/delete-listing — supprimer annonce signalée (admin)
reportsRoutes.delete('/:listingId/delete-listing', adminMiddleware, async (c) => {
  try {
    const listingId = parseInt(c.req.param('listingId'))
    await c.env.DB.prepare('DELETE FROM listings WHERE id = ?').bind(listingId).run()
    await c.env.DB.prepare("UPDATE reports SET status = 'resolved' WHERE listing_id = ?").bind(listingId).run()
    return c.json({ message: 'Annonce supprimée et signalements résolus' })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})
