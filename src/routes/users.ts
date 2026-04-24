import { Hono } from 'hono'
import type { Bindings } from '../index'
import { verifyToken } from './auth'

type Variables = { userId: number }

async function authMiddleware(c: any, next: any) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Non authentifié' }, 401)
  }
  const token = authHeader.slice(7)
  const secret = c.env.JWT_SECRET || 'default-secret-change-in-prod'
  const payload = await verifyToken(token, secret)
  if (!payload || payload.exp < Math.floor(Date.now() / 1000)) {
    return c.json({ error: 'Token invalide ou expiré' }, 401)
  }
  c.set('userId', payload.sub)
  await next()
}

export const userRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/users/me/listings — mes annonces
userRoutes.get('/me/listings', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const { results } = await c.env.DB.prepare(`
      SELECT id, title, category, price, location, status, created_at,
             views_count, boosted_at, expires_at,
             CASE WHEN image_data IS NOT NULL AND image_data != '' THEN 1
                  WHEN EXISTS (SELECT 1 FROM listing_images li WHERE li.listing_id = listings.id) THEN 1
                  ELSE 0 END as has_image
      FROM listings
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId).all()

    return c.json({ listings: results })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// GET /api/users/me/stats — statistiques du compte
userRoutes.get('/me/stats', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')

    const active = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM listings WHERE user_id = ? AND status = 'active'"
    ).bind(userId).first<{ count: number }>()

    const archived = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM listings WHERE user_id = ? AND status = 'archived'"
    ).bind(userId).first<{ count: number }>()

    const total = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM listings WHERE user_id = ?'
    ).bind(userId).first<{ count: number }>()

    const totalViews = await c.env.DB.prepare(
      "SELECT COALESCE(SUM(views_count), 0) as count FROM listings WHERE user_id = ? AND status = 'active'"
    ).bind(userId).first<{ count: number }>()

    const totalFavs = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM favorites f JOIN listings l ON f.listing_id = l.id WHERE l.user_id = ?"
    ).bind(userId).first<{ count: number }>()

    return c.json({
      active: active?.count || 0,
      archived: archived?.count || 0,
      total: total?.count || 0,
      total_views: totalViews?.count || 0,
      total_favorites: totalFavs?.count || 0
    })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})
