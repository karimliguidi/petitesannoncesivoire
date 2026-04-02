// ============================================================
//  PetitesAnnoncesIvoire.com — Frontend App v2
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

const CITIES = [
  { name: 'Abidjan', icon: '🏙️' },
  { name: 'Bouaké', icon: '🌆' },
  { name: 'Yamoussoukro', icon: '🕌' },
  { name: 'San-Pédro', icon: '⚓' },
  { name: 'Korhogo', icon: '🌾' },
  { name: 'Daloa', icon: '🌳' },
  { name: 'Man', icon: '⛰️' },
  { name: 'Gagnoa', icon: '🌿' },
  { name: 'Abengourou', icon: '🌺' },
  { name: 'Grand-Bassam', icon: '🏖️' },
]

const COLOR_MAP = {
  blue: 'bg-blue-100 text-blue-600', green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600', pink: 'bg-pink-100 text-pink-600',
  yellow: 'bg-yellow-100 text-yellow-600', orange: 'bg-orange-100 text-orange-600',
  red: 'bg-red-100 text-red-600', indigo: 'bg-indigo-100 text-indigo-600',
  teal: 'bg-teal-100 text-teal-600', lime: 'bg-lime-100 text-lime-600',
  gray: 'bg-gray-100 text-gray-500',
}
const BADGE_COLOR = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200', green: 'bg-green-50 text-green-700 border-green-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200', pink: 'bg-pink-50 text-pink-700 border-pink-200',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200', orange: 'bg-orange-50 text-orange-700 border-orange-200',
  red: 'bg-red-50 text-red-700 border-red-200', indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  teal: 'bg-teal-50 text-teal-700 border-teal-200', lime: 'bg-lime-50 text-lime-700 border-lime-200',
  gray: 'bg-gray-50 text-gray-500 border-gray-200',
}

// ── État global ──────────────────────────────────────────────
let currentUser   = null
let authToken     = null
let activeFilter  = null
let pendingImageData = null
let pendingAvatarData = null
let currentPage   = 0
const PAGE_SIZE   = 20
let totalListings = 0
let currentChatListingId = null
let currentChatOtherUserId = null
let currentModalListingId = null
let favoriteIds   = new Set()

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('auth')
  if (saved) {
    try {
      const d = JSON.parse(saved)
      authToken = d.token; currentUser = d.user
      updateNav()
      loadBadges()
      loadFavoriteIds()
    } catch {}
  }
  buildCategoriesGrid()
  buildCitiesGrid()
  loadListings()

  // Fermer le menu profil au clic extérieur
  document.addEventListener('click', e => {
    const menu = document.getElementById('profile-menu')
    const btn  = e.target.closest('[onclick="toggleProfileMenu()"]')
    if (!btn && menu && !menu.contains(e.target)) menu.classList.add('hidden')
  })
})

// ── Navigation ───────────────────────────────────────────────
const ALL_PAGES = ['home','register','login','dashboard','new-listing','listing-detail',
                   'messages','favorites','notifications','profile-edit','admin','public-profile']

function showPage(page) {
  ALL_PAGES.forEach(p => {
    const el = document.getElementById(`page-${p}`)
    if (el) el.classList.toggle('hidden', p !== page)
  })
  if (page === 'dashboard')       loadDashboard()
  if (page === 'home')            { loadListings(); loadBadges() }
  if (page === 'new-listing')     resetNewListingForm()
  if (page === 'messages')        loadInbox()
  if (page === 'favorites')       loadFavorites()
  if (page === 'notifications')   loadNotifications()
  if (page === 'profile-edit')    loadProfileEdit()
  if (page === 'admin')           { loadAdminStats(); adminTab('stats') }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function updateNav() {
  const guestEl  = document.getElementById('nav-guest')
  const authEl   = document.getElementById('nav-auth')
  const nameEl   = document.getElementById('nav-username')
  const avatarEl = document.getElementById('nav-avatar')
  if (currentUser) {
    guestEl.classList.add('hidden')
    authEl.classList.remove('hidden')
    nameEl.textContent = currentUser.name.split(' ')[0]
    if (currentUser.avatar) {
      avatarEl.innerHTML = `<img src="${currentUser.avatar}" class="w-full h-full object-cover" />`
    }
    // Afficher lien admin si admin
    const adminLink = document.getElementById('nav-admin-link')
    if (adminLink) adminLink.classList.toggle('hidden', !currentUser.is_admin)
  } else {
    guestEl.classList.remove('hidden')
    authEl.classList.add('hidden')
  }
}

function toggleProfileMenu() {
  document.getElementById('profile-menu').classList.toggle('hidden')
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast')
  document.getElementById('toast-icon').className = type === 'success'
    ? 'fas fa-check-circle text-green-400' : 'fas fa-exclamation-circle text-red-400'
  document.getElementById('toast-msg').textContent = msg
  toast.classList.remove('hidden')
  setTimeout(() => toast.classList.add('hidden'), 3200)
}

// ── Grilles catégories & villes ──────────────────────────────
function buildCategoriesGrid() {
  document.getElementById('categories-grid').innerHTML = CATEGORIES.map(cat => `
    <button onclick="filterByCategory('${cat.name}')"
      class="flex flex-col items-center gap-1 p-2.5 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-sm transition cursor-pointer group">
      <div class="w-8 h-8 ${COLOR_MAP[cat.color]} rounded-xl flex items-center justify-center text-sm group-hover:scale-110 transition">
        <i class="fas ${cat.icon}"></i>
      </div>
      <span class="text-xs font-medium text-gray-700 leading-tight text-center hidden sm:block">${cat.name}</span>
    </button>`).join('')
}

function buildCitiesGrid() {
  const grid = document.getElementById('cities-grid')
  if (!grid) return
  grid.innerHTML = CITIES.map(c => `
    <button onclick="filterByCity('${c.name}')"
      class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition">
      <span>${c.icon}</span><span class="font-medium">${c.name}</span>
    </button>`).join('')
}

// ── Filtres avancés ──────────────────────────────────────────
function toggleFilters() {
  const panel   = document.getElementById('filters-panel')
  const chevron = document.getElementById('filter-chevron')
  panel.classList.toggle('hidden')
  chevron.style.transform = panel.classList.contains('hidden') ? '' : 'rotate(180deg)'
}

function applyFilters() {
  const category = document.getElementById('filter-category').value
  const location = document.getElementById('filter-location').value
  const minPrice = document.getElementById('filter-min-price').value
  const maxPrice = document.getElementById('filter-max-price').value
  const sort     = document.getElementById('filter-sort').value

  let url = `/api/listings?limit=${PAGE_SIZE}&offset=0&sort=${sort}`
  if (category) url += `&category=${encodeURIComponent(category)}`
  if (location) url += `&location=${encodeURIComponent(location)}`
  if (minPrice) url += `&min_price=${minPrice}`
  if (maxPrice) url += `&max_price=${maxPrice}`

  const parts = []
  if (category) parts.push(category)
  if (location) parts.push(location)
  if (minPrice || maxPrice) parts.push(`${minPrice||0} – ${maxPrice||'∞'} FCFA`)

  document.getElementById('listings-title').textContent = parts.length ? parts.join(' · ') : 'Toutes les annonces'
  document.getElementById('btn-reset-filter').classList.remove('hidden')
  currentPage = 0
  loadListingsByUrl(url)
  window.scrollTo({ top: 600, behavior: 'smooth' })
}

function resetFilters() {
  ['filter-category','filter-location','filter-min-price','filter-max-price'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })
  document.getElementById('filter-sort').value = 'recent'
}

