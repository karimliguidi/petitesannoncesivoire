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

export const reviewsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/reviews/seller/:sellerId — avis pour un vendeur
reviewsRoutes.get('/seller/:sellerId', async (c) => {
  try {
    const sellerId = parseInt(c.req.param('sellerId'))
    const { results } = await c.env.DB.prepare(`
      SELECT r.id, r.rating, r.comment, r.created_at,
             u.name as reviewer_name, u.avatar as reviewer_avatar,
             l.title as listing_title
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      JOIN listings l ON r.listing_id = l.id
      WHERE r.seller_id = ?
      ORDER BY r.created_at DESC
      LIMIT 20
    `).bind(sellerId).all()

    const avg = await c.env.DB.prepare(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM reviews WHERE seller_id = ?'
    ).bind(sellerId).first<{ avg_rating: number; total: number }>()

    return c.json({
      reviews: results,
      avg_rating: avg?.avg_rating ? Math.round(avg.avg_rating * 10) / 10 : null,
      total: avg?.total || 0
    })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// POST /api/reviews — laisser un avis (authentifié)
reviewsRoutes.post('/', authMiddleware, async (c) => {
  try {
    const reviewerId = c.get('userId')
    const { seller_id, listing_id, rating, comment } = await c.req.json()

    if (!seller_id || !listing_id || !rating) {
      return c.json({ error: 'Vendeur, annonce et note sont requis' }, 400)
    }
    if (rating < 1 || rating > 5) {
      return c.json({ error: 'La note doit être entre 1 et 5' }, 400)
    }
    if (reviewerId === seller_id) {
      return c.json({ error: 'Vous ne pouvez pas vous noter vous-même' }, 400)
    }

    // Vérifier que la transaction a bien eu lieu (l'acheteur a envoyé un message)
    const hasContact = await c.env.DB.prepare(
      'SELECT id FROM messages WHERE sender_id = ? AND listing_id = ?'
    ).bind(reviewerId, listing_id).first()

    if (!hasContact) {
      return c.json({ error: 'Vous devez avoir contacté le vendeur pour laisser un avis' }, 403)
    }

    await c.env.DB.prepare(
      'INSERT OR REPLACE INTO reviews (reviewer_id, seller_id, listing_id, rating, comment) VALUES (?, ?, ?, ?, ?)'
    ).bind(reviewerId, seller_id, listing_id, rating, comment?.trim() || null).run()

    return c.json({ message: 'Avis publié avec succès' }, 201)
  } catch (err) {
    console.error('Create review error:', err)
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// DELETE /api/reviews/:id — supprimer son avis
reviewsRoutes.delete('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const id = parseInt(c.req.param('id'))

    const review = await c.env.DB.prepare(
      'SELECT id FROM reviews WHERE id = ? AND reviewer_id = ?'
    ).bind(id, userId).first()

    if (!review) return c.json({ error: 'Avis introuvable' }, 404)

    await c.env.DB.prepare('DELETE FROM reviews WHERE id = ?').bind(id).run()
    return c.json({ message: 'Avis supprimé' })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})
