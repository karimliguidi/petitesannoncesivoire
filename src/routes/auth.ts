import { Hono } from 'hono'
import type { Bindings } from '../index'

// Utilitaire hash de mot de passe via Web Crypto (compatible Cloudflare Workers)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Générer un JWT simple (HMAC-SHA256)
async function createToken(payload: object, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  const data = `${header}.${body}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return `${data}.${sigB64}`
}

export async function verifyToken(token: string, secret: string): Promise<any> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('Invalid token')
    const [header, body, sig] = parts
    const data = `${header}.${body}`
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    const sigBuf = Uint8Array.from(atob(sig.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, sigBuf, new TextEncoder().encode(data))
    if (!valid) throw new Error('Invalid signature')
    return JSON.parse(atob(body))
  } catch {
    return null
  }
}

export const authRoutes = new Hono<{ Bindings: Bindings }>()

// POST /api/auth/register
authRoutes.post('/register', async (c) => {
  try {
    const { name, email, password } = await c.req.json()

    if (!name || !email || !password) {
      return c.json({ error: 'Tous les champs sont obligatoires' }, 400)
    }
    if (password.length < 6) {
      return c.json({ error: 'Le mot de passe doit contenir au moins 6 caractères' }, 400)
    }

    // Vérifier si l'email existe déjà
    const existing = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email.toLowerCase()).first()

    if (existing) {
      return c.json({ error: 'Cet email est déjà utilisé' }, 409)
    }

    const passwordHash = await hashPassword(password)

    const result = await c.env.DB.prepare(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
    ).bind(name.trim(), email.toLowerCase(), passwordHash).run()

    const userId = result.meta.last_row_id
    const secret = c.env.JWT_SECRET || 'default-secret-change-in-prod'
    const token = await createToken(
      { sub: userId, email: email.toLowerCase(), name: name.trim(), exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600 },
      secret
    )

    return c.json({ token, user: { id: userId, name: name.trim(), email: email.toLowerCase(), is_admin: false } }, 201)
  } catch (err: any) {
    console.error('Register error:', err)
    return c.json({ error: 'Erreur serveur lors de l\'inscription' }, 500)
  }
})

// POST /api/auth/login
authRoutes.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json()

    if (!email || !password) {
      return c.json({ error: 'Email et mot de passe requis' }, 400)
    }

    const user = await c.env.DB.prepare(
      'SELECT id, name, email, password_hash, is_admin FROM users WHERE email = ?'
    ).bind(email.toLowerCase()).first<{ id: number; name: string; email: string; password_hash: string; is_admin: number }>()

    if (!user) {
      return c.json({ error: 'Email ou mot de passe incorrect' }, 401)
    }

    const passwordHash = await hashPassword(password)
    if (passwordHash !== user.password_hash) {
      return c.json({ error: 'Email ou mot de passe incorrect' }, 401)
    }

    const secret = c.env.JWT_SECRET || 'default-secret-change-in-prod'
    const token = await createToken(
      { sub: user.id, email: user.email, name: user.name, exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600 },
      secret
    )

    return c.json({ token, user: { id: user.id, name: user.name, email: user.email, is_admin: user.is_admin === 1 } })
  } catch (err: any) {
    console.error('Login error:', err)
    return c.json({ error: 'Erreur serveur lors de la connexion' }, 500)
  }
})