// ── Chargement des annonces ──────────────────────────────────
async function loadListings(search = '', category = '', location = '') {
  currentPage = 0
  let url = `/api/listings?limit=${PAGE_SIZE}&offset=0`
  if (search)   url += `&search=${encodeURIComponent(search)}`
  if (category) url += `&category=${encodeURIComponent(category)}`
  if (location) url += `&location=${encodeURIComponent(location)}`
  await loadListingsByUrl(url)
}

async function loadListingsByUrl(url) {
  const grid = document.getElementById('listings-grid')
  grid.innerHTML = `<div class="col-span-full text-center text-gray-400 py-12"><i class="fas fa-spinner fa-spin text-3xl mb-3"></i></div>`
  document.getElementById('pagination').classList.add('hidden')
  try {
    const res  = await fetch(url)
    const data = await res.json()
    totalListings = data.total || 0
    renderListings(data.listings || [])
    renderPagination(url)
  } catch {
    grid.innerHTML = `<div class="col-span-full text-center text-red-400 py-12"><i class="fas fa-exclamation-triangle text-3xl mb-3"></i><br/>Impossible de charger les annonces</div>`
  }
}

function renderListings(listings) {
  const grid = document.getElementById('listings-grid')
  if (!listings.length) {
    grid.innerHTML = `<div class="col-span-full text-center text-gray-400 py-16">
      <i class="fas fa-search text-4xl mb-4 opacity-50"></i>
      <p class="text-lg font-medium">Aucune annonce trouvée</p>
      <p class="text-sm mt-1">Essaie avec d'autres termes ou filtres</p>
    </div>`
    return
  }
  grid.innerHTML = listings.map(l => listingCard(l)).join('')
}

function renderPagination(baseUrl) {
  const pgEl = document.getElementById('pagination')
  if (totalListings <= PAGE_SIZE) { pgEl.classList.add('hidden'); return }
  pgEl.classList.remove('hidden')
  const totalPages = Math.ceil(totalListings / PAGE_SIZE)
  pgEl.innerHTML = ''

  const btn = (label, page, disabled = false, active = false) => {
    const b = document.createElement('button')
    b.innerHTML = label
    b.className = `px-3 py-2 rounded-lg text-sm font-medium transition ${
      active  ? 'bg-primary-600 text-white' :
      disabled ? 'text-gray-300 cursor-not-allowed' :
                 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`
    if (!disabled) b.onclick = () => goToPage(page, baseUrl)
    pgEl.appendChild(b)
  }

  btn('<i class="fas fa-chevron-left"></i>', currentPage - 1, currentPage === 0)
  for (let i = 0; i < totalPages; i++) {
    if (i === 0 || i === totalPages - 1 || Math.abs(i - currentPage) <= 1) btn(i + 1, i, false, i === currentPage)
    else if (Math.abs(i - currentPage) === 2) btn('...', i, true)
  }
  btn('<i class="fas fa-chevron-right"></i>', currentPage + 1, currentPage >= totalPages - 1)
}

async function goToPage(page, baseUrl) {
  currentPage = page
  const url = baseUrl.replace(/offset=\d+/, `offset=${page * PAGE_SIZE}`)
  await loadListingsByUrl(url)
}

// ── Carte d'annonce ──────────────────────────────────────────
function listingCard(l) {
  const cat   = CATEGORIES.find(c => c.name === l.category)
  const badge = cat ? BADGE_COLOR[cat.color] : BADGE_COLOR.gray
  const icon  = cat ? cat.icon : 'fa-tag'
  const price = l.price != null ? `<span class="font-bold text-primary-600 text-sm">${formatPrice(l.price)}</span>`
                                 : `<span class="text-gray-400 text-xs">Prix à débattre</span>`
  const date  = timeAgo(l.created_at)
  const isFav = favoriteIds.has(l.id)

  const thumbnail = l.has_image
    ? `<img src="/api/listings/${l.id}/image" alt="${escHtml(l.title)}" class="w-full h-full object-cover"
           onerror="this.parentElement.innerHTML='<i class=\\'fas ${icon} text-4xl text-gray-300\\'></i>'" />`
    : `<i class="fas ${icon} text-4xl text-gray-300 group-hover:text-gray-400 transition"></i>`

  return `
  <div class="bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition cursor-pointer overflow-hidden group relative"
       onclick="showListing(${l.id})">
    <div class="h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative overflow-hidden">
      ${thumbnail}
      <span class="absolute top-2 left-2 text-xs font-medium px-2 py-0.5 rounded-full border ${badge} bg-white/90 backdrop-blur-sm">${l.category}</span>
      ${currentUser ? `
        <button onclick="event.stopPropagation();toggleFavorite(${l.id},this)"
          class="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow hover:bg-white transition"
          title="${isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}">
          <i class="fas fa-heart ${isFav ? 'text-red-500' : 'text-gray-300'}"></i>
        </button>` : ''}
    </div>
    <div class="p-3">
      <h3 class="font-semibold text-gray-800 text-sm truncate mb-1">${escHtml(l.title)}</h3>
      <p class="text-xs text-gray-500 line-clamp-2 mb-2">${escHtml(l.description)}</p>
      <div class="flex items-center justify-between mb-1">
        ${price}
        ${l.location ? `<span class="text-xs text-gray-400 truncate max-w-24"><i class="fas fa-map-marker-alt mr-0.5"></i>${escHtml(l.location)}</span>` : ''}
      </div>
      <div class="flex items-center justify-between pt-2 border-t border-gray-100">
        <span class="text-xs text-gray-400 truncate"><i class="fas fa-user mr-1"></i>${escHtml(l.author_name)}</span>
        <span class="text-xs text-gray-300">${date}</span>
      </div>
    </div>
  </div>`
}

