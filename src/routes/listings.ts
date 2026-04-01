import { Hono } from 'hono'
import type { Bindings } from '../index'
import { verifyToken } from './auth'

type Variables = { userId: number; userName: string }

// Middleware d'authentification
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
  c.set('userName', payload.name)
  await next()
}

export const listingsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/listings — liste publique avec filtres
listingsRoutes.get('/', async (c) => {
  try {
    const category = c.req.query('category')
    const search = c.req.query('search')
    const limit = parseInt(c.req.query('limit') || '50')
    const offset = parseInt(c.req.query('offset') || '0')

    let query = `
      SELECT l.id, l.title, l.description, l.category, l.price, l.location, l.contact,
             l.status, l.created_at, u.name as author_name
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE l.status = 'active'
    `
    const params: any[] = []

    if (category) {
      query += ' AND l.category = ?'
      params.push(category)
    }
    if (search) {
      query += ' AND (l.title LIKE ? OR l.description LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    query += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const { results } = await c.env.DB.prepare(query).bind(...params).all()
    return c.json({ listings: results, total: results.length })
  } catch (err) {
    console.error('List listings error:', err)
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// GET /api/listings/:id — détail d'une annonce
listingsRoutes.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const listing = await c.env.DB.prepare(`
      SELECT l.id, l.title, l.description, l.category, l.price, l.location, l.contact,
             l.status, l.created_at, l.user_id, u.name as author_name
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = ? AND l.status = 'active'
    `).bind(id).first()

    if (!listing) return c.json({ error: 'Annonce introuvable' }, 404)
    return c.json({ listing })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// POST /api/listings — créer une annonce (authentifié)
listingsRoutes.post('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const { title, description, category, price, location, contact } = await c.req.json()

    if (!title || !description || !category) {
      return c.json({ error: 'Titre, description et catégorie sont obligatoires' }, 400)
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO listings (user_id, title, description, category, price, location, contact)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      title.trim(),
      description.trim(),
      category,
      price ? parseFloat(price) : null,
      location?.trim() || null,
      contact?.trim() || null
    ).run()

    return c.json({ id: result.meta.last_row_id, message: 'Annonce publiée avec succès' }, 201)
  } catch (err) {
    console.error('Create listing error:', err)
    return c.json({ error: 'Erreur serveur lors de la publication' }, 500)
  }
})

// DELETE /api/listings/:id — supprimer son annonce (authentifié)
listingsRoutes.delete('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const id = parseInt(c.req.param('id'))

    // Vérifier que l'annonce appartient à l'utilisateur
    const listing = await c.env.DB.prepare(
      'SELECT id FROM listings WHERE id = ? AND user_id = ?'
    ).bind(id, userId).first()

    if (!listing) return c.json({ error: 'Annonce introuvable ou non autorisé' }, 404)

    await c.env.DB.prepare('DELETE FROM listings WHERE id = ?').bind(id).run()
    return c.json({ message: 'Annonce supprimée' })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// PUT /api/listings/:id/archive — archiver son annonce (authentifié)
listingsRoutes.put('/:id/archive', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const id = parseInt(c.req.param('id'))

    const listing = await c.env.DB.prepare(
      'SELECT id FROM listings WHERE id = ? AND user_id = ?'
    ).bind(id, userId).first()

    if (!listing) return c.json({ error: 'Annonce introuvable ou non autorisé' }, 404)

    await c.env.DB.prepare("UPDATE listings SET status = 'archived' WHERE id = ?").bind(id).run()
    return c.json({ message: 'Annonce archivée' })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})
