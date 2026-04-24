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

// GET /api/listings — liste publique avec filtres avancés
listingsRoutes.get('/', async (c) => {
  try {
    const category   = c.req.query('category')
    const search     = c.req.query('search')
    const location   = c.req.query('location')
    const min_price  = c.req.query('min_price')
    const max_price  = c.req.query('max_price')
    const sort       = c.req.query('sort') || 'recent'
    const with_photo = c.req.query('with_photo')   // '1' = photo uniquement
    const limit      = parseInt(c.req.query('limit') || '50')
    const offset     = parseInt(c.req.query('offset') || '0')

    // Expirer les annonces automatiquement (60 jours)
    await c.env.DB.prepare(
      "UPDATE listings SET status='archived' WHERE status='active' AND expires_at IS NOT NULL AND expires_at < datetime('now')"
    ).run()

    let query = `
      SELECT l.id, l.title, l.description, l.category, l.price, l.location, l.contact,
             l.status, l.created_at, l.views_count, l.boosted_at, l.expires_at,
             u.name as author_name, u.id as user_id,
             CASE WHEN l.image_data IS NOT NULL AND l.image_data != '' THEN 1
                  WHEN EXISTS (SELECT 1 FROM listing_images li WHERE li.listing_id = l.id) THEN 1
                  ELSE 0 END as has_image,
             (SELECT COUNT(*) FROM listing_images li WHERE li.listing_id = l.id) as extra_images_count
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE l.status = 'active'
    `
    const params: any[] = []

    if (category)   { query += ' AND l.category = ?'; params.push(category) }
    if (location)   { query += ' AND l.location LIKE ?'; params.push(`%${location}%`) }
    if (search)     { query += ' AND (l.title LIKE ? OR l.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
    if (min_price)  { query += ' AND l.price >= ?'; params.push(parseFloat(min_price)) }
    if (max_price)  { query += ' AND l.price <= ?'; params.push(parseFloat(max_price)) }
    if (with_photo === '1') {
      query += ` AND (l.image_data IS NOT NULL AND l.image_data != '' OR EXISTS (SELECT 1 FROM listing_images li WHERE li.listing_id = l.id))`
    }

    // Tri : annonces boostées en tête, puis par critère
    if (sort === 'price_asc')   query += ' ORDER BY l.boosted_at DESC NULLS LAST, l.price ASC NULLS LAST'
    else if (sort === 'price_desc') query += ' ORDER BY l.boosted_at DESC NULLS LAST, l.price DESC NULLS LAST'
    else if (sort === 'popular') query += ' ORDER BY l.boosted_at DESC NULLS LAST, l.views_count DESC'
    else query += ' ORDER BY l.boosted_at DESC NULLS LAST, l.created_at DESC'

    query += ' LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const { results } = await c.env.DB.prepare(query).bind(...params).all()

    // Compter le total
    let countQuery = `SELECT COUNT(*) as total FROM listings l WHERE l.status = 'active'`
    const countParams: any[] = []
    if (category)  { countQuery += ' AND l.category = ?'; countParams.push(category) }
    if (location)  { countQuery += ' AND l.location LIKE ?'; countParams.push(`%${location}%`) }
    if (search)    { countQuery += ' AND (l.title LIKE ? OR l.description LIKE ?)'; countParams.push(`%${search}%`, `%${search}%`) }
    if (min_price) { countQuery += ' AND l.price >= ?'; countParams.push(parseFloat(min_price)) }
    if (max_price) { countQuery += ' AND l.price <= ?'; countParams.push(parseFloat(max_price)) }
    if (with_photo === '1') {
      countQuery += ` AND (l.image_data IS NOT NULL AND l.image_data != '' OR EXISTS (SELECT 1 FROM listing_images li WHERE li.listing_id = l.id))`
    }
    const countRow = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ total: number }>()

    return c.json({ listings: results, total: countRow?.total || results.length, offset, limit })
  } catch (err) {
    console.error('List listings error:', err)
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// GET /api/listings/:id — détail d'une annonce (incrémente les vues)
listingsRoutes.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))

    // Incrémenter le compteur de vues
    await c.env.DB.prepare(
      'UPDATE listings SET views_count = COALESCE(views_count, 0) + 1 WHERE id = ?'
    ).bind(id).run()

    const listing = await c.env.DB.prepare(`
      SELECT l.id, l.title, l.description, l.category, l.price, l.location, l.contact,
             l.status, l.created_at, l.user_id, l.image_data, l.views_count, l.boosted_at, l.expires_at,
             u.name as author_name, u.avatar as author_avatar
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = ? AND l.status = 'active'
    `).bind(id).first<any>()

    if (!listing) return c.json({ error: 'Annonce introuvable' }, 404)

    // Images supplémentaires
    const { results: extraImages } = await c.env.DB.prepare(
      'SELECT id, image_data, position FROM listing_images WHERE listing_id = ? ORDER BY position ASC'
    ).bind(id).all<{ id: number; image_data: string; position: number }>()

    const images: { id: string; data: string }[] = []
    if (listing.image_data) images.push({ id: 'main', data: listing.image_data })
    for (const img of extraImages) images.push({ id: String(img.id), data: img.image_data })

    // Note moyenne du vendeur
    const ratingRow = await c.env.DB.prepare(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as reviews_count FROM reviews WHERE seller_id = ?'
    ).bind(listing.user_id).first<{ avg_rating: number; reviews_count: number }>()

    return c.json({
      listing: {
        ...listing,
        images,
        seller_rating: ratingRow?.avg_rating ? Math.round(ratingRow.avg_rating * 10) / 10 : null,
        seller_reviews_count: ratingRow?.reviews_count || 0
      }
    })
  } catch (err) {
    console.error('Get listing error:', err)
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// GET /api/listings/:id/similar — annonces similaires
listingsRoutes.get('/:id/similar', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const listing = await c.env.DB.prepare(
      "SELECT category, price FROM listings WHERE id = ? AND status = 'active'"
    ).bind(id).first<{ category: string; price: number | null }>()

    if (!listing) return c.json({ listings: [] })

    const priceRange = listing.price
      ? [listing.price * 0.5, listing.price * 1.5]
      : [null, null]

    let query = `
      SELECT l.id, l.title, l.description, l.category, l.price, l.location,
             l.status, l.created_at, l.views_count,
             u.name as author_name,
             CASE WHEN l.image_data IS NOT NULL AND l.image_data != '' THEN 1
                  WHEN EXISTS (SELECT 1 FROM listing_images li WHERE li.listing_id = l.id) THEN 1
                  ELSE 0 END as has_image,
             (SELECT COUNT(*) FROM listing_images li WHERE li.listing_id = l.id) as extra_images_count
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE l.status = 'active' AND l.id != ? AND l.category = ?
    `
    const params: any[] = [id, listing.category]

    if (listing.price && priceRange[0] !== null) {
      query += ' AND l.price BETWEEN ? AND ?'
      params.push(priceRange[0], priceRange[1])
    }

    query += ' ORDER BY l.created_at DESC LIMIT 6'

    const { results } = await c.env.DB.prepare(query).bind(...params).all()
    return c.json({ listings: results })
  } catch (err) {
    return c.json({ listings: [] })
  }
})