// ── Détail d'une annonce ──────────────────────────────────────
async function showListing(id) {
  showPage('listing-detail')
  const content = document.getElementById('listing-detail-content')
  content.innerHTML = `<div class="text-center py-16 text-gray-400"><i class="fas fa-spinner fa-spin text-3xl"></i></div>`

  try {
    const res = await fetch(`/api/listings/${id}`)
    if (!res.ok) throw new Error()
    const { listing: l } = await res.json()

    const cat     = CATEGORIES.find(c => c.name === l.category)
    const badge   = cat ? BADGE_COLOR[cat.color] : BADGE_COLOR.gray
    const icon    = cat ? cat.icon : 'fa-tag'
    const price   = l.price != null ? `<span class="text-3xl font-bold text-primary-600">${formatPrice(l.price)}</span>` : `<span class="text-gray-400">Prix à débattre</span>`
    const date    = new Date(l.created_at).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })
    const isOwner = currentUser && l.user_id === currentUser.id
    const isFav   = favoriteIds.has(l.id)

    const imageSection = l.image_data
      ? `<div class="bg-gray-100 overflow-hidden rounded-t-2xl"><img src="${l.image_data}" alt="${escHtml(l.title)}" class="w-full object-contain max-h-96" /></div>`
      : `<div class="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center rounded-t-2xl"><i class="fas ${icon} text-7xl text-gray-300"></i></div>`

    content.innerHTML = `
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
        ${imageSection}
        <div class="p-6">
          <div class="flex items-start justify-between gap-4 mb-4 flex-wrap">
            <div>
              <span class="text-xs font-medium px-3 py-1 rounded-full border ${badge} mb-2 inline-block"><i class="fas ${icon} mr-1"></i>${l.category}</span>
              <h1 class="text-xl font-bold text-gray-800">${escHtml(l.title)}</h1>
            </div>
            <div class="flex items-center gap-2">
              ${price}
              ${currentUser && !isOwner ? `
                <button onclick="toggleFavorite(${l.id},this)" class="w-10 h-10 rounded-full border ${isFav ? 'border-red-300 bg-red-50' : 'border-gray-200'} flex items-center justify-center hover:bg-red-50 transition" title="Favoris">
                  <i class="fas fa-heart ${isFav ? 'text-red-500' : 'text-gray-300'}"></i>
                </button>` : ''}
            </div>
          </div>

          <div class="text-gray-600 mb-5 bg-gray-50 rounded-xl p-4">
            <p class="whitespace-pre-wrap text-sm leading-relaxed">${escHtml(l.description)}</p>
          </div>

          <div class="grid grid-cols-2 gap-3 mb-5 text-sm">
            ${l.location ? `<div class="flex items-center gap-2 text-gray-600"><i class="fas fa-map-marker-alt text-primary-500 w-5"></i>${escHtml(l.location)}</div>` : ''}
            ${l.contact  ? `<div class="flex items-center gap-2 text-gray-600"><i class="fas fa-phone text-primary-500 w-5"></i>${escHtml(l.contact)}</div>` : ''}
            <div class="flex items-center gap-2 text-gray-600 cursor-pointer hover:text-primary-600" onclick="showPublicProfile(${l.user_id})">
              <i class="fas fa-user text-primary-500 w-5"></i>${escHtml(l.author_name)}
            </div>
            <div class="flex items-center gap-2 text-gray-400"><i class="fas fa-calendar w-5"></i>${date}</div>
          </div>

          ${!isOwner && currentUser ? `
            <button onclick="openMessageModal(${l.id},'${escHtml(l.title)}')"
              class="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition mb-3">
              <i class="fas fa-envelope mr-2"></i>Contacter le vendeur
            </button>` : ''}
          ${!currentUser ? `
            <button onclick="showPage('login')" class="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition mb-3">
              <i class="fas fa-sign-in-alt mr-2"></i>Connectez-vous pour contacter le vendeur
            </button>` : ''}

          ${isOwner ? `
            <div class="flex gap-3 pt-4 border-t border-gray-100">
              <button onclick="deleteListing(${l.id})" class="flex-1 bg-red-50 text-red-600 hover:bg-red-100 py-2 rounded-xl font-medium text-sm transition"><i class="fas fa-trash mr-2"></i>Supprimer</button>
              <button onclick="archiveListing(${l.id})" class="flex-1 bg-gray-100 text-gray-600 hover:bg-gray-200 py-2 rounded-xl font-medium text-sm transition"><i class="fas fa-archive mr-2"></i>Archiver</button>
            </div>` : ''}
        </div>
      </div>`
  } catch {
    content.innerHTML = `<div class="text-center py-16 text-red-400"><i class="fas fa-exclamation-triangle text-4xl mb-4"></i><p>Annonce introuvable</p></div>`
  }
}

// ── Filtres rapides ──────────────────────────────────────────
function filterByCategory(category) {
  activeFilter = category
  document.getElementById('listings-title').textContent = `Catégorie : ${category}`
  document.getElementById('btn-reset-filter').classList.remove('hidden')
  loadListings('', category)
  window.scrollTo({ top: 600, behavior: 'smooth' })
}
function filterByCity(city) {
  document.getElementById('listings-title').textContent = `Annonces à ${city}`
  document.getElementById('btn-reset-filter').classList.remove('hidden')
  loadListings(city)
  window.scrollTo({ top: 600, behavior: 'smooth' })
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
  window.scrollTo({ top: 600, behavior: 'smooth' })
}
document.addEventListener('keydown', e => { if (e.key === 'Enter' && document.activeElement.id === 'search-input') searchListings() })

// ── Auth ──────────────────────────────────────────────────────
async function handleRegister(e) {
  e.preventDefault()
  const errEl = document.getElementById('reg-error')
  errEl.classList.add('hidden')
  const name = document.getElementById('reg-name').value.trim()
  const email = document.getElementById('reg-email').value.trim()
  const password = document.getElementById('reg-password').value
  try {
    const res = await fetch('/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, email, password }) })
    const data = await res.json()
    if (!res.ok) { errEl.textContent = data.error; errEl.classList.remove('hidden'); return }
    authToken = data.token; currentUser = data.user
    localStorage.setItem('auth', JSON.stringify({ token: authToken, user: currentUser }))
    updateNav(); showToast(`Bienvenue ${data.user.name} ! 🎉`); showPage('home')
  } catch { errEl.textContent = 'Erreur de connexion'; errEl.classList.remove('hidden') }
}

async function handleLogin(e) {
  e.preventDefault()
  const errEl = document.getElementById('login-error')
  errEl.classList.add('hidden')
  const email = document.getElementById('login-email').value.trim()
  const password = document.getElementById('login-password').value
  try {
    const res = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) })
    const data = await res.json()
    if (!res.ok) { errEl.textContent = data.error; errEl.classList.remove('hidden'); return }
    authToken = data.token; currentUser = data.user
    localStorage.setItem('auth', JSON.stringify({ token: authToken, user: currentUser }))
    updateNav(); loadBadges(); loadFavoriteIds()
    showToast(`Bon retour ${data.user.name} !`); showPage('home')
  } catch { errEl.textContent = 'Erreur de connexion'; errEl.classList.remove('hidden') }
}

