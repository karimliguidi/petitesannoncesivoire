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
             CASE WHEN l.image_data IS NOT NULL AND l.image_data != '' THEN 1
                  WHEN EXISTS (SELECT 1 FROM listing_images li WHERE li.listing_id = l.id) THEN 1
                  ELSE 0 END as has_image,
             (SELECT COUNT(*) FROM listing_images li WHERE li.listing_id = l.id) as extra_images_count
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

// GET /api/listings/:id — détail d'une annonce (avec toutes les images)
listingsRoutes.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const listing = await c.env.DB.prepare(`
      SELECT l.id, l.title, l.description, l.category, l.price, l.location, l.contact,
             l.status, l.created_at, l.user_id, l.image_data, u.name as author_name
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = ? AND l.status = 'active'
    `).bind(id).first<any>()

    if (!listing) return c.json({ error: 'Annonce introuvable' }, 404)

    // Récupérer les images supplémentaires depuis listing_images
    const { results: extraImages } = await c.env.DB.prepare(
      'SELECT id, image_data, position FROM listing_images WHERE listing_id = ? ORDER BY position ASC'
    ).bind(id).all<{ id: number; image_data: string; position: number }>()

    // Construire le tableau complet d'images (image principale + extras)
    const images: { id: string; data: string }[] = []
    if (listing.image_data) {
      images.push({ id: 'main', data: listing.image_data })
    }
    for (const img of extraImages) {
      images.push({ id: String(img.id), data: img.image_data })
    }

    return c.json({ listing: { ...listing, images } })
  } catch (err) {
    console.error('Get listing error:', err)
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// GET /api/listings/:id/image — renvoie l'image principale (pour les cartes)
listingsRoutes.get('/:id/image', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))

    // D'abord on cherche dans listing_images (position 0), sinon image_data principale
    const extraImg = await c.env.DB.prepare(
      'SELECT image_data FROM listing_images WHERE listing_id = ? ORDER BY position ASC LIMIT 1'
    ).bind(id).first<{ image_data: string | null }>()

    let imageData: string | null = null
    if (extraImg?.image_data) {
      imageData = extraImg.image_data
    } else {
      const row = await c.env.DB.prepare(
        "SELECT image_data FROM listings WHERE id = ? AND status = 'active'"
      ).bind(id).first<{ image_data: string | null }>()
      imageData = row?.image_data || null
    }

    if (!imageData) {
      return c.json({ error: "Pas d'image" }, 404)
    }

    // image_data est "data:image/jpeg;base64,..."
    const [meta, b64] = imageData.split(',')
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

