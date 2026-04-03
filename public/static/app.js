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
let pendingImages = []   // tableau de data URLs (max 5)
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
  initDarkMode()
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

  // Badge multi-photos
  const photosBadge = (l.extra_images_count > 0)
    ? `<span class="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-lg backdrop-blur-sm flex items-center gap-1"><i class="fas fa-images text-xs"></i>${parseInt(l.extra_images_count)+1}</span>`
    : ''

  // Bouton WhatsApp si contact disponible
  const waBtn = l.contact ? `
    <button onclick="event.stopPropagation();openWhatsApp('${escHtml(l.contact)}','${escHtml(l.title)}')"
      class="absolute bottom-2 right-2 bg-green-500 hover:bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md transition z-10"
      title="Contacter sur WhatsApp">
      <i class="fab fa-whatsapp text-base"></i>
    </button>` : ''

  return `
  <div class="bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition cursor-pointer overflow-hidden group relative"
       onclick="showListing(${l.id})">
    <div class="h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative overflow-hidden">
      ${thumbnail}
      <span class="absolute top-2 left-2 text-xs font-medium px-2 py-0.5 rounded-full border ${badge} bg-white/90 backdrop-blur-sm">${l.category}</span>
      ${photosBadge}
      ${currentUser ? `
        <button onclick="event.stopPropagation();toggleFavorite(${l.id},this)"
          class="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow hover:bg-white transition"
          title="${isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}">
          <i class="fas fa-heart ${isFav ? 'text-red-500' : 'text-gray-300'}"></i>
        </button>` : ''}
      ${waBtn}
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

    // URL de partage
    const shareUrl = encodeURIComponent(window.location.href)
    const shareText = encodeURIComponent(`${l.title} — ${l.price ? formatPrice(l.price) : 'Prix à débattre'} sur PetitesAnnoncesIvoire.com`)

    // ── Galerie swipeable ──────────────────────────────────────
    let imageSection = ''
    const allImages = l.images || (l.image_data ? [{ id: 'main', data: l.image_data }] : [])
    if (allImages.length === 0) {
      imageSection = `<div class="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center rounded-t-2xl"><i class="fas ${icon} text-7xl text-gray-300"></i></div>`
    } else if (allImages.length === 1) {
      imageSection = `<div class="bg-gray-100 overflow-hidden rounded-t-2xl"><img src="${allImages[0].data}" alt="${escHtml(l.title)}" class="w-full object-contain max-h-96" /></div>`
    } else {
      // Galerie avec slider
      const slides = allImages.map((img, i) =>
        `<div class="gallery-slide flex-shrink-0 w-full" style="display:${i===0?'flex':'none'};align-items:center;justify-content:center;background:#f3f4f6;min-height:260px;">
          <img src="${img.data}" alt="Photo ${i+1}" class="w-full object-contain max-h-96 select-none" draggable="false" />
        </div>`
      ).join('')
      const dots = allImages.map((_, i) =>
        `<button onclick="galleryGoto(${i})" class="gallery-dot w-2 h-2 rounded-full transition ${i===0?'bg-white scale-125':'bg-white/50'}" data-idx="${i}"></button>`
      ).join('')
      imageSection = `
        <div id="listing-gallery" class="relative bg-gray-100 rounded-t-2xl overflow-hidden select-none"
          data-idx="0" data-total="${allImages.length}"
          ontouchstart="window._gts=event.touches[0].clientX" 
          ontouchend="if(window._gts!==undefined){const dx=event.changedTouches[0].clientX-window._gts;if(Math.abs(dx)>40){dx<0?galleryNext():galleryPrev()}}">
          <div id="gallery-track" class="flex">
            ${slides}
          </div>
          <!-- Flèches -->
          <button onclick="galleryPrev()" class="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center shadow transition z-10 backdrop-blur-sm">
            <i class="fas fa-chevron-left"></i>
          </button>
          <button onclick="galleryNext()" class="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center shadow transition z-10 backdrop-blur-sm">
            <i class="fas fa-chevron-right"></i>
          </button>
          <!-- Compteur -->
          <div class="absolute top-3 right-3 bg-black/40 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm font-medium">
            <span id="gallery-counter">1</span>/${allImages.length}
          </div>
          <!-- Dots -->
          <div class="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            ${dots}
          </div>
        </div>`
    }

    // Boutons WhatsApp + partage
    const whatsappBtn = l.contact ? `
      <a href="https://wa.me/${formatPhoneForWA(l.contact)}?text=${encodeURIComponent('Bonjour, je suis intéressé par votre annonce : ' + l.title + ' sur PetitesAnnoncesIvoire.com')}"
         target="_blank" rel="noopener"
         class="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold transition text-sm text-center flex items-center justify-center gap-2">
        <i class="fab fa-whatsapp text-lg"></i>WhatsApp
      </a>` : ''

    content.innerHTML = `
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
        ${imageSection}
        <div class="p-6">
          <div class="flex items-start justify-between gap-4 mb-4 flex-wrap">
            <div>
              <span class="text-xs font-medium px-3 py-1 rounded-full border ${badge} mb-2 inline-block"><i class="fas ${icon} mr-1"></i>${l.category}</span>
              <h1 class="text-xl font-bold text-gray-800">${escHtml(l.title)}</h1>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
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

          <!-- Boutons d'action principaux -->
          ${!isOwner && currentUser ? `
            <div class="flex gap-2 mb-3 flex-wrap">
              ${whatsappBtn}
              <button onclick="openMessageModal(${l.id},'${escHtml(l.title)}')"
                class="flex-1 bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition text-sm flex items-center justify-center gap-2">
                <i class="fas fa-envelope"></i>Message
              </button>
            </div>` : ''}
          ${!currentUser ? `
            <div class="flex gap-2 mb-3 flex-wrap">
              ${l.contact ? `
              <a href="https://wa.me/${formatPhoneForWA(l.contact)}?text=${encodeURIComponent('Bonjour, je suis intéressé par votre annonce : ' + l.title)}"
                 target="_blank" rel="noopener"
                 class="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold transition text-sm text-center flex items-center justify-center gap-2">
                <i class="fab fa-whatsapp text-lg"></i>WhatsApp
              </a>` : ''}
              <button onclick="showPage('login')" class="flex-1 bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition text-sm flex items-center justify-center gap-2">
                <i class="fas fa-sign-in-alt"></i>Connexion pour écrire
              </button>
            </div>` : ''}

          <!-- Partage réseaux sociaux -->
          <div class="flex items-center gap-2 py-3 border-t border-b border-gray-100 mb-3">
            <span class="text-xs text-gray-400 font-medium mr-1"><i class="fas fa-share-alt mr-1"></i>Partager :</span>
            <a href="https://wa.me/?text=${shareText}%20${shareUrl}" target="_blank" rel="noopener"
               class="w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition text-sm" title="WhatsApp">
              <i class="fab fa-whatsapp"></i>
            </a>
            <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" rel="noopener"
               class="w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition text-sm" title="Facebook">
              <i class="fab fa-facebook-f"></i>
            </a>
            <a href="https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}" target="_blank" rel="noopener"
               class="w-8 h-8 bg-sky-500 hover:bg-sky-600 text-white rounded-full flex items-center justify-center transition text-sm" title="Twitter/X">
              <i class="fab fa-twitter"></i>
            </a>
            <button onclick="copyLink()" class="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full flex items-center justify-center transition text-sm" title="Copier le lien">
              <i class="fas fa-link"></i>
            </button>
            ${currentUser && !isOwner ? `
            <button onclick="openReportModal(${l.id})" class="ml-auto text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition">
              <i class="fas fa-flag"></i>Signaler
            </button>` : ''}
          </div>

          <!-- Actions propriétaire -->
          ${isOwner ? `
            <div class="flex gap-2 flex-wrap pt-2">
              <button onclick="showEditListing(${l.id})" class="flex-1 bg-primary-50 text-primary-600 hover:bg-primary-100 py-2 rounded-xl font-medium text-sm transition"><i class="fas fa-edit mr-2"></i>Modifier</button>
              <button onclick="archiveListing(${l.id})" class="flex-1 bg-gray-100 text-gray-600 hover:bg-gray-200 py-2 rounded-xl font-medium text-sm transition"><i class="fas fa-archive mr-2"></i>Archiver</button>
              <button onclick="deleteListing(${l.id})" class="flex-1 bg-red-50 text-red-600 hover:bg-red-100 py-2 rounded-xl font-medium text-sm transition"><i class="fas fa-trash mr-2"></i>Supprimer</button>
            </div>` : ''}

          <!-- DISCLAIMER SÉCURITÉ -->
          <div class="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <div class="flex items-center gap-2 mb-3">
              <div class="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                <i class="fas fa-shield-alt text-orange-500 text-sm"></i>
              </div>
              <p class="font-bold text-orange-700 text-sm">⚠️ Conseils de sécurité — PetitesAnnoncesIvoire.com</p>
            </div>

            <p class="text-orange-800 text-sm font-semibold mb-2">🚨 Méfiez-vous des arnaques !</p>
            <p class="text-orange-700 text-xs mb-3 leading-relaxed">
              Ne payez jamais à l'avance sans avoir vu l'article en personne. Privilégiez toujours les rencontres dans un <strong>lieu public et sécurisé</strong> (marché, centre commercial, commissariat).
            </p>

            <div class="bg-orange-100 rounded-xl p-3 mb-3">
              <p class="text-orange-800 text-xs font-bold mb-1">🚫 Ne communiquez jamais :</p>
              <ul class="text-orange-700 text-xs space-y-0.5 list-disc list-inside">
                <li>Vos informations bancaires ou numéro de compte</li>
                <li>Votre code OTP ou code secret Mobile Money</li>
                <li>Vos mots de passe ou informations personnelles</li>
              </ul>
            </div>

            <div class="mb-3">
              <p class="text-orange-800 text-xs font-bold mb-1">💡 Nos conseils :</p>
              <ul class="text-orange-700 text-xs space-y-0.5 list-disc list-inside">
                <li>Vérifiez toujours l'article avant tout paiement</li>
                <li>Méfiez-vous des prix trop bas ou des offres trop belles</li>
                <li>Privilégiez le paiement en main propre à la livraison</li>
                <li>En cas de doute, signalez l'annonce via le bouton 🚩</li>
              </ul>
            </div>

            <div class="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
              <i class="fas fa-phone-alt text-red-500 text-sm mt-0.5 shrink-0"></i>
              <p class="text-red-700 text-xs leading-relaxed">
                <strong>En cas d'arnaque</strong>, contactez la <strong>Police Nationale de Côte d'Ivoire</strong> au <strong class="text-red-600">111</strong> ou la <strong>Direction de l'Informatique et des Traces Technologiques (DITT)</strong>.
              </p>
            </div>

            <p class="text-orange-500 text-xs italic text-center">
              <i class="fas fa-info-circle mr-1"></i>PetitesAnnoncesIvoire.com n'est pas responsable des transactions effectuées entre particuliers.
            </p>
          </div>

        </div>
      </div>`
  } catch {
    content.innerHTML = `<div class="text-center py-16 text-red-400"><i class="fas fa-exclamation-triangle text-4xl mb-4"></i><p>Annonce introuvable</p></div>`
  }
}

// ── Galerie swipeable ─────────────────────────────────────────
function galleryGoto(idx) {
  const g = document.getElementById('listing-gallery')
  if (!g) return
  const total = parseInt(g.dataset.total)
  idx = (idx + total) % total
  g.dataset.idx = idx
  const slides = g.querySelectorAll('.gallery-slide')
  slides.forEach((s, i) => s.style.display = i === idx ? 'flex' : 'none')
  const dots = g.querySelectorAll('.gallery-dot')
  dots.forEach((d, i) => {
    d.classList.toggle('bg-white', i === idx)
    d.classList.toggle('scale-125', i === idx)
    d.classList.toggle('bg-white/50', i !== idx)
  })
  const counter = document.getElementById('gallery-counter')
  if (counter) counter.textContent = idx + 1
}
function galleryNext() {
  const g = document.getElementById('listing-gallery')
  if (!g) return
  galleryGoto(parseInt(g.dataset.idx) + 1)
}
function galleryPrev() {
  const g = document.getElementById('listing-gallery')
  if (!g) return
  galleryGoto(parseInt(g.dataset.idx) - 1)
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
// ── Recherche avancée avec auto-complétion & historique ───────
const SEARCH_HISTORY_KEY = 'pai_search_history'
const MAX_HISTORY        = 8
let searchDebounceTimer  = null
let searchSelectedIndex  = -1
let searchAllSuggestions = []

function getSearchHistory() {
  try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]') } catch { return [] }
}

function saveToSearchHistory(query) {
  if (!query || query.length < 2) return
  let history = getSearchHistory().filter(h => h.toLowerCase() !== query.toLowerCase())
  history.unshift(query)
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY)
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history))
}

function clearSearchHistory() {
  localStorage.removeItem(SEARCH_HISTORY_KEY)
  hideSearchDropdown()
  showToast('Historique effacé')
}

function clearSearch() {
  const input = document.getElementById('search-input')
  input.value = ''
  document.getElementById('search-clear-btn').classList.add('hidden')
  hideSearchDropdown()
  input.focus()
}

function hideSearchDropdown() {
  const dd = document.getElementById('search-dropdown')
  if (dd) dd.classList.add('hidden')
  searchSelectedIndex = -1
}

function onSearchFocus() {
  const input = document.getElementById('search-input')
  renderSearchDropdown(input.value.trim())
}

function onSearchInput(val) {
  const clearBtn = document.getElementById('search-clear-btn')
  if (clearBtn) clearBtn.classList.toggle('hidden', !val)

  clearTimeout(searchDebounceTimer)
  if (!val.trim()) {
    renderSearchDropdown('')
    return
  }
  searchDebounceTimer = setTimeout(() => {
    fetchSearchSuggestions(val.trim())
  }, 220)
}

async function fetchSearchSuggestions(query) {
  try {
    const res = await fetch(`/api/listings?search=${encodeURIComponent(query)}&limit=6&offset=0`)
    const data = await res.json()
    const titles = (data.listings || []).map(l => l.title)
    renderSearchDropdown(query, titles)
  } catch {
    renderSearchDropdown(query, [])
  }
}

function renderSearchDropdown(query, suggestions = []) {
  const dd       = document.getElementById('search-dropdown')
  const histSec  = document.getElementById('search-history-section')
  const histList = document.getElementById('search-history-list')
  const suggSec  = document.getElementById('search-suggestions-section')
  const suggList = document.getElementById('search-suggestions-list')
  const quickSec = document.getElementById('search-quick-section')
  const quickList= document.getElementById('search-quick-list')
  if (!dd) return

  searchAllSuggestions = []
  searchSelectedIndex  = -1

  // ── Historique ──────────────────────────────────────────────
  const history = getSearchHistory().filter(h =>
    !query || h.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5)

  if (history.length && !query) {
    histSec.classList.remove('hidden')
    histList.innerHTML = history.map((h, i) => `
      <button onclick="selectSearchSuggestion('${escHtml(h)}')"
        class="search-dd-item w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 flex items-center gap-3 transition"
        data-idx="${searchAllSuggestions.length + i}">
        <i class="fas fa-history text-gray-300 w-4 shrink-0"></i>
        <span class="truncate">${escHtml(h)}</span>
        <i class="fas fa-arrow-up-left text-gray-200 ml-auto shrink-0 text-xs"></i>
      </button>`).join('')
    searchAllSuggestions.push(...history)
  } else {
    histSec.classList.add('hidden')
  }

  // ── Suggestions dynamiques ───────────────────────────────────
  if (suggestions.length) {
    suggSec.classList.remove('hidden')
    suggList.innerHTML = suggestions.map((s, i) => `
      <button onclick="selectSearchSuggestion('${escHtml(s)}')"
        class="search-dd-item w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 flex items-center gap-3 transition"
        data-idx="${searchAllSuggestions.length + i}">
        <i class="fas fa-search text-primary-300 w-4 shrink-0"></i>
        <span class="truncate">${highlightMatch(s, query)}</span>
      </button>`).join('')
    searchAllSuggestions.push(...suggestions)
  } else {
    suggSec.classList.add('hidden')
  }

  // ── Accès rapide (catégories + villes si pas de query) ────────
  if (!query) {
    quickSec.classList.remove('hidden')
    const quickItems = [
      ...CATEGORIES.slice(0, 5).map(c => ({ label: `${c.emoji} ${c.name}`, type: 'cat', val: c.name })),
      ...CITIES.slice(0, 4).map(c => ({ label: `${c.icon} ${c.name}`, type: 'city', val: c.name })),
    ]
    quickList.innerHTML = `<div class="flex flex-wrap gap-1.5 px-4 pb-3">` +
      quickItems.map(item => `
        <button onclick="${item.type === 'cat' ? `filterByCategory('${escHtml(item.val)}')` : `filterByCity('${escHtml(item.val)}')`};hideSearchDropdown()"
          class="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-primary-50 border border-gray-200 hover:border-primary-300 rounded-full text-xs text-gray-600 hover:text-primary-600 transition font-medium">
          ${escHtml(item.label)}
        </button>`).join('') + `</div>`
  } else {
    quickSec.classList.add('hidden')
  }

  const hasContent = history.length || suggestions.length || !query
  dd.classList.toggle('hidden', !hasContent)
}

function highlightMatch(text, query) {
  if (!query) return escHtml(text)
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return escHtml(text)
  return escHtml(text.slice(0, idx)) +
    `<strong class="text-primary-600">${escHtml(text.slice(idx, idx + query.length))}</strong>` +
    escHtml(text.slice(idx + query.length))
}

function selectSearchSuggestion(val) {
  const input = document.getElementById('search-input')
  if (input) input.value = val
  const clearBtn = document.getElementById('search-clear-btn')
  if (clearBtn) clearBtn.classList.remove('hidden')
  hideSearchDropdown()
  searchListings()
}

function onSearchKeydown(e) {
  const items = document.querySelectorAll('.search-dd-item')
  if (!items.length) {
    if (e.key === 'Enter') searchListings()
    return
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    searchSelectedIndex = Math.min(searchSelectedIndex + 1, items.length - 1)
    updateSearchSelection(items)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    searchSelectedIndex = Math.max(searchSelectedIndex - 1, -1)
    updateSearchSelection(items)
  } else if (e.key === 'Enter') {
    if (searchSelectedIndex >= 0 && searchAllSuggestions[searchSelectedIndex]) {
      selectSearchSuggestion(searchAllSuggestions[searchSelectedIndex])
    } else {
      searchListings()
    }
  } else if (e.key === 'Escape') {
    hideSearchDropdown()
  }
}

function updateSearchSelection(items) {
  items.forEach((item, i) => {
    item.classList.toggle('bg-primary-50', i === searchSelectedIndex)
    item.classList.toggle('text-primary-600', i === searchSelectedIndex)
  })
  if (searchSelectedIndex >= 0 && searchAllSuggestions[searchSelectedIndex]) {
    const input = document.getElementById('search-input')
    if (input) input.value = searchAllSuggestions[searchSelectedIndex]
  }
}

function searchListings() {
  const q = document.getElementById('search-input').value.trim()
  hideSearchDropdown()
  if (!q) return
  saveToSearchHistory(q)
  document.getElementById('listings-title').textContent = `Résultats pour "${q}"`
  document.getElementById('btn-reset-filter').classList.remove('hidden')
  loadListings(q, activeFilter || '')
  window.scrollTo({ top: 600, behavior: 'smooth' })
}

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
// ── Gestion multi-images (nouvelle annonce) ──────────────────
function resetNewListingForm() {
  pendingImages = []
  renderPendingImages()
  const zone = document.getElementById('img-upload-zone')
  if (zone) zone.classList.remove('hidden')
  const input = document.getElementById('nl-image')
  if (input) input.value = ''
  const infoEl = document.getElementById('img-info')
  if (infoEl) infoEl.textContent = ''
}

// Compresser une image File → data URL
function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject('type'); return }
    if (file.size > 5*1024*1024) { reject('size'); return }
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const MAX=1200; let w=img.width, h=img.height
        if (w>MAX||h>MAX) { if(w>h){h=Math.round(h*MAX/w);w=MAX}else{w=Math.round(w*MAX/h);h=MAX} }
        const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h
        canvas.getContext('2d').drawImage(img,0,0,w,h)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

// Rendre la grille de préviews
function renderPendingImages() {
  const grid = document.getElementById('img-previews-grid')
  const zone = document.getElementById('img-upload-zone')
  const info = document.getElementById('img-info')
  if (!grid) return
  grid.innerHTML = pendingImages.map((data, i) => `
    <div class="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50" style="aspect-ratio:1">
      <img src="${data}" class="w-full h-full object-cover" />
      ${i===0 ? '<span class="absolute bottom-1 left-1 text-xs bg-primary-600 text-white px-1.5 py-0.5 rounded-lg font-medium">Principale</span>' : ''}
      <button type="button" onclick="removeImageAt(${i})"
        class="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow text-xs opacity-0 group-hover:opacity-100 transition">
        <i class="fas fa-times"></i>
      </button>
    </div>`).join('')
  if (zone) zone.classList.toggle('hidden', pendingImages.length >= 5)
  if (info) info.textContent = pendingImages.length > 0 ? `${pendingImages.length}/5 photo${pendingImages.length>1?'s':''} sélectionnée${pendingImages.length>1?'s':''}` : ''
}

function removeImageAt(index) {
  pendingImages.splice(index, 1)
  renderPendingImages()
  const input = document.getElementById('nl-image')
  if (input) input.value = ''
}

async function handleImagesSelect(input) {
  const files = Array.from(input.files || [])
  const remaining = 5 - pendingImages.length
  const toProcess = files.slice(0, remaining)
  for (const file of toProcess) {
    try {
      const compressed = await compressImage(file)
      if (pendingImages.length < 5) pendingImages.push(compressed)
    } catch(err) {
      if (err === 'size') showToast('Image trop grande. Maximum 5 Mo.', 'error')
      else if (err === 'type') showToast('Format non supporté. Utilisez JPG, PNG ou WEBP.', 'error')
    }
  }
  renderPendingImages()
  input.value = ''
}

async function handleDropImages(files) {
  const fileArr = Array.from(files || [])
  const toProcess = fileArr.slice(0, 5 - pendingImages.length)
  for (const file of toProcess) {
    try {
      const compressed = await compressImage(file)
      if (pendingImages.length < 5) pendingImages.push(compressed)
    } catch {}
  }
  renderPendingImages()
}

async function handleNewListing(e) {
  e.preventDefault()
  if (!authToken) { showPage('login'); return }
  const errEl = document.getElementById('nl-error'); errEl.classList.add('hidden')
  const title=document.getElementById('nl-title').value.trim(), category=document.getElementById('nl-category').value
  const price=document.getElementById('nl-price').value, description=document.getElementById('nl-description').value.trim()
  const location=document.getElementById('nl-location').value, contact=document.getElementById('nl-contact').value.trim()
  const btn=e.target.querySelector('[type="submit"]'); btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin mr-2"></i>Publication...'
  try {
    const res=await fetch('/api/listings',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${authToken}`},body:JSON.stringify({title,category,price:price?parseFloat(price):null,description,location,contact,images:pendingImages})})
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