function logout() {
  authToken = null; currentUser = null; favoriteIds = new Set()
  localStorage.removeItem('auth')
  updateNav(); showPage('home'); showToast('Déconnexion réussie')
}

// ── Badges (messages + notifications) ────────────────────────
async function loadBadges() {
  if (!authToken) return
  try {
    const [mRes, nRes] = await Promise.all([
      fetch('/api/messages/unread-count', { headers: { Authorization: `Bearer ${authToken}` } }),
      fetch('/api/notifications/count',  { headers: { Authorization: `Bearer ${authToken}` } })
    ])
    const m = await mRes.json()
    const n = await nRes.json()
    setBadge('badge-messages', m.count)
    setBadge('badge-notifs',   n.count)
  } catch {}
}

function setBadge(id, count) {
  const el = document.getElementById(id)
  if (!el) return
  if (count > 0) { el.textContent = count > 9 ? '9+' : count; el.classList.remove('hidden') }
  else el.classList.add('hidden')
}

// ── Favoris ───────────────────────────────────────────────────
async function loadFavoriteIds() {
  if (!authToken) return
  try {
    const res = await fetch('/api/favorites/ids', { headers: { Authorization: `Bearer ${authToken}` } })
    const d = await res.json()
    favoriteIds = new Set(d.ids || [])
  } catch {}
}

async function toggleFavorite(listingId, btn) {
  if (!authToken) { showPage('login'); return }
  try {
    const res = await fetch(`/api/favorites/${listingId}`, { method:'POST', headers: { Authorization: `Bearer ${authToken}` } })
    const d = await res.json()
    if (res.ok) {
      if (d.favorited) { favoriteIds.add(listingId); showToast('Ajouté aux favoris ❤️') }
      else { favoriteIds.delete(listingId); showToast('Retiré des favoris') }
      // Mettre à jour l'icône
      const icon = btn.querySelector('i')
      if (icon) icon.className = `fas fa-heart ${d.favorited ? 'text-red-500' : 'text-gray-300'}`
    }
  } catch { showToast('Erreur', 'error') }
}

async function loadFavorites() {
  if (!authToken) { showPage('login'); return }
  const grid = document.getElementById('favorites-grid')
  grid.innerHTML = `<div class="col-span-full text-center text-gray-400 py-12"><i class="fas fa-spinner fa-spin text-3xl"></i></div>`
  try {
    const res = await fetch('/api/favorites', { headers: { Authorization: `Bearer ${authToken}` } })
    const { favorites } = await res.json()
    if (!favorites.length) {
      grid.innerHTML = `<div class="col-span-full text-center text-gray-400 py-16">
        <i class="fas fa-heart text-4xl mb-4 opacity-30"></i>
        <p class="font-medium">Aucun favori pour l'instant</p>
        <p class="text-sm mt-1">Clique sur ❤️ sur une annonce pour la sauvegarder</p>
      </div>`
      return
    }
    grid.innerHTML = favorites.map(l => listingCard({...l, has_image: l.has_image})).join('')
  } catch { grid.innerHTML = `<div class="col-span-full text-center text-red-400 py-12">Erreur de chargement</div>` }
}

// ── Messagerie ────────────────────────────────────────────────
function openMessageModal(listingId, title) {
  if (!authToken) { showPage('login'); return }
  currentModalListingId = listingId
  document.getElementById('modal-listing-title').textContent = `📌 ${title}`
  document.getElementById('modal-message-text').value = ''
  document.getElementById('modal-msg-error').classList.add('hidden')
  document.getElementById('modal-message').classList.remove('hidden')
}
function closeMessageModal() {
  document.getElementById('modal-message').classList.add('hidden')
}

