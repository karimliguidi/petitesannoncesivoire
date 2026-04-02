import { Hono } from 'hono'
import type { Bindings } from '../index'
import { verifyToken } from './auth'

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

export const messagesRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// ⚠️ Les routes statiques AVANT les routes paramétrées

// GET /api/messages/unread-count — nombre de messages non lus
messagesRoutes.get('/unread-count', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const row = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0'
    ).bind(userId).first<{ count: number }>()
    return c.json({ count: row?.count || 0 })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// GET /api/messages/inbox — boîte de réception (conversations groupées)
messagesRoutes.get('/inbox', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    // Grouper par conversation (listing + interlocuteur)
    const { results } = await c.env.DB.prepare(`
      SELECT 
        m.listing_id,
        l.title as listing_title,
        CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END as other_user_id,
        CASE WHEN m.sender_id = ? THEN ru.name ELSE su.name END as other_user_name,
        m.content as last_message,
        m.created_at,
        m.sender_id,
        SUM(CASE WHEN m.receiver_id = ? AND m.is_read = 0 THEN 1 ELSE 0 END) as unread_count
      FROM messages m
      JOIN listings l ON m.listing_id = l.id
      JOIN users su ON m.sender_id = su.id
      JOIN users ru ON m.receiver_id = ru.id
      WHERE m.sender_id = ? OR m.receiver_id = ?
      GROUP BY m.listing_id, other_user_id
      ORDER BY m.created_at DESC
    `).bind(userId, userId, userId, userId, userId).all()
    return c.json({ conversations: results })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// POST /api/messages — envoyer un message à propos d'une annonce
messagesRoutes.post('/', authMiddleware, async (c) => {
  try {
    const senderId = c.get('userId')
    const { listing_id, content } = await c.req.json()
    if (!listing_id || !content?.trim()) return c.json({ error: 'Annonce et message requis' }, 400)

    // Récupérer le propriétaire de l'annonce
    const listing = await c.env.DB.prepare(
      "SELECT user_id, title FROM listings WHERE id = ? AND status = 'active'"
    ).bind(listing_id).first<{ user_id: number; title: string }>()
    if (!listing) return c.json({ error: 'Annonce introuvable' }, 404)
    if (listing.user_id === senderId) return c.json({ error: 'Vous ne pouvez pas vous envoyer un message' }, 400)

    const result = await c.env.DB.prepare(
      'INSERT INTO messages (listing_id, sender_id, receiver_id, content) VALUES (?, ?, ?, ?)'
    ).bind(listing_id, senderId, listing.user_id, content.trim()).run()

    // Créer une notification pour le vendeur
    const sender = await c.env.DB.prepare('SELECT name FROM users WHERE id = ?').bind(senderId).first<{ name: string }>()
    await c.env.DB.prepare(
      'INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)'
    ).bind(
      listing.user_id, 'message',
      `Nouveau message de ${sender?.name}`,
      `À propos de : "${listing.title}"`,
      `/listing/${listing_id}`
    ).run()

    return c.json({ id: result.meta.last_row_id, message: 'Message envoyé' }, 201)
  } catch (err) {
    console.error(err)
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// GET /api/messages/:listingId/:otherUserId — conversation complète entre deux utilisateurs
messagesRoutes.get('/:listingId/:otherUserId', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const listingId = parseInt(c.req.param('listingId'))
    const otherUserId = parseInt(c.req.param('otherUserId'))

    if (isNaN(listingId) || isNaN(otherUserId)) {
      return c.json({ error: 'Paramètres invalides' }, 400)
    }

    const { results } = await c.env.DB.prepare(`
      SELECT m.id, m.content, m.created_at, m.is_read, m.sender_id,
             u.name as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.listing_id = ?
        AND ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
      ORDER BY m.created_at ASC
    `).bind(listingId, userId, otherUserId, otherUserId, userId).all()

    // Marquer comme lu
    await c.env.DB.prepare(
      'UPDATE messages SET is_read = 1 WHERE listing_id = ? AND receiver_id = ? AND sender_id = ?'
    ).bind(listingId, userId, otherUserId).run()

    const listing = await c.env.DB.prepare('SELECT id, title, user_id FROM listings WHERE id = ?').bind(listingId).first()
    const otherUser = await c.env.DB.prepare('SELECT id, name FROM users WHERE id = ?').bind(otherUserId).first()

    return c.json({ messages: results, listing, otherUser })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})