// ── WhatsApp & Partage ────────────────────────────────────────
function formatPhoneForWA(phone) {
  // Nettoyer le numéro : garder uniquement les chiffres et le +
  let p = String(phone).replace(/[\s\-().]/g, '')
  if (p.startsWith('00')) p = '+' + p.slice(2)
  if (!p.startsWith('+') && !p.startsWith('225')) p = '225' + p
  return p.replace(/^\+/, '')
}

function openWhatsApp(contact, title) {
  const phone = formatPhoneForWA(contact)
  const msg = encodeURIComponent(`Bonjour, je suis intéressé par votre annonce "${title}" sur PetitesAnnoncesIvoire.com`)
  window.open(`https://wa.me/${phone}?text=${msg}`, '_blank', 'noopener')
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    showToast('Lien copié ! 🔗')
  }).catch(() => {
    showToast('Impossible de copier', 'error')
  })
}

// ── Signalement ───────────────────────────────────────────────
let currentReportListingId = null

function openReportModal(listingId) {
  if (!authToken) { showPage('login'); return }
  currentReportListingId = listingId
  document.getElementById('report-reason').value = ''
  document.getElementById('report-details').value = ''
  document.getElementById('report-error').classList.add('hidden')
  document.getElementById('modal-report').classList.remove('hidden')
}
function closeReportModal() {
  document.getElementById('modal-report').classList.add('hidden')
}