async function submitMessage() {
  const content = document.getElementById('modal-message-text').value.trim()
  const errEl   = document.getElementById('modal-msg-error')
  errEl.classList.add('hidden')
  if (!content) { errEl.textContent = 'Écris un message avant d\'envoyer'; errEl.classList.remove('hidden'); return }
  try {
    const res = await fetch('/api/messages', { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${authToken}`}, body: JSON.stringify({ listing_id: currentModalListingId, content }) })
    const d = await res.json()
    if (!res.ok) { errEl.textContent = d.error; errEl.classList.remove('hidden'); return }
    closeMessageModal()
    showToast('Message envoyé ! ✉️')
    loadBadges()
  } catch { errEl.textContent = 'Erreur serveur'; errEl.classList.remove('hidden') }
}

async function loadInbox() {
  if (!authToken) { showPage('login'); return }
  const list = document.getElementById('conversations-list')
  list.innerHTML = `<div class="text-center text-gray-400 py-8 text-sm"><i class="fas fa-spinner fa-spin"></i></div>`
  try {
    const res = await fetch('/api/messages/inbox', { headers: { Authorization: `Bearer ${authToken}` } })
    const { conversations } = await res.json()
    if (!conversations.length) {
      list.innerHTML = `<div class="text-center text-gray-400 py-8 text-sm"><i class="fas fa-inbox text-2xl mb-2"></i><p>Aucune conversation</p></div>`
      return
    }
    list.innerHTML = conversations.map(c => `
      <div onclick="openChat(${c.listing_id},${c.other_user_id},'${escHtml(c.listing_title)}','${escHtml(c.other_user_name)}')"
        class="p-3 hover:bg-gray-50 cursor-pointer transition">
        <div class="flex items-center justify-between mb-1">
          <span class="text-sm font-semibold text-gray-800 truncate">${escHtml(c.other_user_name)}</span>
          ${c.unread_count > 0 ? `<span class="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">${c.unread_count}</span>` : ''}
        </div>
        <p class="text-xs text-gray-400 truncate">${escHtml(c.listing_title)}</p>
        <p class="text-xs text-gray-500 truncate mt-0.5">${escHtml(c.last_message)}</p>
      </div>`).join('')
  } catch { list.innerHTML = `<div class="text-center text-red-400 py-8 text-sm">Erreur</div>` }
}

async function openChat(listingId, otherUserId, listingTitle, otherName) {
  currentChatListingId = listingId
  currentChatOtherUserId = otherUserId
  document.getElementById('chat-header').classList.remove('hidden')
  document.getElementById('chat-title').textContent = otherName
  document.getElementById('chat-subtitle').textContent = listingTitle
  document.getElementById('chat-input-area').classList.remove('hidden')
  const msgs = document.getElementById('chat-messages')
  msgs.innerHTML = `<div class="text-center text-gray-400 py-8"><i class="fas fa-spinner fa-spin"></i></div>`
  try {
    const res = await fetch(`/api/messages/${listingId}/${otherUserId}`, { headers: { Authorization: `Bearer ${authToken}` } })
    const { messages } = await res.json()
    if (!messages.length) { msgs.innerHTML = `<div class="text-center text-gray-400 py-8 text-sm">Commencez la conversation</div>`; return }
    msgs.innerHTML = messages.map(m => {
      const mine = m.sender_id === currentUser.id
      return `<div class="flex ${mine ? 'justify-end' : 'justify-start'}">
        <div class="max-w-xs px-4 py-2 rounded-2xl text-sm ${mine ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}">
          ${escHtml(m.content)}
          <p class="text-xs mt-1 ${mine ? 'text-primary-200' : 'text-gray-400'}">${timeAgo(m.created_at)}</p>
        </div>
      </div>`
    }).join('')
    msgs.scrollTop = msgs.scrollHeight
    loadBadges()
  } catch { msgs.innerHTML = `<div class="text-center text-red-400 py-8 text-sm">Erreur</div>` }
}

async function sendMessage() {
  const input = document.getElementById('chat-input')
  const content = input.value.trim()
  if (!content || !currentChatListingId) return
  input.value = ''
  try {
    await fetch('/api/messages', { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${authToken}`}, body: JSON.stringify({ listing_id: currentChatListingId, content }) })
    openChat(currentChatListingId, currentChatOtherUserId, document.getElementById('chat-subtitle').textContent, document.getElementById('chat-title').textContent)
  } catch { showToast('Erreur envoi', 'error') }
}