// GET /api/listings/:id/image — image principale (pour les cartes)
listingsRoutes.get('/:id/image', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))

    const extraImg = await c.env.DB.prepare(
      'SELECT image_data FROM listing_images WHERE listing_id = ? ORDER BY position ASC LIMIT 1'
    ).bind(id).first<{ image_data: string | null }>()

    let imageData: string | null = null
    if (extraImg?.image_data) {
      imageData = extraImg.image_data
    } else {
      const row = await c.env.DB.prepare(
        "SELECT image_data FROM listings WHERE id = ?"
      ).bind(id).first<{ image_data: string | null }>()
      imageData = row?.image_data || null
    }

    if (!imageData) return c.json({ error: "Pas d'image" }, 404)

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

// GET /api/listings/:id/images/:imgId — image spécifique
listingsRoutes.get('/:id/images/:imgId', async (c) => {
  try {
    const listingId = parseInt(c.req.param('id'))
    const imgId = c.req.param('imgId')

    let imageData: string | null = null

    if (imgId === 'main') {
      const row = await c.env.DB.prepare(
        "SELECT image_data FROM listings WHERE id = ?"
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

// POST /api/listings — créer une annonce (authentifié)
listingsRoutes.post('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')

    // Rate limiting : max 10 annonces par heure
    const recentCount = await c.env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM rate_limits WHERE user_id = ? AND action = 'post_listing' AND created_at > datetime('now', '-1 hour')"
    ).bind(userId).first<{ cnt: number }>()

    if ((recentCount?.cnt || 0) >= 10) {
      return c.json({ error: 'Trop d\'annonces publiées récemment. Attendez une heure.' }, 429)
    }

    const { title, description, category, price, location, contact, images } = await c.req.json()

    if (!title || !description || !category) {
      return c.json({ error: 'Titre, description et catégorie sont obligatoires' }, 400)
    }

    const imageArray: string[] = Array.isArray(images) ? images.slice(0, 5) : []
    for (const img of imageArray) {
      if (img && img.length > 550000) {
        return c.json({ error: 'Une des images est trop grande (max 400 Ko).' }, 400)
      }
    }

    const mainImage = imageArray[0] || null
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()

    const result = await c.env.DB.prepare(`
      INSERT INTO listings (user_id, title, description, category, price, location, contact, image_data, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId, title.trim(), description.trim(), category,
      price ? parseFloat(price) : null,
      location?.trim() || null, contact?.trim() || null,
      mainImage, expiresAt
    ).run()

    const listingId = result.meta.last_row_id as number

    for (let i = 0; i < imageArray.length; i++) {
      if (imageArray[i]) {
        await c.env.DB.prepare(
          'INSERT INTO listing_images (listing_id, image_data, position) VALUES (?, ?, ?)'
        ).bind(listingId, imageArray[i], i).run()
      }
    }

    // Enregistrer pour rate limiting
    await c.env.DB.prepare(
      "INSERT INTO rate_limits (user_id, action) VALUES (?, 'post_listing')"
    ).bind(userId).run()

    return c.json({ id: listingId, message: 'Annonce publiée avec succès' }, 201)
  } catch (err) {
    console.error('Create listing error:', err)
    return c.json({ error: 'Erreur serveur lors de la publication' }, 500)
  }
})

// PUT /api/listings/:id/sold — marquer comme vendu
listingsRoutes.put('/:id/sold', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const id = parseInt(c.req.param('id'))

    const listing = await c.env.DB.prepare(
      'SELECT id, status FROM listings WHERE id = ? AND user_id = ?'
    ).bind(id, userId).first<{ id: number; status: string }>()

    if (!listing) return c.json({ error: 'Annonce introuvable ou non autorisé' }, 404)

    const newStatus = listing.status === 'sold' ? 'active' : 'sold'
    await c.env.DB.prepare("UPDATE listings SET status = ? WHERE id = ?").bind(newStatus, id).run()
    return c.json({ message: newStatus === 'sold' ? 'Marqué comme vendu' : 'Annonce réactivée', status: newStatus })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// PUT /api/listings/:id/boost — remonter une annonce (1 boost / 24h)
listingsRoutes.put('/:id/boost', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const id = parseInt(c.req.param('id'))

    const listing = await c.env.DB.prepare(
      "SELECT id, boosted_at FROM listings WHERE id = ? AND user_id = ? AND status = 'active'"
    ).bind(id, userId).first<{ id: number; boosted_at: string | null }>()

    if (!listing) return c.json({ error: 'Annonce introuvable ou non autorisé' }, 404)

    // Vérifier si un boost a été fait dans les 24h
    if (listing.boosted_at) {
      const lastBoost = new Date(listing.boosted_at).getTime()
      const hoursSince = (Date.now() - lastBoost) / (1000 * 60 * 60)
      if (hoursSince < 24) {
        const hoursLeft = Math.ceil(24 - hoursSince)
        return c.json({ error: `Vous pourrez remonter cette annonce dans ${hoursLeft}h` }, 429)
      }
    }

    // Aussi renouveler l'expiration de 60 jours
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
    await c.env.DB.prepare(
      "UPDATE listings SET boosted_at = datetime('now'), expires_at = ? WHERE id = ?"
    ).bind(expiresAt, id).run()

    return c.json({ message: 'Annonce remontée en tête de liste ! 🚀' })
  } catch (err) {
    return c.json({ error: 'Erreur serveur' }, 500)
  }
})

// DELETE /api/listings/:id — supprimer son annonce
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

// PUT /api/listings/:id — modifier son annonce
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

      await c.env.DB.prepare('DELETE FROM listing_images WHERE listing_id = ?').bind(id).run()

      for (let i = 0; i < imageArray.length; i++) {
        if (imageArray[i]) {
          await c.env.DB.prepare(
            'INSERT INTO listing_images (listing_id, image_data, position) VALUES (?, ?, ?)'
          ).bind(id, imageArray[i], i).run()
        }
      }
    } else {
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

// PUT /api/listings/:id/archive — archiver son annonce
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
