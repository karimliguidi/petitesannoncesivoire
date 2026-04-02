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

export const notificationsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/notifications — liste des notifications
notificationsRoutes.get('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const { results } = await c.env.DB.prepare(`
      SELECT id, type, title, body, link, is_read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).bind(userId).all()
    return c.json({ notifications: results })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// GET /api/notifications/count — nb non lues
notificationsRoutes.get('/count', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const row = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
    ).bind(userId).first<{ count: number }>()
    return c.json({ count: row?.count || 0 })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// PUT /api/notifications/read-all — tout marquer comme lu
notificationsRoutes.put('/read-all', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    await c.env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').bind(userId).run()
    return c.json({ message: 'Toutes les notifications marquées comme lues' })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// PUT /api/notifications/:id/read — marquer une notification comme lue
notificationsRoutes.put('/:id/read', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const id = parseInt(c.req.param('id'))
    await c.env.DB.prepare(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
    ).bind(id, userId).run()
    return c.json({ message: 'Notification lue' })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})