// ── Notifications ─────────────────────────────────────────────
async function loadNotifications() {
  if (!authToken) { showPage('login'); return }
  const list = document.getElementById('notifications-list')
  list.innerHTML = `<div class="text-center text-gray-400 py-12"><i class="fas fa-spinner fa-spin text-3xl"></i></div>`
  try {
    const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${authToken}` } })
    const { notifications } = await res.json()
    if (!notifications.length) {
      list.innerHTML = `<div class="text-center text-gray-400 py-16"><i class="fas fa-bell-slash text-4xl mb-4 opacity-30"></i><p>Aucune notification</p></div>`
      return
    }
    const icons = { message: 'fa-envelope text-primary-500', favorite: 'fa-heart text-red-500', system: 'fa-info-circle text-blue-500' }
    list.innerHTML = notifications.map(n => `
      <div onclick="markNotifRead(${n.id}, this)" class="flex items-start gap-3 p-4 bg-white rounded-xl border ${n.is_read ? 'border-gray-200' : 'border-primary-200 bg-primary-50/30'} cursor-pointer hover:bg-gray-50 transition">
        <div class="w-9 h-9 rounded-full ${n.is_read ? 'bg-gray-100' : 'bg-primary-100'} flex items-center justify-center shrink-0">
          <i class="fas ${icons[n.type] || 'fa-bell text-gray-500'}"></i>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-gray-800">${escHtml(n.title)}</p>
          <p class="text-xs text-gray-500 mt-0.5">${escHtml(n.body)}</p>
          <p class="text-xs text-gray-300 mt-1">${timeAgo(n.created_at)}</p>
        </div>
        ${!n.is_read ? '<div class="w-2 h-2 rounded-full bg-primary-500 mt-1.5 shrink-0"></div>' : ''}
      </div>`).join('')
    setBadge('badge-notifs', notifications.filter(n => !n.is_read).length)
  } catch { list.innerHTML = `<div class="text-center text-red-400 py-12">Erreur</div>` }
}

async function markNotifRead(id, el) {
  try {
    await fetch(`/api/notifications/${id}/read`, { method:'PUT', headers:{ Authorization:`Bearer ${authToken}` } })
    el.classList.remove('border-primary-200','bg-primary-50/30')
    el.classList.add('border-gray-200')
    const dot = el.querySelector('.bg-primary-500')
    if (dot) dot.remove()
    loadBadges()
  } catch {}
}

async function markAllNotifsRead() {
  try {
    await fetch('/api/notifications/read-all', { method:'PUT', headers:{ Authorization:`Bearer ${authToken}` } })
    showToast('Toutes les notifications lues')
    loadNotifications()
    loadBadges()
  } catch {}
}

// ── Profil édition ─────────────────────────────────────────────
async function loadProfileEdit() {
  if (!authToken) { showPage('login'); return }
  try {
    const res = await fetch('/api/profile/me', { headers: { Authorization: `Bearer ${authToken}` } })
    const { user } = await res.json()
    document.getElementById('profile-name').value  = user.name || ''
    document.getElementById('profile-phone').value = user.phone || ''
    document.getElementById('profile-city').value  = user.city || ''
    document.getElementById('profile-bio').value   = user.bio || ''
    document.getElementById('profile-name-display').textContent  = user.name
    document.getElementById('profile-email-display').textContent = user.email
    if (user.avatar) {
      pendingAvatarData = user.avatar
      document.getElementById('profile-avatar-display').innerHTML = `<img src="${user.avatar}" class="w-full h-full object-cover" />`
    }
  } catch { showToast('Erreur chargement profil', 'error') }
}

function handleAvatarSelect(input) {
  const file = input.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = e => {
    const img = new Image()
    img.onload = () => {
      const MAX = 200; let w = img.width, h = img.height
      if (w > MAX || h > MAX) { if (w > h) { h = Math.round(h*MAX/w); w=MAX } else { w=Math.round(w*MAX/h); h=MAX } }
      const canvas = document.createElement('canvas'); canvas.width=w; canvas.height=h
      canvas.getContext('2d').drawImage(img,0,0,w,h)
      pendingAvatarData = canvas.toDataURL('image/jpeg', 0.85)
      document.getElementById('profile-avatar-display').innerHTML = `<img src="${pendingAvatarData}" class="w-full h-full object-cover" />`
    }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
}

async function saveProfile() {
  const name  = document.getElementById('profile-name').value.trim()
  const phone = document.getElementById('profile-phone').value.trim()
  const city  = document.getElementById('profile-city').value
  const bio   = document.getElementById('profile-bio').value.trim()
  const msgEl = document.getElementById('profile-save-msg')
  msgEl.classList.add('hidden')
  try {
    const res = await fetch('/api/profile/me', { method:'PUT', headers:{'Content-Type':'application/json','Authorization':`Bearer ${authToken}`}, body: JSON.stringify({ name, phone, city, bio, avatar: pendingAvatarData }) })
    const d = await res.json()
    if (!res.ok) { msgEl.textContent=d.error; msgEl.className='text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg'; msgEl.classList.remove('hidden'); return }
    currentUser.name = name
    if (pendingAvatarData) currentUser.avatar = pendingAvatarData
    localStorage.setItem('auth', JSON.stringify({ token: authToken, user: currentUser }))
    updateNav()
    msgEl.textContent = 'Profil enregistré ✓'
    msgEl.className = 'text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg'
    msgEl.classList.remove('hidden')
    showToast('Profil mis à jour !')
  } catch { showToast('Erreur serveur', 'error') }
}

async function changePassword() {
  const current = document.getElementById('pwd-current').value
  const newPwd  = document.getElementById('pwd-new').value
  const msgEl   = document.getElementById('pwd-msg')
  msgEl.classList.add('hidden')
  try {
    const res = await fetch('/api/profile/me/password', { method:'PUT', headers:{'Content-Type':'application/json','Authorization':`Bearer ${authToken}`}, body: JSON.stringify({ current_password: current, new_password: newPwd }) })
    const d = await res.json()
    if (!res.ok) { msgEl.textContent=d.error; msgEl.className='text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg'; msgEl.classList.remove('hidden'); return }
    msgEl.textContent = 'Mot de passe changé ✓'
    msgEl.className = 'text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg'
    msgEl.classList.remove('hidden')
    document.getElementById('pwd-current').value = ''
    document.getElementById('pwd-new').value = ''
    showToast('Mot de passe mis à jour !')
  } catch { showToast('Erreur serveur', 'error') }
}

// ── Profil public ──────────────────────────────────────────────
async function showPublicProfile(userId) {
  showPage('public-profile')
  const content = document.getElementById('public-profile-content')
  content.innerHTML = `<div class="text-center py-12 text-gray-400"><i class="fas fa-spinner fa-spin text-3xl"></i></div>`
  try {
    const res = await fetch(`/api/profile/${userId}`)
    const { user, listings } = await res.json()
    content.innerHTML = `
      <div class="bg-white rounded-2xl shadow-sm p-6 mb-6 flex items-center gap-5">
        <div class="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden shrink-0">
          ${user.avatar ? `<img src="${user.avatar}" class="w-full h-full object-cover" />` : `<i class="fas fa-user text-primary-400 text-2xl"></i>`}
        </div>
        <div>
          <h2 class="text-xl font-bold text-gray-800">${escHtml(user.name)}</h2>
          ${user.city ? `<p class="text-sm text-gray-500"><i class="fas fa-map-marker-alt mr-1 text-primary-400"></i>${escHtml(user.city)}</p>` : ''}
          ${user.bio  ? `<p class="text-sm text-gray-600 mt-1">${escHtml(user.bio)}</p>` : ''}
          <p class="text-xs text-gray-300 mt-1">Membre depuis ${new Date(user.created_at).toLocaleDateString('fr-FR', {month:'long',year:'numeric'})}</p>
        </div>
      </div>
      <h3 class="font-bold text-gray-800 mb-4">Annonces actives (${listings.length})</h3>
      ${listings.length ? `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">${listings.map(l => listingCard(l)).join('')}</div>` : `<p class="text-gray-400 text-sm">Aucune annonce active</p>`}`
  } catch { content.innerHTML = `<div class="text-center py-12 text-red-400">Profil introuvable</div>` }
}

// ── Tableau de bord ────────────────────────────────────────────
async function loadDashboard() {
  if (!authToken) { showPage('login'); return }
  try {
    const res = await fetch('/api/users/me/stats', { headers: { Authorization: `Bearer ${authToken}` } })
    const stats = await res.json()
    document.getElementById('user-stats').innerHTML = `
      <div class="bg-white rounded-xl border p-4 text-center"><div class="text-3xl font-bold text-primary-600">${stats.active}</div><p class="text-xs text-gray-500 mt-1">Actives</p></div>
      <div class="bg-white rounded-xl border p-4 text-center"><div class="text-3xl font-bold text-gray-400">${stats.archived}</div><p class="text-xs text-gray-500 mt-1">Archivées</p></div>
      <div class="bg-white rounded-xl border p-4 text-center"><div class="text-3xl font-bold text-accent-500">${stats.total}</div><p class="text-xs text-gray-500 mt-1">Total publié</p></div>
      <div class="bg-white rounded-xl border p-4 text-center cursor-pointer hover:bg-primary-50 transition" onclick="showPage('messages')">
        <div class="text-3xl font-bold text-blue-500" id="dash-msgs">–</div><p class="text-xs text-gray-500 mt-1">Messages</p>
      </div>`
    fetch('/api/messages/unread-count', { headers:{Authorization:`Bearer ${authToken}`} }).then(r=>r.json()).then(d=>{ const el=document.getElementById('dash-msgs'); if(el) el.textContent=d.count })
  } catch {}
  try {
    const res = await fetch('/api/users/me/listings', { headers: { Authorization: `Bearer ${authToken}` } })
    const { listings } = await res.json()
    const container = document.getElementById('user-listings')
    if (!listings.length) {
      container.innerHTML = `<div class="text-center py-12 text-gray-400 bg-white rounded-xl border">
        <i class="fas fa-clipboard-list text-4xl mb-4 opacity-30"></i>
        <p class="font-medium">Aucune annonce publiée</p>
        <button onclick="showPage('new-listing')" class="mt-4 bg-primary-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-primary-700 transition">Publier ma première annonce</button>
      </div>`; return
    }
    container.innerHTML = listings.map(l => {
      const cat = CATEGORIES.find(c => c.name === l.category)
      const badge = cat ? BADGE_COLOR[cat.color] : BADGE_COLOR.gray
      const status = l.status === 'active' ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>' : '<span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Archivée</span>'
      return `<div class="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
        <div class="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
          ${l.has_image ? `<img src="/api/listings/${l.id}/image" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='<i class=\\'fas ${cat?cat.icon:'fa-tag'} text-gray-300 text-xl\\'></i>'" />` : `<i class="fas ${cat?cat.icon:'fa-tag'} text-gray-300 text-xl"></i>`}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5 flex-wrap"><span class="text-xs font-medium px-2 py-0.5 rounded-full border ${badge}">${l.category}</span>${status}</div>
          <h4 class="font-semibold text-gray-800 text-sm truncate">${escHtml(l.title)}</h4>
          <p class="text-xs text-gray-400">${l.price != null ? formatPrice(l.price) : 'À débattre'} · ${new Date(l.created_at).toLocaleDateString('fr-FR')}</p>
        </div>
        <div class="flex gap-1.5 shrink-0">
          <button onclick="showListing(${l.id})" class="text-xs text-primary-600 hover:text-primary-700 px-2.5 py-1.5 rounded-lg hover:bg-primary-50 transition"><i class="fas fa-eye"></i></button>
          <button onclick="deleteListing(${l.id},true)" class="text-xs text-red-500 hover:text-red-700 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition"><i class="fas fa-trash"></i></button>
        </div>
      </div>`
    }).join('')
  } catch {}
}

// ── Nouvelle annonce ───────────────────────────────────────────
function resetNewListingForm() {
  pendingImageData = null
  const preview = document.getElementById('img-preview')
  const zone    = document.getElementById('img-upload-zone')
  const btn     = document.getElementById('img-remove-btn')
  if (preview) { preview.src=''; preview.classList.add('hidden') }
  if (zone)    zone.classList.remove('hidden')
  if (btn)     btn.classList.add('hidden')
  const input  = document.getElementById('nl-image')
  if (input)   input.value = ''
  const infoEl = document.getElementById('img-info')
  if (infoEl)  infoEl.textContent = ''
}

function handleImageSelect(input) {
  const file = input.files[0]
  if (!file) return
  if (!file.type.startsWith('image/')) { showToast('Veuillez sélectionner une image', 'error'); input.value=''; return }
  if (file.size > 5*1024*1024) { showToast('Image trop grande. Maximum 5 Mo.', 'error'); input.value=''; return }
  const reader = new FileReader()
  reader.onload = e => {
    const img = new Image()
    img.onload = () => {
      const MAX=1200; let w=img.width, h=img.height
      if (w>MAX||h>MAX) { if(w>h){h=Math.round(h*MAX/w);w=MAX}else{w=Math.round(w*MAX/h);h=MAX} }
      const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h
      canvas.getContext('2d').drawImage(img,0,0,w,h)
      const compressed = canvas.toDataURL('image/jpeg', 0.82)
      pendingImageData = compressed
      const preview=document.getElementById('img-preview'), zone=document.getElementById('img-upload-zone'), btn=document.getElementById('img-remove-btn')
      preview.src=compressed; preview.classList.remove('hidden'); zone.classList.add('hidden')
      if (btn) btn.classList.remove('hidden')
      document.getElementById('img-info').textContent = `${w}×${h}px — ${Math.round(compressed.length*0.75/1024)} Ko`
    }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
}

function removeImage() {
  pendingImageData=null
  const preview=document.getElementById('img-preview'), zone=document.getElementById('img-upload-zone'), btn=document.getElementById('img-remove-btn')
  if(preview){preview.src='';preview.classList.add('hidden')}
  if(zone) zone.classList.remove('hidden')
  if(btn)  btn.classList.add('hidden')
  const i=document.getElementById('nl-image'); if(i) i.value=''
  const info=document.getElementById('img-info'); if(info) info.textContent=''
}

async function handleNewListing(e) {
  e.preventDefault()
  if (!authToken) { showPage('login'); return }
  const errEl = document.getElementById('nl-error'); errEl.classList.add('hidden')
  const title=document.getElementById('nl-title').value.trim(), category=document.getElementById('nl-category').value
  const price=document.getElementById('nl-price').value, description=document.getElementById('nl-description').value.trim()
  const location=document.getElementById('nl-location').value, contact=document.getElementById('nl-contact').value.trim()
  if (pendingImageData && pendingImageData.length>550000) { errEl.textContent='Image trop volumineuse.'; errEl.classList.remove('hidden'); return }
  const btn=e.target.querySelector('[type="submit"]'); btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin mr-2"></i>Publication...'
  try {
    const res=await fetch('/api/listings',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${authToken}`},body:JSON.stringify({title,category,price:price?parseFloat(price):null,description,location,contact,image_data:pendingImageData||null})})
    const d=await res.json()
    if(!res.ok){errEl.textContent=d.error;errEl.classList.remove('hidden');return}
    e.target.reset(); resetNewListingForm(); showToast('Annonce publiée ! 🎉'); showPage('home'); loadListings()
  } catch { errEl.textContent='Erreur serveur'; errEl.classList.remove('hidden') }
  finally { btn.disabled=false; btn.innerHTML='<i class="fas fa-paper-plane mr-2"></i>Publier' }
}