async function submitReport() {
  const reason  = document.getElementById('report-reason').value
  const details = document.getElementById('report-details').value.trim()
  const errEl   = document.getElementById('report-error')
  errEl.classList.add('hidden')
  if (!reason) { errEl.textContent = 'Veuillez choisir un motif'; errEl.classList.remove('hidden'); return }
  try {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ listing_id: currentReportListingId, reason, details })
    })
    const d = await res.json()
    if (!res.ok) { errEl.textContent = d.error; errEl.classList.remove('hidden'); return }
    closeReportModal()
    showToast('Signalement envoyé, merci ! 🚩')
  } catch { errEl.textContent = 'Erreur serveur'; errEl.classList.remove('hidden') }
}

// ── Modifier une annonce ──────────────────────────────────────
async function showEditListing(id) {
  const content = document.getElementById('listing-detail-content')
  content.innerHTML = `<div class="text-center py-16 text-gray-400"><i class="fas fa-spinner fa-spin text-3xl"></i></div>`
  try {
    const res = await fetch(`/api/listings/${id}`)
    const { listing: l } = await res.json()

    // Initialiser le tableau d'images d'édition
    window._editImages = l.images ? l.images.map(i => i.data) : (l.image_data ? [l.image_data] : [])
    window._editImagesChanged = false

    content.innerHTML = `
      <div class="bg-white rounded-2xl shadow-sm p-8 max-w-2xl mx-auto">
        <div class="flex items-center gap-3 mb-6">
          <button onclick="showListing(${id})" class="text-gray-400 hover:text-gray-600"><i class="fas fa-arrow-left"></i></button>
          <h2 class="text-xl font-bold text-gray-800">Modifier l'annonce</h2>
        </div>
        <form onsubmit="submitEditListing(event,${id})" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
            <input type="text" id="edit-title" required value="${escHtml(l.title)}" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
              <select id="edit-category" required class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
                ${['Véhicules','Immobilier','Électronique','Mode','Maison','Alimentation','Loisirs','Emploi','Services','Agriculture','Autres'].map(cat =>
                  `<option value="${cat}" ${l.category===cat?'selected':''}>${cat}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Prix (FCFA)</label>
              <input type="number" id="edit-price" min="0" value="${l.price ?? ''}" placeholder="Ex: 50000" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea id="edit-description" required rows="4" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none">${escHtml(l.description)}</textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Ville / Quartier</label>
              <input type="text" id="edit-location" value="${escHtml(l.location||'')}" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Contact</label>
              <input type="text" id="edit-contact" value="${escHtml(l.contact||'')}" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <!-- Modifier les photos (max 5) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              <i class="fas fa-camera mr-1 text-gray-400"></i>Modifier les photos
              <span class="text-gray-400 font-normal text-xs">(jusqu'à 5 photos)</span>
            </label>
            <div id="edit-img-grid" class="grid grid-cols-3 gap-2 mb-2"></div>
            <div id="edit-upload-zone" onclick="document.getElementById('edit-image').click()"
              ondragover="event.preventDefault();this.classList.add('border-primary-400','bg-primary-50')"
              ondragleave="this.classList.remove('border-primary-400','bg-primary-50')"
              ondrop="event.preventDefault();this.classList.remove('border-primary-400','bg-primary-50');handleEditDropImages(event.dataTransfer.files)"
              class="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition">
              <i class="fas fa-cloud-upload-alt text-2xl text-gray-300 mb-1"></i>
              <p class="text-sm text-gray-400">Cliquer ou glisser pour ajouter des photos</p>
            </div>
            <input type="file" id="edit-image" accept="image/*" multiple class="hidden" onchange="handleEditImagesSelect(this)" />
            <p id="edit-img-info" class="text-xs text-gray-400 mt-1 text-right"></p>
          </div>
          <div id="edit-error" class="hidden text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg"></div>
          <div class="flex gap-3 pt-2">
            <button type="button" onclick="showListing(${id})" class="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition text-sm">Annuler</button>
            <button type="submit" class="flex-1 bg-primary-600 text-white py-2.5 rounded-xl font-semibold hover:bg-primary-700 transition text-sm"><i class="fas fa-save mr-2"></i>Enregistrer</button>
          </div>
        </form>
      </div>`
    renderEditImages()
  } catch {
    content.innerHTML = `<div class="text-center py-12 text-red-400">Erreur de chargement</div>`
  }
}

function renderEditImages() {
  const grid = document.getElementById('edit-img-grid')
  const zone = document.getElementById('edit-upload-zone')
  const info = document.getElementById('edit-img-info')
  if (!grid) return
  const imgs = window._editImages || []
  grid.innerHTML = imgs.map((data, i) => `
    <div class="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50" style="aspect-ratio:1">
      <img src="${data}" class="w-full h-full object-cover" />
      ${i===0 ? '<span class="absolute bottom-1 left-1 text-xs bg-primary-600 text-white px-1.5 py-0.5 rounded-lg font-medium">Principale</span>' : ''}
      <button type="button" onclick="removeEditImageAt(${i})"
        class="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow text-xs opacity-0 group-hover:opacity-100 transition">
        <i class="fas fa-times"></i>
      </button>
    </div>`).join('')
  if (zone) zone.classList.toggle('hidden', imgs.length >= 5)
  if (info) info.textContent = imgs.length > 0 ? `${imgs.length}/5 photo${imgs.length>1?'s':''} — modifiée${imgs.length>1?'s':''}` : 'Aucune photo'
}

function removeEditImageAt(index) {
  window._editImages.splice(index, 1)
  window._editImagesChanged = true
  renderEditImages()
  const inp = document.getElementById('edit-image'); if (inp) inp.value = ''
}

async function handleEditImagesSelect(input) {
  const files = Array.from(input.files || [])
  const remaining = 5 - (window._editImages || []).length
  const toProcess = files.slice(0, remaining)
  for (const file of toProcess) {
    try {
      const compressed = await compressImage(file)
      if ((window._editImages || []).length < 5) {
        window._editImages.push(compressed)
        window._editImagesChanged = true
      }
    } catch(err) {
      if (err === 'size') showToast('Image trop grande. Maximum 5 Mo.', 'error')
    }
  }
  renderEditImages()
  input.value = ''
}

async function handleEditDropImages(files) {
  const fileArr = Array.from(files || [])
  const toProcess = fileArr.slice(0, 5 - (window._editImages || []).length)
  for (const file of toProcess) {
    try {
      const compressed = await compressImage(file)
      if ((window._editImages || []).length < 5) {
        window._editImages.push(compressed)
        window._editImagesChanged = true
      }
    } catch {}
  }
  renderEditImages()
}

async function submitEditListing(e, id) {
  e.preventDefault()
  if (!authToken) { showPage('login'); return }
  const errEl = document.getElementById('edit-error'); errEl.classList.add('hidden')
  const title       = document.getElementById('edit-title').value.trim()
  const category    = document.getElementById('edit-category').value
  const price       = document.getElementById('edit-price').value
  const description = document.getElementById('edit-description').value.trim()
  const location    = document.getElementById('edit-location').value.trim()
  const contact     = document.getElementById('edit-contact').value.trim()

  const btn = e.target.querySelector('[type="submit"]'); btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin mr-2"></i>Enregistrement...'
  try {
    const body = { title, category, price: price ? parseFloat(price) : null, description, location, contact }
    // Si les images ont changé, on envoie le tableau complet (ou vide)
    if (window._editImagesChanged) {
      body.images = window._editImages || []
    }
    const res = await fetch(`/api/listings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify(body)
    })
    const d = await res.json()
    if (!res.ok) { errEl.textContent = d.error; errEl.classList.remove('hidden'); return }
    showToast('Annonce mise à jour ! ✅')
    showListing(id)
  } catch { errEl.textContent = 'Erreur serveur'; errEl.classList.remove('hidden') }
  finally { btn.disabled=false; btn.innerHTML='<i class="fas fa-save mr-2"></i>Enregistrer' }
}

