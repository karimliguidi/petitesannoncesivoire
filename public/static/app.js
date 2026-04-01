// ============================================================
//  PetitesAnnonces.fr — Frontend App
// ============================================================

const CATEGORIES = [
  { name: 'Véhicules',    icon: 'fa-car',          color: 'blue' },
  { name: 'Immobilier',   icon: 'fa-home',         color: 'green' },
  { name: 'Électronique', icon: 'fa-mobile-alt',   color: 'purple' },
  { name: 'Mode',         icon: 'fa-tshirt',        color: 'pink' },
  { name: 'Maison',       icon: 'fa-couch',         color: 'yellow' },
  { name: 'Loisirs',      icon: 'fa-futbol',        color: 'red' },
  { name: 'Emploi',       icon: 'fa-briefcase',     color: 'indigo' },
  { name: 'Services',     icon: 'fa-concierge-bell',color: 'teal' },
  { name: 'Autres',       icon: 'fa-ellipsis-h',    color: 'gray' },
]

const COLOR_MAP = {
  blue:   'bg-blue-100 text-blue-600',
  green:  'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  pink:   'bg-pink-100 text-pink-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  red:    'bg-red-100 text-red-600',
  indigo: 'bg-indigo-100 text-indigo-600',
  teal:   'bg-teal-100 text-teal-600',
  gray:   'bg-gray-100 text-gray-500',
}

const BADGE_COLOR = {
  blue:   'bg-blue-50 text-blue-700 border-blue-200',
  green:  'bg-green-50 text-green-700 border-green-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  pink:   'bg-pink-50 text-pink-700 border-pink-200',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  red:    'bg-red-50 text-red-700 border-red-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  teal:   'bg-teal-50 text-teal-700 border-teal-200',
  gray:   'bg-gray-50 text-gray-500 border-gray-200',
}

// ── État global ──────────────────────────────────────────────
let currentUser = null
let authToken = null
let activeFilter = null

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('auth')
  if (saved) {
    try {
      const data = JSON.parse(saved)
      authToken = data.token
      currentUser = data.user
      updateNav()
    } catch {}
  }
  buildCategoriesGrid()
  loadListings()
})

// ── Navigation ───────────────────────────────────────────────
function showPage(page) {
  const pages = ['home', 'register', 'login', 'dashboard', 'new-listing', 'listing-detail']
  pages.forEach(p => {
    const el = document.getElementById(`page-${p}`)
    if (el) el.classList.toggle('hidden', p !== page)
  })
  if (page === 'dashboard') loadDashboard()
  if (page === 'home') loadListings()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function updateNav() {
  const guestEl = document.getElementById('nav-guest')
  const authEl = document.getElementById('nav-auth')
  const nameEl = document.getElementById('nav-username')
  if (currentUser) {
    guestEl.classList.add('hidden')
    authEl.classList.remove('hidden')
    nameEl.textContent = currentUser.name.split(' ')[0]
  } else {
    guestEl.classList.remove('hidden')
    authEl.classList.add('hidden')
  }
}

// ── Toast ────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast')
  const icon = document.getElementById('toast-icon')
  const msgEl = document.getElementById('toast-msg')
  icon.className = type === 'success'
    ? 'fas fa-check-circle text-green-400'
    : 'fas fa-exclamation-circle text-red-400'
  msgEl.textContent = msg
  toast.classList.remove('hidden')
  setTimeout(() => toast.classList.add('hidden'), 3000)
}

// ── Catégories ───────────────────────────────────────────────
function buildCategoriesGrid() {
  const grid = document.getElementById('categories-grid')
  grid.innerHTML = CATEGORIES.map(cat => {
    const colors = COLOR_MAP[cat.color]
    return `
      <button onclick="filterByCategory('${cat.name}')"
        class="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-200
               hover:border-primary-300 hover:shadow-sm transition cursor-pointer group">
        <div class="w-10 h-10 ${colors} rounded-xl flex items-center justify-center text-lg group-hover:scale-110 transition">
          <i class="fas ${cat.icon}"></i>
        </div>
        <span class="text-xs font-medium text-gray-700">${cat.name}</span>
      </button>
    `
  }).join('')
}

// ── Chargement des annonces ───────────────────────────────────
async function loadListings(search = '', category = '') {
  const grid = document.getElementById('listings-grid')
  grid.innerHTML = `<div class="col-span-full text-center text-gray-400 py-12">
    <i class="fas fa-spinner fa-spin text-3xl mb-3"></i><br/>Chargement des annonces...
  </div>`

  let url = '/api/listings?limit=50'
  if (search) url += `&search=${encodeURIComponent(search)}`
  if (category) url += `&category=${encodeURIComponent(category)}`

  try {
    const res = await fetch(url)
    const data = await res.json()
    renderListings(data.listings || [])
  } catch {
    grid.innerHTML = `<div class="col-span-full text-center text-red-400 py-12">
      <i class="fas fa-exclamation-triangle text-3xl mb-3"></i><br/>Impossible de charger les annonces
    </div>`
  }
}