// ── Actions annonces ──────────────────────────────────────────
async function deleteListing(id, fromDashboard=false) {
  if (!confirm('Supprimer cette annonce ?')) return
  try {
    const res=await fetch(`/api/listings/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${authToken}`}})
    if(res.ok){showToast('Annonce supprimée'); if(fromDashboard)loadDashboard(); else{showPage('home');loadListings()}}
    else showToast('Impossible de supprimer','error')
  } catch { showToast('Erreur serveur','error') }
}
async function archiveListing(id) {
  try {
    const res=await fetch(`/api/listings/${id}/archive`,{method:'PUT',headers:{Authorization:`Bearer ${authToken}`}})
    if(res.ok){showToast('Annonce archivée');showPage('home');loadListings()}
    else showToast("Impossible d'archiver",'error')
  } catch { showToast('Erreur serveur','error') }
}

// ── Administration ─────────────────────────────────────────────
function adminTab(tab) {
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('bg-white','shadow','text-primary-600'))
  const active = document.getElementById(`admin-tab-${tab}`)
  if (active) active.classList.add('bg-white','shadow','text-primary-600')
  if (tab==='stats')    loadAdminStats()
  if (tab==='listings') loadAdminListings()
  if (tab==='users')    loadAdminUsers()
}

async function loadAdminStats() {
  const content = document.getElementById('admin-content')
  content.innerHTML = `<div class="text-center py-12 text-gray-400"><i class="fas fa-spinner fa-spin text-3xl"></i></div>`
  try {
    const res = await fetch('/api/profile/admin/stats', { headers:{Authorization:`Bearer ${authToken}`} })
    if (!res.ok) { content.innerHTML=`<div class="text-center py-12 text-red-400">Accès refusé</div>`; return }
    const { stats, top_categories, latest_users } = await res.json()
    content.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        ${[
          ['Utilisateurs',stats.total_users,'fa-users','blue'],
          ['Annonces actives',stats.active_listings,'fa-list','green'],
          ['Messages',stats.total_messages,'fa-envelope','purple'],
          ['Favoris',stats.total_favorites,'fa-heart','red'],
        ].map(([label,val,icon,color])=>`
          <div class="bg-white rounded-xl border p-4 text-center">
            <div class="w-10 h-10 bg-${color}-100 rounded-xl flex items-center justify-center mx-auto mb-2"><i class="fas ${icon} text-${color}-500"></i></div>
            <div class="text-2xl font-bold text-gray-800">${val}</div>
            <p class="text-xs text-gray-500">${label}</p>
          </div>`).join('')}
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white rounded-xl border p-5">
          <h3 class="font-bold text-gray-800 mb-4">Top catégories</h3>
          <div class="space-y-3">
            ${top_categories.map(c=>`
              <div class="flex items-center gap-3">
                <span class="text-sm text-gray-700 flex-1">${c.category}</span>
                <div class="flex-1 bg-gray-100 rounded-full h-2"><div class="bg-primary-500 h-2 rounded-full" style="width:${Math.min(100,c.count*5)}%"></div></div>
                <span class="text-sm font-semibold text-gray-600 w-8 text-right">${c.count}</span>
              </div>`).join('')}
          </div>
        </div>
        <div class="bg-white rounded-xl border p-5">
          <h3 class="font-bold text-gray-800 mb-4">Derniers inscrits</h3>
          <div class="space-y-2">
            ${latest_users.map(u=>`
              <div class="flex items-center gap-3 text-sm">
                <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0"><i class="fas fa-user text-primary-400 text-xs"></i></div>
                <div class="flex-1 min-w-0"><p class="font-medium text-gray-800 truncate">${escHtml(u.name)}</p><p class="text-xs text-gray-400 truncate">${escHtml(u.email)}</p></div>
                <span class="text-xs text-gray-300">${timeAgo(u.created_at)}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>`
  } catch { content.innerHTML=`<div class="text-center py-12 text-red-400">Erreur</div>` }
}

async function loadAdminListings() {
  const content = document.getElementById('admin-content')
  content.innerHTML=`<div class="text-center py-12 text-gray-400"><i class="fas fa-spinner fa-spin text-3xl"></i></div>`
  try {
    const res=await fetch('/api/profile/admin/listings?status=active&limit=100',{headers:{Authorization:`Bearer ${authToken}`}})
    const {listings}=await res.json()
    content.innerHTML=`
      <div class="bg-white rounded-xl border overflow-hidden">
        <div class="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 class="font-bold text-gray-800">Annonces actives (${listings.length})</h3>
        </div>
        <div class="divide-y divide-gray-100">
          ${listings.map(l=>`
            <div class="flex items-center gap-3 p-3 hover:bg-gray-50">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 truncate">${escHtml(l.title)}</p>
                <p class="text-xs text-gray-400">${l.category} · ${l.author_name} · ${l.author_email}</p>
              </div>
              <span class="text-xs text-gray-400 hidden sm:block">${timeAgo(l.created_at)}</span>
              <button onclick="adminDeleteListing(${l.id},this)" class="text-xs text-red-500 hover:text-red-700 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition shrink-0"><i class="fas fa-trash"></i></button>
            </div>`).join('')}
        </div>
      </div>`
  } catch { content.innerHTML=`<div class="text-center py-12 text-red-400">Erreur</div>` }
}

async function adminDeleteListing(id, btn) {
  if (!confirm('Supprimer cette annonce (admin) ?')) return
  try {
    const res=await fetch(`/api/profile/admin/listings/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${authToken}`}})
    if(res.ok){btn.closest('.flex').remove();showToast('Annonce supprimée')}
    else showToast('Erreur','error')
  } catch { showToast('Erreur','error') }
}