// ── Mode sombre ───────────────────────────────────────────────
function initDarkMode() {
  const saved = localStorage.getItem('darkMode')
  if (saved === 'true') enableDarkMode(false)
  updateDarkModeBtn()
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.contains('dark')
  if (isDark) disableDarkMode()
  else enableDarkMode()
}

function enableDarkMode(save = true) {
  document.documentElement.classList.add('dark')
  document.body.classList.add('dark-mode')
  if (save) localStorage.setItem('darkMode', 'true')
  updateDarkModeBtn()
}

function disableDarkMode() {
  document.documentElement.classList.remove('dark')
  document.body.classList.remove('dark-mode')
  localStorage.setItem('darkMode', 'false')
  updateDarkModeBtn()
}

function updateDarkModeBtn() {
  const btn = document.getElementById('dark-mode-btn')
  if (!btn) return
  const isDark = document.documentElement.classList.contains('dark')
  btn.innerHTML = isDark
    ? '<i class="fas fa-sun text-yellow-400"></i>'
    : '<i class="fas fa-moon text-gray-500"></i>'
  btn.title = isDark ? 'Mode clair' : 'Mode sombre'
}

// ── Administration ─────────────────────────────────────────────
function adminTab(tab) {
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('bg-white','shadow','text-primary-600'))
  const active = document.getElementById(`admin-tab-${tab}`)
  if (active) active.classList.add('bg-white','shadow','text-primary-600')
  if (tab==='stats')    loadAdminStats()
  if (tab==='listings') loadAdminListings()
  if (tab==='users')    loadAdminUsers()
  if (tab==='reports')  loadAdminReports()
}