function renderListings(listings) {
  const grid = document.getElementById('listings-grid')
  if (!listings.length) {
    grid.innerHTML = `<div class="col-span-full text-center text-gray-400 py-16">
      <i class="fas fa-search text-4xl mb-4 opacity-50"></i>
      <p class="text-lg font-medium">Aucune annonce trouvée</p>
      <p class="text-sm mt-1">Essayez avec d'autres termes ou catégories</p>
    </div>`
    return
  }
  grid.innerHTML = listings.map(l => listingCard(l)).join('')
}

function listingCard(l) {
  const cat = CATEGORIES.find(c => c.name === l.category)
  const badge = cat ? BADGE_COLOR[cat.color] : 'bg-gray-50 text-gray-500 border-gray-200'
  const icon = cat ? cat.icon : 'fa-tag'
  const price = l.price != null ? `<span class="font-bold text-primary-600">${formatPrice(l.price)}</span>` : `<span class="text-gray-400 text-sm">Prix à débattre</span>`
  const date = new Date(l.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  return `
  <div onclick="showListing(${l.id})"
    class="bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition cursor-pointer overflow-hidden group">
    <!-- Placeholder image / categorie -->
    <div class="h-36 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
      <i class="fas ${icon} text-4xl text-gray-300 group-hover:text-gray-400 transition"></i>
      <span class="absolute top-2 left-2 text-xs font-medium px-2 py-0.5 rounded-full border ${badge}">
        ${l.category}
      </span>
    </div>
    <div class="p-3">
      <h3 class="font-semibold text-gray-800 text-sm truncate mb-1">${escHtml(l.title)}</h3>
      <p class="text-xs text-gray-500 line-clamp-2 mb-2">${escHtml(l.description)}</p>
      <div class="flex items-center justify-between">
        ${price}
        <div class="flex items-center gap-1 text-xs text-gray-400">
          ${l.location ? `<i class="fas fa-map-marker-alt"></i><span>${escHtml(l.location)}</span>` : ''}
        </div>
      </div>
      <div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <span class="text-xs text-gray-400"><i class="fas fa-user mr-1"></i>${escHtml(l.author_name)}</span>
        <span class="text-xs text-gray-400">${date}</span>
      </div>
    </div>
  </div>`
}

// ── Détail d'une annonce ──────────────────────────────────────
async function showListing(id) {
  showPage('listing-detail')
  const content = document.getElementById('listing-detail-content')
  content.innerHTML = `<div class="text-center py-16 text-gray-400">
    <i class="fas fa-spinner fa-spin text-3xl"></i>
  </div>`

  try {
    const res = await fetch(`/api/listings/${id}`)
    if (!res.ok) throw new Error()
    const { listing: l } = await res.json()

    const cat = CATEGORIES.find(c => c.name === l.category)
    const badge = cat ? BADGE_COLOR[cat.color] : 'bg-gray-50 text-gray-500 border-gray-200'
    const icon = cat ? cat.icon : 'fa-tag'
    const price = l.price != null ? `<span class="text-3xl font-bold text-primary-600">${formatPrice(l.price)}</span>` : `<span class="text-gray-400">Prix à débattre</span>`
    const date = new Date(l.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    const isOwner = currentUser && l.user_id === currentUser.id

    content.innerHTML = `
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div class="h-56 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <i class="fas ${icon} text-7xl text-gray-300"></i>
        </div>
        <div class="p-6">
          <div class="flex items-start justify-between gap-4 mb-4">
            <div>
              <span class="text-xs font-medium px-3 py-1 rounded-full border ${badge} mb-2 inline-block">
                <i class="fas ${icon} mr-1"></i>${l.category}
              </span>
              <h1 class="text-2xl font-bold text-gray-800">${escHtml(l.title)}</h1>
            </div>
            ${price}
          </div>

          <div class="prose prose-sm max-w-none text-gray-600 mb-6 bg-gray-50 rounded-xl p-4">
            <p class="whitespace-pre-wrap">${escHtml(l.description)}</p>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-6">
            ${l.location ? `<div class="flex items-center gap-2 text-sm text-gray-600"><i class="fas fa-map-marker-alt text-primary-500 w-5"></i>${escHtml(l.location)}</div>` : ''}
            ${l.contact ? `<div class="flex items-center gap-2 text-sm text-gray-600"><i class="fas fa-envelope text-primary-500 w-5"></i>${escHtml(l.contact)}</div>` : ''}
            <div class="flex items-center gap-2 text-sm text-gray-600"><i class="fas fa-user text-primary-500 w-5"></i>${escHtml(l.author_name)}</div>
            <div class="flex items-center gap-2 text-sm text-gray-600"><i class="fas fa-calendar text-primary-500 w-5"></i>${date}</div>
          </div>

          ${isOwner ? `
            <div class="flex gap-3 pt-4 border-t border-gray-100">
              <button onclick="deleteListing(${l.id})" class="flex-1 bg-red-50 text-red-600 hover:bg-red-100 py-2 rounded-xl font-medium text-sm transition">
                <i class="fas fa-trash mr-2"></i>Supprimer l'annonce
              </button>
              <button onclick="archiveListing(${l.id})" class="flex-1 bg-gray-100 text-gray-600 hover:bg-gray-200 py-2 rounded-xl font-medium text-sm transition">
                <i class="fas fa-archive mr-2"></i>Archiver
              </button>
            </div>` : ''}
        </div>
      </div>`
  } catch {
    content.innerHTML = `<div class="text-center py-16 text-red-400">
      <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
      <p>Annonce introuvable</p>
    </div>`
  }
}

// ── Filtres ───────────────────────────────────────────────────
function filterByCategory(category) {
  activeFilter = category
  document.getElementById('listings-title').textContent = `Annonces : ${category}`
  document.getElementById('btn-reset-filter').classList.remove('hidden')
  loadListings('', category)
  window.scrollTo({ top: 400, behavior: 'smooth' })
}

function resetFilter() {
  activeFilter = null
  document.getElementById('listings-title').textContent = 'Toutes les annonces'
  document.getElementById('btn-reset-filter').classList.add('hidden')
  loadListings()
}

function searchListings() {
  const q = document.getElementById('search-input').value.trim()
  if (!q) return
  document.getElementById('listings-title').textContent = `Résultats pour "${q}"`
  document.getElementById('btn-reset-filter').classList.remove('hidden')
  loadListings(q, activeFilter || '')
  window.scrollTo({ top: 400, behavior: 'smooth' })
}

// Recherche sur Entrée
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.activeElement.id === 'search-input') {
    searchListings()
  }
})

