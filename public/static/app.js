// ============================================================
//  PetitesAnnoncesIvoire.com — Frontend App
// ============================================================

const CATEGORIES = [
  { name: 'Véhicules',    icon: 'fa-car',            color: 'blue',   emoji: '🚗' },
  { name: 'Immobilier',   icon: 'fa-home',           color: 'green',  emoji: '🏠' },
  { name: 'Électronique', icon: 'fa-mobile-alt',     color: 'purple', emoji: '📱' },
  { name: 'Mode',         icon: 'fa-tshirt',         color: 'pink',   emoji: '👗' },
  { name: 'Maison',       icon: 'fa-couch',          color: 'yellow', emoji: '🛋️' },
  { name: 'Alimentation', icon: 'fa-drumstick-bite', color: 'orange', emoji: '🥘' },
  { name: 'Loisirs',      icon: 'fa-futbol',         color: 'red',    emoji: '⚽' },
  { name: 'Emploi',       icon: 'fa-briefcase',      color: 'indigo', emoji: '💼' },
  { name: 'Services',     icon: 'fa-tools',          color: 'teal',   emoji: '🔧' },
  { name: 'Agriculture',  icon: 'fa-seedling',       color: 'lime',   emoji: '🌿' },
  { name: 'Autres',       icon: 'fa-ellipsis-h',     color: 'gray',   emoji: '📦' },
]

// Villes populaires de Côte d'Ivoire
const CITIES = [
  { name: 'Abidjan',       icon: '🏙️' },
  { name: 'Bouaké',        icon: '🌆' },
  { name: 'Yamoussoukro',  icon: '🕌' },
  { name: 'San-Pédro',     icon: '⚓' },
  { name: 'Korhogo',       icon: '🌾' },
  { name: 'Daloa',         icon: '🌳' },
  { name: 'Man',           icon: '⛰️' },
  { name: 'Gagnoa',        icon: '🌿' },
  { name: 'Abengourou',    icon: '🌺' },
  { name: 'Grand-Bassam',  icon: '🏖️' },
]

const COLOR_MAP = {
  blue:   'bg-blue-100 text-blue-600',
  green:  'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  pink:   'bg-pink-100 text-pink-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  orange: 'bg-orange-100 text-orange-600',
  red:    'bg-red-100 text-red-600',
  indigo: 'bg-indigo-100 text-indigo-600',
  teal:   'bg-teal-100 text-teal-600',
  lime:   'bg-lime-100 text-lime-600',
  gray:   'bg-gray-100 text-gray-500',
}

const BADGE_COLOR = {
  blue:   'bg-blue-50 text-blue-700 border-blue-200',
  green:  'bg-green-50 text-green-700 border-green-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  pink:   'bg-pink-50 text-pink-700 border-pink-200',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  red:    'bg-red-50 text-red-700 border-red-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  teal:   'bg-teal-50 text-teal-700 border-teal-200',
  lime:   'bg-lime-50 text-lime-700 border-lime-200',
  gray:   'bg-gray-50 text-gray-500 border-gray-200',
}

// ── État global ──────────────────────────────────────────────
let currentUser = null
let authToken = null
let activeFilter = null
let pendingImageData = null   // base64 de l'image en attente

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
  buildCitiesGrid()
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
  if (page === 'new-listing') resetNewListingForm()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function updateNav() {
  const guestEl = document.getElementById('nav-guest')
  const authEl  = document.getElementById('nav-auth')
  const nameEl  = document.getElementById('nav-username')
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
  const icon  = document.getElementById('toast-icon')
  const msgEl = document.getElementById('toast-msg')
  icon.className = type === 'success'
    ? 'fas fa-check-circle text-green-400'
    : 'fas fa-exclamation-circle text-red-400'
  msgEl.textContent = msg
  toast.classList.remove('hidden')
  setTimeout(() => toast.classList.add('hidden'), 3200)
}

// ── Catégories ───────────────────────────────────────────────
function buildCategoriesGrid() {
  const grid = document.getElementById('categories-grid')
  grid.innerHTML = CATEGORIES.map(cat => {
    const colors = COLOR_MAP[cat.color]
    return `
      <button onclick="filterByCategory('${cat.name}')"
        class="flex flex-col items-center gap-1.5 p-3 bg-white rounded-xl border border-gray-200
               hover:border-primary-300 hover:shadow-sm transition cursor-pointer group">
        <div class="w-9 h-9 ${colors} rounded-xl flex items-center justify-center text-base group-hover:scale-110 transition">
          <i class="fas ${cat.icon}"></i>
        </div>
        <span class="text-xs font-medium text-gray-700 leading-tight text-center">${cat.name}</span>
      </button>`
  }).join('')
}