async function loadAdminReports() {
  const content = document.getElementById('admin-content')
  content.innerHTML = `<div class="text-center py-12 text-gray-400"><i class="fas fa-spinner fa-spin text-3xl"></i></div>`
  try {
    const res = await fetch('/api/reports/admin', { headers: { Authorization: `Bearer ${authToken}` } })
    if (!res.ok) { content.innerHTML=`<div class="text-center py-12 text-red-400">Accès refusé</div>`; return }
    const { reports } = await res.json()
    if (!reports.length) {
      content.innerHTML = `<div class="text-center py-12 text-gray-400"><i class="fas fa-check-circle text-4xl mb-4 text-green-400"></i><p class="font-medium">Aucun signalement en attente</p></div>`
      return
    }
    const reasonLabels = { arnaque:'Arnaque/Fraude', contenu_inapproprie:'Contenu inapproprié', doublon:'Doublon', prix_abusif:'Prix abusif', fausses_infos:'Fausses infos', autre:'Autre' }
    content.innerHTML = `
      <div class="bg-white rounded-xl border overflow-hidden">
        <div class="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 class="font-bold text-gray-800">Signalements en attente (${reports.length})</h3>
        </div>
        <div class="divide-y divide-gray-100">
          ${reports.map(r=>`
            <div class="flex items-start gap-3 p-4 hover:bg-gray-50" id="report-row-${r.id}">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                  <span class="text-sm font-semibold text-gray-800 truncate">${escHtml(r.listing_title)}</span>
                  <span class="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">${r.total_reports} signalement(s)</span>
                  <span class="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">${reasonLabels[r.reason]||r.reason}</span>
                </div>
                ${r.details ? `<p class="text-xs text-gray-500 mb-1">${escHtml(r.details)}</p>` : ''}
                <p class="text-xs text-gray-400">Signalé par ${escHtml(r.reporter_name)} · ${timeAgo(r.created_at)}</p>
              </div>
              <div class="flex gap-1.5 shrink-0">
                <button onclick="adminResolveReport(${r.id})" class="text-xs text-green-600 hover:text-green-700 px-2.5 py-1.5 rounded-lg hover:bg-green-50 transition" title="Ignorer / Résoudre">
                  <i class="fas fa-check"></i>
                </button>
                <button onclick="adminDeleteReportedListing(${r.listing_id},${r.id})" class="text-xs text-red-500 hover:text-red-700 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition" title="Supprimer l'annonce">
                  <i class="fas fa-trash"></i>
                </button>
                <button onclick="showListing(${r.listing_id})" class="text-xs text-primary-600 hover:text-primary-700 px-2.5 py-1.5 rounded-lg hover:bg-primary-50 transition" title="Voir l'annonce">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>`).join('')}
        </div>
      </div>`
  } catch { content.innerHTML=`<div class="text-center py-12 text-red-400">Erreur</div>` }
}