// ── Auth ──────────────────────────────────────────────────────
async function handleRegister(e) {
  e.preventDefault()
  const errEl = document.getElementById('reg-error')
  errEl.classList.add('hidden')

  const name = document.getElementById('reg-name').value.trim()
  const email = document.getElementById('reg-email').value.trim()
  const password = document.getElementById('reg-password').value

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    })
    const data = await res.json()
    if (!res.ok) { errEl.textContent = data.error; errEl.classList.remove('hidden'); return }

    authToken = data.token
    currentUser = data.user
    localStorage.setItem('auth', JSON.stringify({ token: authToken, user: currentUser }))
    updateNav()
    showToast(`Bienvenue ${data.user.name} ! 🎉`)
    showPage('home')
  } catch {
    errEl.textContent = 'Erreur de connexion au serveur'
    errEl.classList.remove('hidden')
  }
}

async function handleLogin(e) {
  e.preventDefault()
  const errEl = document.getElementById('login-error')
  errEl.classList.add('hidden')

  const email = document.getElementById('login-email').value.trim()
  const password = document.getElementById('login-password').value

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()
    if (!res.ok) { errEl.textContent = data.error; errEl.classList.remove('hidden'); return }

    authToken = data.token
    currentUser = data.user
    localStorage.setItem('auth', JSON.stringify({ token: authToken, user: currentUser }))
    updateNav()
    showToast(`Bon retour ${data.user.name} !`)
    showPage('home')
  } catch {
    errEl.textContent = 'Erreur de connexion au serveur'
    errEl.classList.remove('hidden')
  }
}

function logout() {
  authToken = null
  currentUser = null
  localStorage.removeItem('auth')
  updateNav()
  showPage('home')
  showToast('Déconnexion réussie', 'success')
}

// ── Nouvelle annonce ──────────────────────────────────────────
async function handleNewListing(e) {
  e.preventDefault()
  if (!authToken) { showPage('login'); return }

  const errEl = document.getElementById('nl-error')
  errEl.classList.add('hidden')

  const title = document.getElementById('nl-title').value.trim()
  const category = document.getElementById('nl-category').value
  const price = document.getElementById('nl-price').value
  const description = document.getElementById('nl-description').value.trim()
  const location = document.getElementById('nl-location').value.trim()
  const contact = document.getElementById('nl-contact').value.trim()

  try {
    const res = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ title, category, price: price ? parseFloat(price) : null, description, location, contact })
    })
    const data = await res.json()
    if (!res.ok) { errEl.textContent = data.error; errEl.classList.remove('hidden'); return }

    // Reset form
    e.target.reset()
    showToast('Annonce publiée avec succès ! 🎉')
    showPage('home')
    loadListings()
  } catch {
    errEl.textContent = 'Erreur serveur lors de la publication'
    errEl.classList.remove('hidden')
  }
}

