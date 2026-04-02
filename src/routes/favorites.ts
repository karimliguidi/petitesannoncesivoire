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

export const favoritesRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// POST /api/favorites/:id — ajouter/retirer des favoris (toggle)
favoritesRoutes.post('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const listingId = parseInt(c.req.param('id'))

    const existing = await c.env.DB.prepare(
      'SELECT id FROM favorites WHERE user_id = ? AND listing_id = ?'
    ).bind(userId, listingId).first()

    if (existing) {
      await c.env.DB.prepare('DELETE FROM favorites WHERE user_id = ? AND listing_id = ?').bind(userId, listingId).run()
      return c.json({ favorited: false, message: 'Retiré des favoris' })
    } else {
      // Vérifier que l'annonce existe
      const listing = await c.env.DB.prepare('SELECT id FROM listings WHERE id = ? AND status = \'active\'').bind(listingId).first()
      if (!listing) return c.json({ error: 'Annonce introuvable' }, 404)
      await c.env.DB.prepare('INSERT INTO favorites (user_id, listing_id) VALUES (?, ?)').bind(userId, listingId).run()
      return c.json({ favorited: true, message: 'Ajouté aux favoris' })
    }
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// GET /api/favorites — liste de mes favoris
favoritesRoutes.get('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const { results } = await c.env.DB.prepare(`
      SELECT l.id, l.title, l.category, l.price, l.location, l.created_at,
             u.name as author_name,
             CASE WHEN l.image_data IS NOT NULL AND l.image_data != '' THEN 1 ELSE 0 END as has_image
      FROM favorites f
      JOIN listings l ON f.listing_id = l.id
      JOIN users u ON l.user_id = u.id
      WHERE f.user_id = ? AND l.status = 'active'
      ORDER BY f.created_at DESC
    `).bind(userId).all()
    return c.json({ favorites: results })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// GET /api/favorites/ids — liste des IDs mis en favoris (pour afficher l'état des cœurs)
favoritesRoutes.get('/ids', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const { results } = await c.env.DB.prepare(
      'SELECT listing_id FROM favorites WHERE user_id = ?'
    ).bind(userId).all<{ listing_id: number }>()
    return c.json({ ids: results.map(r => r.listing_id) })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})