// GET /api/listings/:id/images/:imgId — renvoie une image spécifique par son ID
listingsRoutes.get('/:id/images/:imgId', async (c) => {
  try {
    const listingId = parseInt(c.req.param('id'))
    const imgId = c.req.param('imgId')

    let imageData: string | null = null

    if (imgId === 'main') {
      const row = await c.env.DB.prepare(
        "SELECT image_data FROM listings WHERE id = ? AND status = 'active'"
      ).bind(listingId).first<{ image_data: string | null }>()
      imageData = row?.image_data || null
    } else {
      const row = await c.env.DB.prepare(
        'SELECT image_data FROM listing_images WHERE id = ? AND listing_id = ?'
      ).bind(parseInt(imgId), listingId).first<{ image_data: string | null }>()
      imageData = row?.image_data || null
    }

    if (!imageData) return c.json({ error: "Image introuvable" }, 404)

    const [meta, b64] = imageData.split(',')
    const mimeMatch = meta.match(/data:([^;]+)/)
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

    return new Response(bytes, {
      headers: { 'Content-Type': mime, 'Cache-Control': 'public, max-age=86400' }
    })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// POST /api/listings — créer une annonce (authentifié) avec jusqu'à 5 images
listingsRoutes.post('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const { title, description, category, price, location, contact, images } = await c.req.json()

    if (!title || !description || !category) {
      return c.json({ error: 'Titre, description et catégorie sont obligatoires' }, 400)
    }

    // images = tableau de data URLs (max 5)
    const imageArray: string[] = Array.isArray(images) ? images.slice(0, 5) : []

    // Validation de chaque image : max ~400KB
    for (const img of imageArray) {
      if (img && img.length > 550000) {
        return c.json({ error: 'Une des images est trop grande (max 400 Ko). Veuillez la compresser.' }, 400)
      }
    }

    const mainImage = imageArray[0] || null

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
      mainImage
    ).run()

    const listingId = result.meta.last_row_id as number

    // Insérer les images supplémentaires dans listing_images
    for (let i = 0; i < imageArray.length; i++) {
      if (imageArray[i]) {
        await c.env.DB.prepare(
          'INSERT INTO listing_images (listing_id, image_data, position) VALUES (?, ?, ?)'
        ).bind(listingId, imageArray[i], i).run()
      }
    }

    // Notifier tous les abonnés du vendeur
    try {
      const { results: followers } = await c.env.DB.prepare(
        'SELECT follower_id FROM followers WHERE followed_id = ?'
      ).bind(userId).all()

      if (followers.length > 0) {
        const seller = await c.env.DB.prepare(
          'SELECT name FROM users WHERE id = ?'
        ).bind(userId).first<{ name: string }>()

        for (const f of followers) {
          await c.env.DB.prepare(`
            INSERT INTO notifications (user_id, type, title, body, link)
            VALUES (?, 'new_listing', ?, ?, ?)
          `).bind(
            (f as any).follower_id,
            `🆕 ${seller?.name || 'Un vendeur'} a publié une annonce`,
            title,
            `/listing/${listingId}`
          ).run()
        }
      }
    } catch (notifErr) {
      // Ne pas bloquer la publication si les notifs échouent
      console.error('Notification followers error:', notifErr)
    }

    return c.json({ id: listingId, message: 'Annonce publiée avec succès' }, 201)
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

    // Les listing_images sont supprimées en cascade (ON DELETE CASCADE)
    await c.env.DB.prepare('DELETE FROM listings WHERE id = ?').bind(id).run()
    return c.json({ message: 'Annonce supprimée' })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// PUT /api/listings/:id — modifier son annonce (authentifié) avec jusqu'à 5 images
listingsRoutes.put('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const id = parseInt(c.req.param('id'))
    const { title, description, category, price, location, contact, images } = await c.req.json()

    if (!title || !description || !category) {
      return c.json({ error: 'Titre, description et catégorie sont obligatoires' }, 400)
    }

    const listing = await c.env.DB.prepare(
      'SELECT id FROM listings WHERE id = ? AND user_id = ?'
    ).bind(id, userId).first()
    if (!listing) return c.json({ error: 'Annonce introuvable ou non autorisé' }, 404)

    // images = undefined → on garde les anciennes
    // images = [] → on supprime toutes les images
    // images = ['data:...', ...] → on remplace
    if (images !== undefined) {
      const imageArray: string[] = Array.isArray(images) ? images.slice(0, 5) : []

      for (const img of imageArray) {
        if (img && img.length > 550000) {
          return c.json({ error: 'Une des images est trop grande (max 400 Ko)' }, 400)
        }
      }

      const mainImage = imageArray[0] || null

      await c.env.DB.prepare(`
        UPDATE listings SET title=?, description=?, category=?, price=?, location=?, contact=?, image_data=? WHERE id=?
      `).bind(title.trim(), description.trim(), category, price ? parseFloat(price) : null,
              location?.trim() || null, contact?.trim() || null, mainImage, id).run()

      // Supprimer les anciennes images supplémentaires et réinsérer
      await c.env.DB.prepare('DELETE FROM listing_images WHERE listing_id = ?').bind(id).run()

      for (let i = 0; i < imageArray.length; i++) {
        if (imageArray[i]) {
          await c.env.DB.prepare(
            'INSERT INTO listing_images (listing_id, image_data, position) VALUES (?, ?, ?)'
          ).bind(id, imageArray[i], i).run()
        }
      }
    } else {
      // Pas d'images envoyées → on garde tout, on modifie seulement les champs texte
      await c.env.DB.prepare(`
        UPDATE listings SET title=?, description=?, category=?, price=?, location=?, contact=? WHERE id=?
      `).bind(title.trim(), description.trim(), category, price ? parseFloat(price) : null,
              location?.trim() || null, contact?.trim() || null, id).run()
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
