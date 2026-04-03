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

// GET /api/listings — liste publique avec filtres avancés (sans image_data pour la perf)
listingsRoutes.get('/', async (c) => {
  try {
    const category  = c.req.query('category')
    const search    = c.req.query('search')
    const location  = c.req.query('location')
    const min_price = c.req.query('min_price')
    const max_price = c.req.query('max_price')
    const sort      = c.req.query('sort') || 'recent'   // recent | price_asc | price_desc
    const limit     = parseInt(c.req.query('limit') || '50')
    const offset    = parseInt(c.req.query('offset') || '0')

    let query = `
      SELECT l.id, l.title, l.description, l.category, l.price, l.location, l.contact,
             l.status, l.created_at, u.name as author_name,
             CASE WHEN l.image_data IS NOT NULL AND l.image_data != '' THEN 1 ELSE 0 END as has_image
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE l.status = 'active'
    `
    const params: any[] = []

    if (category) { query += ' AND l.category = ?'; params.push(category) }
    if (location) { query += ' AND l.location LIKE ?'; params.push(`%${location}%`) }
    if (search)   { query += ' AND (l.title LIKE ? OR l.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
    if (min_price) { query += ' AND l.price >= ?'; params.push(parseFloat(min_price)) }
    if (max_price) { query += ' AND l.price <= ?'; params.push(parseFloat(max_price)) }

    // Tri
    if (sort === 'price_asc')  query += ' ORDER BY l.price ASC NULLS LAST'
    else if (sort === 'price_desc') query += ' ORDER BY l.price DESC NULLS LAST'
    else query += ' ORDER BY l.created_at DESC'

    query += ' LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const { results } = await c.env.DB.prepare(query).bind(...params).all()

    // Compter le total (pour la pagination)
    let countQuery = `SELECT COUNT(*) as total FROM listings l WHERE l.status = 'active'`
    const countParams: any[] = []
    if (category)  { countQuery += ' AND l.category = ?';  countParams.push(category) }
    if (location)  { countQuery += ' AND l.location LIKE ?'; countParams.push(`%${location}%`) }
    if (search)    { countQuery += ' AND (l.title LIKE ? OR l.description LIKE ?)'; countParams.push(`%${search}%`, `%${search}%`) }
    if (min_price) { countQuery += ' AND l.price >= ?'; countParams.push(parseFloat(min_price)) }
    if (max_price) { countQuery += ' AND l.price <= ?'; countParams.push(parseFloat(max_price)) }
    const countRow = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ total: number }>()

    return c.json({ listings: results, total: countRow?.total || results.length, offset, limit })
  } catch (err) {
    console.error('List listings error:', err)
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// GET /api/listings/:id — détail d'une annonce (avec image_data)
listingsRoutes.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const listing = await c.env.DB.prepare(`
      SELECT l.id, l.title, l.description, l.category, l.price, l.location, l.contact,
             l.status, l.created_at, l.user_id, l.image_data, u.name as author_name
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

// GET /api/listings/:id/image — renvoie uniquement l'image (pour les cartes)
listingsRoutes.get('/:id/image', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const row = await c.env.DB.prepare(
      'SELECT image_data FROM listings WHERE id = ? AND status = \'active\''
    ).bind(id).first<{ image_data: string | null }>()

    if (!row || !row.image_data) {
      return c.json({ error: 'Pas d\'image' }, 404)
    }

    // image_data est "data:image/jpeg;base64,..."
    const [meta, b64] = row.image_data.split(',')
    const mimeMatch = meta.match(/data:([^;]+)/)
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

    return new Response(bytes, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=86400'
      }
    })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// POST /api/listings — créer une annonce (authentifié)
listingsRoutes.post('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const { title, description, category, price, location, contact, image_data } = await c.req.json()

    if (!title || !description || !category) {
      return c.json({ error: 'Titre, description et catégorie sont obligatoires' }, 400)
    }

    // Validation image : max ~400KB en base64
    if (image_data && image_data.length > 550000) {
      return c.json({ error: 'Image trop grande (max 400 Ko). Veuillez la compresser.' }, 400)
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO listings (user_id, title, description, category, price, location, contact, image_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      title.trim(),
      description.trim(),
      category,
      price ? parseFloat(price) : null,
      location?.trim() || null,
      contact?.trim() || null,
      image_data || null
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

// PUT /api/listings/:id — modifier son annonce (authentifié)
listingsRoutes.put('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const id = parseInt(c.req.param('id'))
    const { title, description, category, price, location, contact, image_data } = await c.req.json()

    if (!title || !description || !category) {
      return c.json({ error: 'Titre, description et catégorie sont obligatoires' }, 400)
    }
    if (image_data && image_data.length > 550000) {
      return c.json({ error: 'Image trop grande (max 400 Ko)' }, 400)
    }

    const listing = await c.env.DB.prepare(
      'SELECT id FROM listings WHERE id = ? AND user_id = ?'
    ).bind(id, userId).first()
    if (!listing) return c.json({ error: 'Annonce introuvable ou non autorisé' }, 404)

    // Si image_data est null on garde l'ancienne, si c'est une string vide on supprime
    if (image_data === undefined) {
      await c.env.DB.prepare(`
        UPDATE listings SET title=?, description=?, category=?, price=?, location=?, contact=? WHERE id=?
      `).bind(title.trim(), description.trim(), category, price ? parseFloat(price) : null,
              location?.trim() || null, contact?.trim() || null, id).run()
    } else {
      await c.env.DB.prepare(`
        UPDATE listings SET title=?, description=?, category=?, price=?, location=?, contact=?, image_data=? WHERE id=?
      `).bind(title.trim(), description.trim(), category, price ? parseFloat(price) : null,
              location?.trim() || null, contact?.trim() || null, image_data || null, id).run()
    }

    return c.json({ message: 'Annonce mise à jour avec succès' })
  } catch (err) {
    console.error('Update listing error:', err)
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