// ── Villes populaires ────────────────────────────────────────
function buildCitiesGrid() {
  const grid = document.getElementById('cities-grid')
  if (!grid) return
  grid.innerHTML = CITIES.map(city => `
    <button onclick="filterByCity('${city.name}')"
      class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full
             text-sm text-gray-600 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50
             transition cursor-pointer">
      <span>${city.icon}</span>
      <span class="font-medium">${city.name}</span>
    </button>`
  ).join('')
}

// ── Chargement des annonces ───────────────────────────────────
async function loadListings(search = '', category = '') {
  const grid = document.getElementById('listings-grid')
  grid.innerHTML = `<div class="col-span-full text-center text-gray-400 py-12">
    <i class="fas fa-spinner fa-spin text-3xl mb-3"></i><br/>Chargement des annonces...
  </div>`

  let url = '/api/listings?limit=50'
  if (search)   url += `&search=${encodeURIComponent(search)}`
  if (category) url += `&category=${encodeURIComponent(category)}`

  try {
    const res  = await fetch(url)
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
  const cat   = CATEGORIES.find(c => c.name === l.category)
  const badge = cat ? BADGE_COLOR[cat.color] : 'bg-gray-50 text-gray-500 border-gray-200'
  const icon  = cat ? cat.icon : 'fa-tag'
  const price = l.price != null
    ? `<span class="font-bold text-primary-600">${formatPrice(l.price)}</span>`
    : `<span class="text-gray-400 text-sm">Prix à débattre</span>`
  const date  = new Date(l.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  // Vignette : image réelle si disponible, sinon placeholder catégorie
  const thumbnail = l.has_image
    ? `<img src="/api/listings/${l.id}/image" alt="${escHtml(l.title)}"
            class="w-full h-full object-cover"
            onerror="this.parentElement.innerHTML='<i class=\\'fas ${icon} text-4xl text-gray-300\\'></i>'" />`
    : `<i class="fas ${icon} text-4xl text-gray-300 group-hover:text-gray-400 transition"></i>`

  return `
  <div onclick="showListing(${l.id})"
    class="bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition cursor-pointer overflow-hidden group">
    <div class="h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative overflow-hidden">
      ${thumbnail}
      <span class="absolute top-2 left-2 text-xs font-medium px-2 py-0.5 rounded-full border ${badge} bg-white/90 backdrop-blur-sm">
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

    const cat   = CATEGORIES.find(c => c.name === l.category)
    const badge = cat ? BADGE_COLOR[cat.color] : 'bg-gray-50 text-gray-500 border-gray-200'
    const icon  = cat ? cat.icon : 'fa-tag'
    const price = l.price != null
      ? `<span class="text-3xl font-bold text-primary-600">${formatPrice(l.price)}</span>`
      : `<span class="text-gray-400">Prix à débattre</span>`
    const date    = new Date(l.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    const isOwner = currentUser && l.user_id === currentUser.id

    // Image section
    const imageSection = l.image_data
      ? `<div class="relative overflow-hidden bg-gray-100" style="max-height:480px">
           <img src="${l.image_data}" alt="${escHtml(l.title)}"
                class="w-full object-contain max-h-96" />
         </div>`
      : `<div class="h-52 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
           <i class="fas ${icon} text-7xl text-gray-300"></i>
         </div>`

    content.innerHTML = `
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
        ${imageSection}
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

          <div class="text-gray-600 mb-6 bg-gray-50 rounded-xl p-4">
            <p class="whitespace-pre-wrap text-sm leading-relaxed">${escHtml(l.description)}</p>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-6">
            ${l.location ? `<div class="flex items-center gap-2 text-sm text-gray-600"><i class="fas fa-map-marker-alt text-primary-500 w-5"></i>${escHtml(l.location)}</div>` : ''}
            ${l.contact  ? `<div class="flex items-center gap-2 text-sm text-gray-600"><i class="fas fa-envelope text-primary-500 w-5"></i>${escHtml(l.contact)}</div>` : ''}
            <div class="flex items-center gap-2 text-sm text-gray-600"><i class="fas fa-user text-primary-500 w-5"></i>${escHtml(l.author_name)}</div>
            <div class="flex items-center gap-2 text-sm text-gray-600"><i class="fas fa-calendar text-primary-500 w-5"></i>${date}</div>
          </div>

          ${isOwner ? `
            <div class="flex gap-3 pt-4 border-t border-gray-100">
              <button onclick="deleteListing(${l.id})"
                class="flex-1 bg-red-50 text-red-600 hover:bg-red-100 py-2 rounded-xl font-medium text-sm transition">
                <i class="fas fa-trash mr-2"></i>Supprimer
              </button>
              <button onclick="archiveListing(${l.id})"
                class="flex-1 bg-gray-100 text-gray-600 hover:bg-gray-200 py-2 rounded-xl font-medium text-sm transition">
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

// ── Filtres & Recherche ───────────────────────────────────────
function filterByCategory(category) {
  activeFilter = category
  document.getElementById('listings-title').textContent = `Catégorie : ${category}`
  document.getElementById('btn-reset-filter').classList.remove('hidden')
  loadListings('', category)
  window.scrollTo({ top: 500, behavior: 'smooth' })
}

function filterByCity(city) {
  document.getElementById('listings-title').textContent = `Annonces à ${city}`
  document.getElementById('btn-reset-filter').classList.remove('hidden')
  loadListings(city, activeFilter || '')
  window.scrollTo({ top: 500, behavior: 'smooth' })
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

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.activeElement.id === 'search-input') searchListings()
})

// ── Auth ──────────────────────────────────────────────────────
async function handleRegister(e) {
  e.preventDefault()
  const errEl = document.getElementById('reg-error')
  errEl.classList.add('hidden')

  const name     = document.getElementById('reg-name').value.trim()
  const email    = document.getElementById('reg-email').value.trim()
  const password = document.getElementById('reg-password').value

  try {
    const res  = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    })
    const data = await res.json()
    if (!res.ok) { errEl.textContent = data.error; errEl.classList.remove('hidden'); return }

    authToken   = data.token
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

  const email    = document.getElementById('login-email').value.trim()
  const password = document.getElementById('login-password').value

  try {
    const res  = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()
    if (!res.ok) { errEl.textContent = data.error; errEl.classList.remove('hidden'); return }

    authToken   = data.token
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
  authToken   = null
  currentUser = null
  localStorage.removeItem('auth')
  updateNav()
  showPage('home')
  showToast('Déconnexion réussie')
}

// ── Gestion de l'image ────────────────────────────────────────
function resetNewListingForm() {
  pendingImageData = null
  const preview = document.getElementById('img-preview')
  const zone    = document.getElementById('img-upload-zone')
  if (preview) { preview.src = ''; preview.classList.add('hidden') }
  if (zone)    zone.classList.remove('hidden')
  const input = document.getElementById('nl-image')
  if (input) input.value = ''
  const infoEl = document.getElementById('img-info')
  if (infoEl) infoEl.textContent = ''
}

function handleImageSelect(input) {
  const file = input.files[0]
  if (!file) return

  // Vérif type
  if (!file.type.startsWith('image/')) {
    showToast('Veuillez sélectionner une image (JPG, PNG, WEBP)', 'error')
    input.value = ''
    return
  }

  // Vérif taille brute (max 5 Mo avant compression)
  if (file.size > 5 * 1024 * 1024) {
    showToast('Image trop grande. Maximum 5 Mo.', 'error')
    input.value = ''
    return
  }

  // Compression via Canvas
  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      // Redimensionner si > 1200px
      const MAX = 1200
      let w = img.width
      let h = img.height
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX }
        else       { w = Math.round(w * MAX / h); h = MAX }
      }

      const canvas  = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)

      // Compression JPEG qualité 0.82
      const compressed = canvas.toDataURL('image/jpeg', 0.82)
      pendingImageData = compressed

      // Afficher la preview
      const preview   = document.getElementById('img-preview')
      const zone      = document.getElementById('img-upload-zone')
      const removeBtn = document.getElementById('img-remove-btn')
      preview.src     = compressed
      preview.classList.remove('hidden')
      zone.classList.add('hidden')
      if (removeBtn) removeBtn.classList.remove('hidden')

      // Info taille
      const kb = Math.round(compressed.length * 0.75 / 1024)
      document.getElementById('img-info').textContent = `${w}×${h}px — ${kb} Ko`
    }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
}

function removeImage() {
  pendingImageData = null
  const preview   = document.getElementById('img-preview')
  const zone      = document.getElementById('img-upload-zone')
  const removeBtn = document.getElementById('img-remove-btn')
  preview.src     = ''
  preview.classList.add('hidden')
  zone.classList.remove('hidden')
  if (removeBtn) removeBtn.classList.add('hidden')
  document.getElementById('nl-image').value = ''
  document.getElementById('img-info').textContent = ''
}

// ── Nouvelle annonce ──────────────────────────────────────────
async function handleNewListing(e) {
  e.preventDefault()
  if (!authToken) { showPage('login'); return }

  const errEl = document.getElementById('nl-error')
  errEl.classList.add('hidden')

  const title       = document.getElementById('nl-title').value.trim()
  const category    = document.getElementById('nl-category').value
  const price       = document.getElementById('nl-price').value
  const description = document.getElementById('nl-description').value.trim()
  const location    = document.getElementById('nl-location').value.trim()
  const contact     = document.getElementById('nl-contact').value.trim()

  // Vérif taille image (max ~400Ko en base64 ≈ 550 000 chars)
  if (pendingImageData && pendingImageData.length > 550000) {
    errEl.textContent = 'Image trop volumineuse après compression. Essayez une image plus petite.'
    errEl.classList.remove('hidden')
    return
  }

  const submitBtn = e.target.querySelector('[type="submit"]')
  submitBtn.disabled = true
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Publication...'

  try {
    const res  = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({
        title, category,
        price:      price ? parseFloat(price) : null,
        description, location, contact,
        image_data: pendingImageData || null
      })
    })
    const data = await res.json()
    if (!res.ok) {
      errEl.textContent = data.error
      errEl.classList.remove('hidden')
      return
    }

    e.target.reset()
    resetNewListingForm()
    showToast('Annonce publiée avec succès ! 🎉')
    showPage('home')
    loadListings()
  } catch {
    errEl.textContent = 'Erreur serveur lors de la publication'
    errEl.classList.remove('hidden')
  } finally {
    submitBtn.disabled = false
    submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Publier l\'annonce'
  }
}

// ── Tableau de bord ───────────────────────────────────────────
async function loadDashboard() {
  if (!authToken) { showPage('login'); return }

  // Stats
  try {
    const res   = await fetch('/api/users/me/stats', { headers: { 'Authorization': `Bearer ${authToken}` } })
    const stats = await res.json()
    document.getElementById('user-stats').innerHTML = `
      <div class="bg-white rounded-xl border border-gray-200 p-5 text-center">
        <div class="text-3xl font-bold text-primary-600">${stats.active}</div>
        <div class="text-sm text-gray-500 mt-1"><i class="fas fa-check-circle text-green-500 mr-1"></i>Annonces actives</div>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-5 text-center">
        <div class="text-3xl font-bold text-gray-400">${stats.archived}</div>
        <div class="text-sm text-gray-500 mt-1"><i class="fas fa-archive text-gray-400 mr-1"></i>Archivées</div>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-5 text-center">
        <div class="text-3xl font-bold text-accent-500">${stats.total}</div>
        <div class="text-sm text-gray-500 mt-1"><i class="fas fa-list text-accent-500 mr-1"></i>Total publié</div>
      </div>`
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
      const cat    = CATEGORIES.find(c => c.name === l.category)
      const badge  = cat ? BADGE_COLOR[cat.color] : 'bg-gray-50 text-gray-500 border-gray-200'
      const status = l.status === 'active'
        ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>'
        : '<span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Archivée</span>'
      const date  = new Date(l.created_at).toLocaleDateString('fr-FR')
      const price = l.price != null ? formatPrice(l.price) : 'À débattre'

      return `
        <div class="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <!-- Thumbnail miniature -->
            <div class="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
              ${l.has_image
                ? `<img src="/api/listings/${l.id}/image" class="w-full h-full object-cover"
                       onerror="this.parentElement.innerHTML='<i class=\\'fas fa-image text-gray-300 text-xl\\'></i>'" />`
                : `<i class="fas ${cat ? cat.icon : 'fa-tag'} text-gray-300 text-xl"></i>`}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1 flex-wrap">
                <span class="text-xs font-medium px-2 py-0.5 rounded-full border ${badge}">${l.category}</span>
                ${status}
              </div>
              <h4 class="font-semibold text-gray-800 text-sm truncate">${escHtml(l.title)}</h4>
              <p class="text-xs text-gray-400 mt-0.5">${price} · ${date}</p>
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
      if (fromDashboard) loadDashboard()
      else { showPage('home'); loadListings() }
    } else showToast('Impossible de supprimer cette annonce', 'error')
  } catch { showToast('Erreur serveur', 'error') }
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
    } else showToast("Impossible d'archiver", 'error')
  } catch { showToast('Erreur serveur', 'error') }
}

// ── Utilitaires ───────────────────────────────────────────────
function formatPrice(p) {
  if (p === 0) return 'Gratuit'
  // FCFA — Franc CFA Afrique de l'Ouest
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    maximumFractionDigits: 0
  }).format(p) + ' FCFA'
}

function escHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