// ── Tableau de bord ───────────────────────────────────────────
async function loadDashboard() {
  if (!authToken) { showPage('login'); return }

  // Stats
  try {
    const res = await fetch('/api/users/me/stats', { headers: { 'Authorization': `Bearer ${authToken}` } })
    const stats = await res.json()
    document.getElementById('user-stats').innerHTML = `
      <div class="bg-white rounded-xl border border-gray-200 p-5 text-center">
        <div class="text-3xl font-bold text-primary-600">${stats.active}</div>
        <div class="text-sm text-gray-500 mt-1"><i class="fas fa-check-circle text-green-500 mr-1"></i>Annonces actives</div>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-5 text-center">
        <div class="text-3xl font-bold text-gray-400">${stats.archived}</div>
        <div class="text-sm text-gray-500 mt-1"><i class="fas fa-archive text-gray-400 mr-1"></i>Annonces archivées</div>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-5 text-center">
        <div class="text-3xl font-bold text-accent-500">${stats.total}</div>
        <div class="text-sm text-gray-500 mt-1"><i class="fas fa-list text-accent-500 mr-1"></i>Total publié</div>
      </div>
    `
  } catch {}

  // Mes annonces
  try {
    const res = await fetch('/api/users/me/listings', { headers: { 'Authorization': `Bearer ${authToken}` } })
    const { listings } = await res.json()
    const container = document.getElementById('user-listings')

    if (!listings.length) {
      container.innerHTML = `<div class="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
        <i class="fas fa-clipboard-list text-4xl mb-4 opacity-40"></i>
        <p class="font-medium">Vous n'avez pas encore publié d'annonce</p>
        <button onclick="showPage('new-listing')" class="mt-4 bg-primary-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-primary-700 transition">
          Publier ma première annonce
        </button>
      </div>`
      return
    }

    container.innerHTML = listings.map(l => {
      const cat = CATEGORIES.find(c => c.name === l.category)
      const badge = cat ? BADGE_COLOR[cat.color] : 'bg-gray-50 text-gray-500 border-gray-200'
      const status = l.status === 'active'
        ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>'
        : '<span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Archivée</span>'
      const date = new Date(l.created_at).toLocaleDateString('fr-FR')
      const price = l.price != null ? formatPrice(l.price) : 'À débattre'

      return `
        <div class="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div class="flex items-center gap-4 flex-1 min-w-0">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-medium px-2 py-0.5 rounded-full border ${badge}">${l.category}</span>
                ${status}
              </div>
              <h4 class="font-semibold text-gray-800 text-sm truncate">${escHtml(l.title)}</h4>
              <p class="text-xs text-gray-400 mt-0.5">${price} • ${date}</p>
            </div>
          </div>
          <div class="flex gap-2 shrink-0">
            <button onclick="showListing(${l.id})" class="text-xs text-primary-600 hover:text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-50 transition">
              <i class="fas fa-eye mr-1"></i>Voir
            </button>
            <button onclick="deleteListing(${l.id}, true)" class="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition">
              <i class="fas fa-trash mr-1"></i>Supprimer
            </button>
          </div>
        </div>`
    }).join('')
  } catch {}
}

// ── Actions sur les annonces ──────────────────────────────────
async function deleteListing(id, fromDashboard = false) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) return
  try {
    const res = await fetch(`/api/listings/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
    if (res.ok) {
      showToast('Annonce supprimée')
      if (fromDashboard) { loadDashboard() }
      else { showPage('home'); loadListings() }
    } else {
      showToast('Impossible de supprimer cette annonce', 'error')
    }
  } catch {
    showToast('Erreur serveur', 'error')
  }
}

async function archiveListing(id) {
  try {
    const res = await fetch(`/api/listings/${id}/archive`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
    if (res.ok) {
      showToast('Annonce archivée')
      showPage('home')
      loadListings()
    } else {
      showToast('Impossible d\'archiver', 'error')
    }
  } catch {
    showToast('Erreur serveur', 'error')
  }
}

// ── Utilitaires ───────────────────────────────────────────────
function formatPrice(p) {
  if (p === 0) return 'Gratuit'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p)
}

function escHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