async function adminResolveReport(id) {
  try {
    await fetch(`/api/reports/${id}/resolve`, { method:'PUT', headers:{ Authorization:`Bearer ${authToken}` } })
    document.getElementById(`report-row-${id}`)?.remove()
    showToast('Signalement résolu ✓')
  } catch { showToast('Erreur','error') }
}

async function adminDeleteReportedListing(listingId, reportId) {
  if (!confirm('Supprimer cette annonce signalée ?')) return
  try {
    const res = await fetch(`/api/reports/${listingId}/delete-listing`, { method:'DELETE', headers:{ Authorization:`Bearer ${authToken}` } })
    if (res.ok) { showToast('Annonce supprimée'); loadAdminReports() }
    else showToast('Erreur','error')
  } catch { showToast('Erreur','error') }
}

async function loadAdminStats() {
  const content = document.getElementById('admin-content')
  content.innerHTML = `<div class="text-center py-12 text-gray-400"><i class="fas fa-spinner fa-spin text-3xl"></i></div>`
  try {
    const res = await fetch('/api/profile/admin/stats', { headers:{Authorization:`Bearer ${authToken}`} })
    if (!res.ok) { content.innerHTML=`<div class="text-center py-12 text-red-400">Accès refusé</div>`; return }
    const raw = await res.json(); const stats = raw.stats || {}; const top_categories = raw.top_categories || []; const latest_users = raw.latest_users || []; const listings_by_day = raw.listings_by_day || []; const users_by_day = raw.users_by_day || []; const top_listings = Array.isArray(raw.top_listings) ? raw.top_listings.filter(l => l && l.id) : []

    // Préparer les données pour les graphiques (30 derniers jours)
    const last30 = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      last30.push(d.toISOString().split('T')[0])
    }
    const listingsMap = Object.fromEntries((listings_by_day||[]).map(r => [r.day, r.count]))
    const usersMap    = Object.fromEntries((users_by_day||[]).map(r => [r.day, r.count]))
    const listingsData = last30.map(d => listingsMap[d] || 0)
    const usersData    = last30.map(d => usersMap[d] || 0)
    const labels       = last30.map(d => {
      const dt = new Date(d + 'T00:00:00')
      return dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    })

    content.innerHTML = `
      <!-- KPIs -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        ${[
          ['Utilisateurs',    stats.total_users,          'fa-users',    'blue',   `+${stats.new_users_today} aujourd'hui`],
          ['Annonces actives',stats.active_listings,      'fa-list',     'green',  `+${stats.new_listings_today} aujourd'hui`],
          ['Messages',        stats.total_messages,       'fa-envelope', 'purple', 'total échangés'],
          ['Favoris',         stats.total_favorites,      'fa-heart',    'red',    'total enregistrés'],
        ].map(([label,val,icon,color,sub])=>`
          <div class="bg-white rounded-xl border p-4">
            <div class="flex items-center justify-between mb-2">
              <div class="w-9 h-9 bg-${color}-100 rounded-xl flex items-center justify-center">
                <i class="fas ${icon} text-${color}-500 text-sm"></i>
              </div>
              <span class="text-xs text-gray-400">${sub}</span>
            </div>
            <div class="text-2xl font-bold text-gray-800">${val}</div>
            <p class="text-xs text-gray-500 mt-0.5">${label}</p>
          </div>`).join('')}
      </div>

      <!-- Graphiques -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Annonces par jour -->
        <div class="bg-white rounded-xl border p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-gray-800 text-sm"><i class="fas fa-chart-line text-primary-500 mr-2"></i>Annonces publiées (30j)</h3>
            <span class="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Total : ${stats.total_listings}</span>
          </div>
          <canvas id="chart-listings" height="120"></canvas>
        </div>
        <!-- Inscriptions par jour -->
        <div class="bg-white rounded-xl border p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-gray-800 text-sm"><i class="fas fa-user-plus text-accent-500 mr-2"></i>Inscriptions (30j)</h3>
            <span class="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Total : ${stats.total_users}</span>
          </div>
          <canvas id="chart-users" height="120"></canvas>
        </div>
      </div>

      <!-- Top annonces + Top catégories + Derniers inscrits -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Top annonces par favoris -->
        <div class="bg-white rounded-xl border p-5">
          <h3 class="font-bold text-gray-800 mb-4 text-sm"><i class="fas fa-fire text-orange-400 mr-2"></i>Top annonces</h3>
          <div class="space-y-3">
            ${(top_listings||[]).length ? (top_listings||[]).map((l,i)=>`
              <div onclick="showListing(${l.id})" class="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -mx-2 transition">
                <div class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm shrink-0
                  ${i===0?'bg-yellow-100 text-yellow-600':i===1?'bg-gray-100 text-gray-500':i===2?'bg-orange-100 text-orange-500':'bg-gray-50 text-gray-400'}">
                  ${i+1}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-800 truncate">${escHtml(l.title)}</p>
                  <p class="text-xs text-gray-400">${l.category} · ${escHtml(l.author_name||'')}</p>
                </div>
                <div class="flex items-center gap-1 text-xs text-red-400 shrink-0">
                  <i class="fas fa-heart text-xs"></i>${l.favorites_count}
                </div>
              </div>`).join('') : `<p class="text-sm text-gray-400 text-center py-4">Pas encore de données</p>`}
          </div>
        </div>

        <!-- Top catégories -->
        <div class="bg-white rounded-xl border p-5">
          <h3 class="font-bold text-gray-800 mb-4 text-sm"><i class="fas fa-th-large text-primary-500 mr-2"></i>Top catégories</h3>
          <div class="space-y-3">
            ${(top_categories||[]).map(c=>{
              const cat = CATEGORIES.find(k => k.name === c.category)
              const maxCount = Math.max(...(top_categories||[]).map(x=>x.count), 1)
              return `
              <div class="flex items-center gap-3">
                <span class="text-lg w-6 text-center shrink-0">${cat?cat.emoji:'📦'}</span>
                <div class="flex-1">
                  <div class="flex justify-between mb-1">
                    <span class="text-xs text-gray-700 font-medium">${c.category}</span>
                    <span class="text-xs font-bold text-gray-600">${c.count}</span>
                  </div>
                  <div class="bg-gray-100 rounded-full h-1.5">
                    <div class="bg-primary-500 h-1.5 rounded-full transition-all" style="width:${Math.round(c.count/maxCount*100)}%"></div>
                  </div>
                </div>
              </div>`}).join('')}
          </div>
        </div>

        <!-- Derniers inscrits -->
        <div class="bg-white rounded-xl border p-5">
          <h3 class="font-bold text-gray-800 mb-4 text-sm"><i class="fas fa-user-clock text-blue-400 mr-2"></i>Derniers inscrits</h3>
          <div class="space-y-2">
            ${(latest_users||[]).map(u=>`
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0 overflow-hidden">
                  ${u.avatar ? `<img src="${u.avatar}" class="w-full h-full object-cover"/>` : `<i class="fas fa-user text-primary-400 text-xs"></i>`}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-800 truncate">${escHtml(u.name)}</p>
                  <p class="text-xs text-gray-400 truncate">${escHtml(u.email)}</p>
                </div>
                <span class="text-xs text-gray-300 shrink-0">${timeAgo(u.created_at)}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>`

    // ── Charger Chart.js et dessiner les graphiques ────────────
    await loadChartJs()
    drawLineChart('chart-listings', labels, listingsData, 'Annonces', '#ea580c', '#fff7ed')
    drawLineChart('chart-users',    labels, usersData,    'Inscriptions', '#22c55e', '#f0fdf4')

  } catch(e) { content.innerHTML=`<div class="text-center py-12 text-red-400">Erreur : ${e.message}</div>` }
}

// Charger Chart.js dynamiquement si pas encore chargé
function loadChartJs() {
  return new Promise((resolve) => {
    if (window.Chart) { resolve(); return }
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js'
    s.onload = resolve
    document.head.appendChild(s)
  })
}

function drawLineChart(canvasId, labels, data, label, color, bgColor) {
  const canvas = document.getElementById(canvasId)
  if (!canvas) return
  // Détruire un éventuel graphique précédent
  if (canvas._chartInstance) canvas._chartInstance.destroy()

  // Afficher seulement 1 label sur 5 pour ne pas surcharger l'axe X
  const sparseLabels = labels.map((l, i) => i % 5 === 0 ? l : '')

  canvas._chartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: sparseLabels,
      datasets: [{
        label,
        data,
        borderColor: color,
        backgroundColor: bgColor,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: color,
        fill: true,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => labels[items[0].dataIndex],
            label: (item) => `${item.dataset.label} : ${item.raw}`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#9ca3af' } },
        y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 }, color: '#9ca3af' }, grid: { color: '#f3f4f6' } }
      }
    }
  })
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