async function loadAdminUsers() {
  const content=document.getElementById('admin-content')
  content.innerHTML=`<div class="text-center py-12 text-gray-400"><i class="fas fa-spinner fa-spin text-3xl"></i></div>`
  try {
    const res=await fetch('/api/profile/admin/users',{headers:{Authorization:`Bearer ${authToken}`}})
    const {users}=await res.json()
    content.innerHTML=`
      <div class="bg-white rounded-xl border overflow-hidden">
        <div class="p-4 border-b border-gray-100"><h3 class="font-bold text-gray-800">Utilisateurs (${users.length})</h3></div>
        <div class="divide-y divide-gray-100">
          ${users.map(u=>`
            <div class="flex items-center gap-3 p-3 hover:bg-gray-50">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-medium text-gray-800 truncate">${escHtml(u.name)}</p>
                  ${u.is_admin?'<span class="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">Admin</span>':''}
                </div>
                <p class="text-xs text-gray-400">${escHtml(u.email)} · ${u.listings_count} annonce(s) · ${timeAgo(u.created_at)}</p>
              </div>
              <button onclick="adminToggleAdmin(${u.id},this)" class="text-xs ${u.is_admin?'text-orange-500 hover:bg-orange-50':'text-gray-400 hover:bg-gray-100'} px-2.5 py-1.5 rounded-lg transition shrink-0">
                <i class="fas fa-shield-alt"></i>
              </button>
            </div>`).join('')}
        </div>
      </div>`
  } catch { content.innerHTML=`<div class="text-center py-12 text-red-400">Erreur</div>` }
}

async function adminToggleAdmin(id, btn) {
  try {
    const res=await fetch(`/api/profile/admin/users/${id}/toggle-admin`,{method:'PUT',headers:{Authorization:`Bearer ${authToken}`}})
    const d=await res.json()
    if(res.ok){ showToast(d.message); loadAdminUsers() } else showToast(d.error,'error')
  } catch { showToast('Erreur','error') }
}

// ── Utilitaires ────────────────────────────────────────────────
function formatPrice(p) {
  if (p===0) return 'Gratuit'
  return new Intl.NumberFormat('fr-FR',{style:'decimal',maximumFractionDigits:0}).format(p)+' FCFA'
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff/60000), h = Math.floor(diff/3600000), d = Math.floor(diff/86400000)
  if (m<2)  return 'À l\'instant'
  if (m<60) return `Il y a ${m} min`
  if (h<24) return `Il y a ${h}h`
  if (d<7)  return `Il y a ${d}j`
  return new Date(dateStr).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})
}

function escHtml(str) {
  if (!str) return ''
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
