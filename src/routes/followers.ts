import { Hono } from 'hono'
import type { Bindings } from '../index'
import { verifyToken } from './auth'

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

export const followersRoutes = new Hono<{ Bindings: Bindings }>()

// POST /api/followers/:id — toggle follow/unfollow un vendeur
followersRoutes.post('/:id', authMiddleware, async (c) => {
  try {
    const followerId = c.get('userId')
    const followedId = parseInt(c.req.param('id'))

    if (followerId === followedId) return c.json({ error: 'Vous ne pouvez pas vous suivre vous-même' }, 400)

    // Vérifier si déjà suivi
    const existing = await c.env.DB.prepare(
      'SELECT id FROM followers WHERE follower_id = ? AND followed_id = ?'
    ).bind(followerId, followedId).first()

    if (existing) {
      // Unfollow
      await c.env.DB.prepare(
        'DELETE FROM followers WHERE follower_id = ? AND followed_id = ?'
      ).bind(followerId, followedId).run()
      return c.json({ following: false, message: 'Abonnement annulé' })
    } else {
      // Follow
      await c.env.DB.prepare(
        'INSERT INTO followers (follower_id, followed_id) VALUES (?, ?)'
      ).bind(followerId, followedId).run()

      // Créer une notification pour le vendeur suivi
      const follower = await c.env.DB.prepare(
        'SELECT name FROM users WHERE id = ?'
      ).bind(followerId).first<{ name: string }>()

      await c.env.DB.prepare(`
        INSERT INTO notifications (user_id, type, title, body, link)
        VALUES (?, 'follow', ?, ?, ?)
      `).bind(
        followedId,
        '👤 Nouvel abonné',
        `${follower?.name || 'Quelqu\'un'} s'est abonné à vos annonces`,
        `/profile/${followerId}`
      ).run()

      return c.json({ following: true, message: 'Abonnement activé' })
    }
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// GET /api/followers/following — liste des vendeurs que je suis
followersRoutes.get('/following', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const { results } = await c.env.DB.prepare(`
      SELECT u.id, u.name, u.avatar, u.city, u.bio,
             COUNT(l.id) as listings_count
      FROM followers f
      JOIN users u ON u.id = f.followed_id
      LEFT JOIN listings l ON l.user_id = u.id AND l.status = 'active'
      WHERE f.follower_id = ?
      GROUP BY u.id
      ORDER BY f.created_at DESC
    `).bind(userId).all()
    return c.json({ following: results })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// GET /api/followers/ids — IDs des vendeurs que je suis (pour le frontend)
followersRoutes.get('/ids', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const { results } = await c.env.DB.prepare(
      'SELECT followed_id as id FROM followers WHERE follower_id = ?'
    ).bind(userId).all()
    return c.json({ ids: results.map((r: any) => r.id) })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// GET /api/followers/:id/stats — stats d'un profil (nb abonnés, nb abonnements)
followersRoutes.get('/:id/stats', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const followers = await c.env.DB.prepare(
      'SELECT COUNT(*) as n FROM followers WHERE followed_id = ?'
    ).bind(id).first<{ n: number }>()
    const following = await c.env.DB.prepare(
      'SELECT COUNT(*) as n FROM followers WHERE follower_id = ?'
    ).bind(id).first<{ n: number }>()
    return c.json({
      followers_count: followers?.n || 0,
      following_count: following?.n || 0
    })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})
