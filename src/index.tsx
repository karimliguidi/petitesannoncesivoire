import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { authRoutes } from './routes/auth'
import { listingsRoutes } from './routes/listings'
import { userRoutes } from './routes/users'
import { messagesRoutes } from './routes/messages'
import { favoritesRoutes } from './routes/favorites'
import { notificationsRoutes } from './routes/notifications'
import { profileRoutes } from './routes/profile'

export type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())
app.use('/static/*', serveStatic({ root: './' }))

app.route('/api/auth', authRoutes)
app.route('/api/listings', listingsRoutes)
app.route('/api/users', userRoutes)
app.route('/api/messages', messagesRoutes)
app.route('/api/favorites', favoritesRoutes)
app.route('/api/notifications', notificationsRoutes)
app.route('/api/profile', profileRoutes)

// Route principale → SPA
app.get('*', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PetitesAnnoncesIvoire.com — Achetez, Vendez, Échangez en Côte d'Ivoire</title>
  <meta name="description" content="Le site de petites annonces numéro 1 en Côte d'Ivoire." />
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/static/styles.css" />
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: { 50:'#fff7ed',100:'#ffedd5',200:'#fed7aa',300:'#fdba74',400:'#fb923c',500:'#f97316',600:'#ea580c',700:'#c2410c',800:'#9a3412' },
            accent:  { 400:'#4ade80',500:'#22c55e',600:'#16a34a' }
          }
        }
      }
    }
  </script>
</head>
<body class="bg-gray-50 min-h-screen">

  <!-- HEADER -->
  <header class="bg-white shadow-sm sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
      <a href="#" onclick="showPage('home')" class="flex items-center gap-2 font-bold text-lg shrink-0">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow">
          <i class="fas fa-tag text-white text-sm"></i>
        </div>
        <span class="text-primary-600 hidden sm:inline">PetitesAnnonces<span class="text-accent-500">Ivoire</span><span class="text-gray-400 font-normal text-sm">.com</span></span>
      </a>
      <nav class="flex items-center gap-1.5" id="nav-menu">
        <button onclick="showPage('home')" class="text-gray-600 hover:text-primary-600 text-sm px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition hidden md:flex items-center gap-1">
          <i class="fas fa-home"></i>
        </button>
        <div id="nav-guest" class="flex gap-1.5">
          <button onclick="showPage('login')" class="text-gray-600 hover:text-primary-600 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">Connexion</button>
          <button onclick="showPage('register')" class="bg-primary-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-primary-700 transition shadow-sm">S'inscrire</button>
        </div>
        <div id="nav-auth" class="hidden flex items-center gap-1.5">
          <button onclick="showPage('new-listing')" class="bg-accent-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-accent-600 transition shadow-sm">
            <i class="fas fa-plus mr-1"></i><span class="hidden sm:inline">Publier</span>
          </button>
          <!-- Favoris -->
          <button onclick="showPage('favorites')" class="relative text-gray-600 hover:text-red-500 text-sm px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition" title="Mes favoris">
            <i class="fas fa-heart"></i>
          </button>
          <!-- Messages -->
          <button onclick="showPage('messages')" class="relative text-gray-600 hover:text-primary-600 text-sm px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition" title="Messages">
            <i class="fas fa-envelope"></i>
            <span id="badge-messages" class="hidden absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold"></span>
          </button>
          <!-- Notifications -->
          <button onclick="showPage('notifications')" class="relative text-gray-600 hover:text-primary-600 text-sm px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition" title="Notifications">
            <i class="fas fa-bell"></i>
            <span id="badge-notifs" class="hidden absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold"></span>
          </button>
          <!-- Profil dropdown -->
          <div class="relative">
            <button onclick="toggleProfileMenu()" class="flex items-center gap-2 text-gray-600 hover:text-primary-600 text-sm px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition">
              <div id="nav-avatar" class="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
                <i class="fas fa-user text-primary-500 text-xs"></i>
              </div>
              <span id="nav-username" class="hidden sm:inline font-medium max-w-20 truncate">Mon compte</span>
              <i class="fas fa-chevron-down text-xs"></i>
            </button>
            <div id="profile-menu" class="hidden absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-44 z-50">
              <button onclick="showPage('dashboard'); toggleProfileMenu()" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <i class="fas fa-tachometer-alt text-gray-400 w-4"></i>Tableau de bord
              </button>
              <button onclick="showPage('profile-edit'); toggleProfileMenu()" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <i class="fas fa-user-edit text-gray-400 w-4"></i>Mon profil
              </button>
              <button onclick="showPage('favorites'); toggleProfileMenu()" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <i class="fas fa-heart text-gray-400 w-4"></i>Mes favoris
              </button>
              <div id="nav-admin-link" class="hidden">
                <hr class="my-1 border-gray-100"/>
                <button onclick="showPage('admin'); toggleProfileMenu()" class="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2">
                  <i class="fas fa-shield-alt text-orange-400 w-4"></i>Administration
                </button>
              </div>
              <hr class="my-1 border-gray-100"/>
              <button onclick="logout()" class="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2">
                <i class="fas fa-sign-out-alt text-red-400 w-4"></i>Déconnexion
              </button>
            </div>
          </div>
        </div>
      </nav>
    </div>
  </header>

  <!-- MAIN -->
  <main class="max-w-7xl mx-auto px-4 py-6">

    <!-- PAGE: HOME -->
    <div id="page-home">
      <!-- Hero -->
      <div class="relative bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500 rounded-2xl p-8 mb-6 text-white text-center overflow-hidden">
        <div class="absolute inset-0 opacity-10">
          <div class="absolute -top-4 -left-4 w-32 h-32 bg-white rounded-full"></div>
          <div class="absolute -bottom-8 -right-8 w-48 h-48 bg-white rounded-full"></div>
        </div>
        <div class="relative z-10">
          <div class="flex items-center justify-center gap-2 mb-2">
            <span class="text-2xl">🇨🇮</span>
            <span class="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">Côte d'Ivoire</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold mb-2">La bonne affaire est près de chez toi !</h1>
          <p class="text-white/90 mb-5 text-sm">Abidjan, Bouaké, San-Pédro et partout en Côte d'Ivoire</p>
          <div class="flex max-w-2xl mx-auto gap-2">
            <input type="text" id="search-input" placeholder="Téléphone, moto, maison, emploi..." class="flex-1 px-4 py-3 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-white shadow-sm" />
            <button onclick="searchListings()" class="bg-white text-primary-600 hover:bg-gray-50 px-5 py-3 rounded-xl font-bold transition shadow-sm">
              <i class="fas fa-search"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Filtres avancés (collapsible) -->
      <div class="bg-white border border-gray-200 rounded-xl mb-5 overflow-hidden">
        <button onclick="toggleFilters()" class="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
          <span><i class="fas fa-sliders-h mr-2 text-primary-500"></i>Filtres avancés</span>
          <i id="filter-chevron" class="fas fa-chevron-down text-gray-400 transition-transform"></i>
        </button>
        <div id="filters-panel" class="hidden px-4 pb-4 border-t border-gray-100">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Catégorie</label>
              <select id="filter-category" class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none">
                <option value="">Toutes</option>
                <option value="Véhicules">🚗 Véhicules</option>
                <option value="Immobilier">🏠 Immobilier</option>
                <option value="Électronique">📱 Électronique</option>
                <option value="Mode">👗 Mode & Beauté</option>
                <option value="Maison">🛋️ Maison & Déco</option>
                <option value="Alimentation">🥘 Alimentation</option>
                <option value="Loisirs">⚽ Loisirs</option>
                <option value="Emploi">💼 Emploi</option>
                <option value="Services">🔧 Services</option>
                <option value="Agriculture">🌿 Agriculture</option>
                <option value="Autres">📦 Autres</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Ville</label>
              <select id="filter-location" class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none">
                <option value="">Toutes les villes</option>
                <option value="Abidjan">Abidjan</option>
                <option value="Bouaké">Bouaké</option>
                <option value="Yamoussoukro">Yamoussoukro</option>
                <option value="San-Pédro">San-Pédro</option>
                <option value="Korhogo">Korhogo</option>
                <option value="Daloa">Daloa</option>
                <option value="Man">Man</option>
                <option value="Gagnoa">Gagnoa</option>
                <option value="Abengourou">Abengourou</option>
                <option value="Grand-Bassam">Grand-Bassam</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Prix min (FCFA)</label>
              <input type="number" id="filter-min-price" placeholder="0" min="0" class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Prix max (FCFA)</label>
              <input type="number" id="filter-max-price" placeholder="Sans limite" min="0" class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none" />
            </div>
          </div>
          <div class="flex items-center gap-3 mt-3">
            <div class="flex items-center gap-2">
              <label class="text-xs font-medium text-gray-500">Trier par</label>
              <select id="filter-sort" class="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none">
                <option value="recent">Plus récentes</option>
                <option value="price_asc">Prix croissant</option>
                <option value="price_desc">Prix décroissant</option>
              </select>
            </div>
            <button onclick="applyFilters()" class="ml-auto bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-700 transition">
              <i class="fas fa-search mr-1"></i>Appliquer
            </button>
            <button onclick="resetFilters()" class="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition">
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      <!-- Villes populaires -->
      <div class="mb-5">
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2"><i class="fas fa-map-marker-alt mr-1 text-primary-400"></i>Villes populaires</p>
        <div class="flex flex-wrap gap-2" id="cities-grid"></div>
      </div>

      <!-- Catégories -->
      <div class="mb-6">
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2"><i class="fas fa-th-large mr-1 text-primary-400"></i>Catégories</p>
        <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-11 gap-2" id="categories-grid"></div>
      </div>

      <!-- Titre annonces -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold text-gray-800"><span id="listings-title">Toutes les annonces</span></h2>
        <button id="btn-reset-filter" onclick="resetFilter()" class="hidden text-sm text-primary-600 hover:underline flex items-center gap-1">
          <i class="fas fa-times"></i> Effacer
        </button>
      </div>

      <!-- Grille -->
      <div id="listings-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div class="col-span-full text-center text-gray-400 py-12"><i class="fas fa-spinner fa-spin text-3xl mb-3"></i></div>
      </div>

      <!-- Pagination -->
      <div id="pagination" class="flex justify-center gap-2 mt-6 hidden"></div>
    </div>

    <!-- PAGE: REGISTER -->
    <div id="page-register" class="hidden max-w-md mx-auto">
      <div class="bg-white rounded-2xl shadow-sm p-8">
        <div class="text-center mb-6">
          <div class="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3"><i class="fas fa-user-plus text-primary-600 text-xl"></i></div>
          <h2 class="text-2xl font-bold text-gray-800">Créer un compte</h2>
          <p class="text-gray-500 text-sm mt-1">Rejoins la communauté ivoirienne gratuitement</p>
        </div>
        <form onsubmit="handleRegister(event)" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
            <input type="text" id="reg-name" required placeholder="Kouamé Konan" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" id="reg-email" required placeholder="kouame@exemple.ci" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input type="password" id="reg-password" required minlength="6" placeholder="Au moins 6 caractères" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" autocomplete="new-password" />
          </div>
          <div id="reg-error" class="hidden text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg"></div>
          <button type="submit" class="w-full bg-primary-600 text-white py-2.5 rounded-xl font-semibold hover:bg-primary-700 transition text-sm">Créer mon compte</button>
        </form>
        <p class="text-center text-sm text-gray-500 mt-5">Déjà inscrit ? <button onclick="showPage('login')" class="text-primary-600 font-medium hover:underline">Se connecter</button></p>
      </div>
    </div>

    <!-- PAGE: LOGIN -->
    <div id="page-login" class="hidden max-w-md mx-auto">
      <div class="bg-white rounded-2xl shadow-sm p-8">
        <div class="text-center mb-6">
          <div class="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3"><i class="fas fa-sign-in-alt text-primary-600 text-xl"></i></div>
          <h2 class="text-2xl font-bold text-gray-800">Connexion</h2>
          <p class="text-gray-500 text-sm mt-1">Bon retour parmi nous ! 🇨🇮</p>
        </div>
        <form onsubmit="handleLogin(event)" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" id="login-email" required placeholder="kouame@exemple.ci" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input type="password" id="login-password" required placeholder="••••••••" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" autocomplete="current-password" />
          </div>
          <div id="login-error" class="hidden text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg"></div>
          <button type="submit" class="w-full bg-primary-600 text-white py-2.5 rounded-xl font-semibold hover:bg-primary-700 transition text-sm">Se connecter</button>
        </form>
        <p class="text-center text-sm text-gray-500 mt-5">Pas encore inscrit ? <button onclick="showPage('register')" class="text-primary-600 font-medium hover:underline">Créer un compte</button></p>
      </div>
    </div>

    <!-- PAGE: DASHBOARD -->
    <div id="page-dashboard" class="hidden">
      <div class="flex items-center justify-between mb-6">
        <div><h2 class="text-2xl font-bold text-gray-800">Tableau de bord</h2><p class="text-gray-500 text-sm mt-1">Gérez vos annonces</p></div>
        <button onclick="showPage('new-listing')" class="bg-accent-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-accent-600 transition text-sm shadow-sm"><i class="fas fa-plus mr-2"></i>Nouvelle annonce</button>
      </div>
      <div id="user-stats" class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6"></div>
      <div id="user-listings" class="space-y-3"></div>
    </div>

    <!-- PAGE: NEW LISTING -->
    <div id="page-new-listing" class="hidden max-w-2xl mx-auto">
      <div class="bg-white rounded-2xl shadow-sm p-8">
        <div class="mb-6"><h2 class="text-2xl font-bold text-gray-800">Publier une annonce</h2><p class="text-gray-500 text-sm mt-1">Décris ton article ou service</p></div>
        <form onsubmit="handleNewListing(event)" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
            <input type="text" id="nl-title" required placeholder="Ex: Samsung A54, Moto TVS, Terrain Cocody..." class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
              <select id="nl-category" required class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
                <option value="">Choisir...</option>
                <option value="Véhicules">🚗 Véhicules</option>
                <option value="Immobilier">🏠 Immobilier</option>
                <option value="Électronique">📱 Électronique</option>
                <option value="Mode">👗 Mode & Beauté</option>
                <option value="Maison">🛋️ Maison & Déco</option>
                <option value="Alimentation">🥘 Alimentation</option>
                <option value="Loisirs">⚽ Loisirs & Sports</option>
                <option value="Emploi">💼 Emploi</option>
                <option value="Services">🔧 Services</option>
                <option value="Agriculture">🌿 Agriculture</option>
                <option value="Autres">📦 Autres</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Prix (FCFA)</label>
              <input type="number" id="nl-price" min="0" step="1" placeholder="Ex: 50000" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea id="nl-description" required rows="4" placeholder="Décris ton article en détail..." class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Ville / Quartier</label>
              <select id="nl-location" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
                <option value="">Choisir une ville...</option>
                <optgroup label="Grand Abidjan">
                  <option value="Abidjan - Cocody">Abidjan — Cocody</option>
                  <option value="Abidjan - Plateau">Abidjan — Plateau</option>
                  <option value="Abidjan - Marcory">Abidjan — Marcory</option>
                  <option value="Abidjan - Yopougon">Abidjan — Yopougon</option>
                  <option value="Abidjan - Abobo">Abidjan — Abobo</option>
                  <option value="Abidjan - Adjamé">Abidjan — Adjamé</option>
                  <option value="Abidjan - Treichville">Abidjan — Treichville</option>
                  <option value="Abidjan - Koumassi">Abidjan — Koumassi</option>
                  <option value="Abidjan - Port-Bouët">Abidjan — Port-Bouët</option>
                  <option value="Abidjan - Attécoubé">Abidjan — Attécoubé</option>
                  <option value="Grand-Bassam">Grand-Bassam</option>
                  <option value="Anyama">Anyama</option>
                  <option value="Dabou">Dabou</option>
                </optgroup>
                <optgroup label="Centre"><option value="Bouaké">Bouaké</option><option value="Yamoussoukro">Yamoussoukro</option><option value="Dimbokro">Dimbokro</option><option value="Toumodi">Toumodi</option></optgroup>
                <optgroup label="Ouest"><option value="San-Pédro">San-Pédro</option><option value="Man">Man</option><option value="Daloa">Daloa</option><option value="Gagnoa">Gagnoa</option><option value="Soubré">Soubré</option><option value="Sassandra">Sassandra</option></optgroup>
                <optgroup label="Nord"><option value="Korhogo">Korhogo</option><option value="Odienné">Odienné</option><option value="Ferkessédougou">Ferkessédougou</option><option value="Boundiali">Boundiali</option></optgroup>
                <optgroup label="Est"><option value="Abengourou">Abengourou</option><option value="Bondoukou">Bondoukou</option></optgroup>
                <optgroup label="Sud"><option value="Divo">Divo</option><option value="Aboisso">Aboisso</option><option value="Agboville">Agboville</option></optgroup>
                <option value="Autre ville">Autre ville</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Contact (WhatsApp / Tél)</label>
              <input type="text" id="nl-contact" placeholder="+225 07 00 00 00 00" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <!-- Image -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"><i class="fas fa-camera mr-1 text-gray-400"></i>Photo <span class="text-gray-400 font-normal">(facultatif — max 5 Mo)</span></label>
            <div id="img-upload-zone" onclick="document.getElementById('nl-image').click()"
              ondragover="event.preventDefault();this.classList.add('border-primary-400','bg-primary-50')"
              ondragleave="this.classList.remove('border-primary-400','bg-primary-50')"
              ondrop="event.preventDefault();this.classList.remove('border-primary-400','bg-primary-50');const f=event.dataTransfer.files[0];if(f){const i=document.getElementById('nl-image');const d=new DataTransfer();d.items.add(f);i.files=d.files;handleImageSelect(i);}"
              class="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition">
              <i class="fas fa-cloud-upload-alt text-3xl text-gray-300 mb-2"></i>
              <p class="text-sm text-gray-500 font-medium">Cliquez ou glissez une image ici</p>
              <p class="text-xs text-gray-400 mt-1">JPG, PNG, WEBP — max 5 Mo</p>
            </div>
            <input type="file" id="nl-image" accept="image/*" class="hidden" onchange="handleImageSelect(this)" />
            <div class="relative mt-2">
              <img id="img-preview" src="" alt="Aperçu" class="hidden w-full max-h-64 object-contain rounded-xl border border-gray-200 bg-gray-50" />
              <button type="button" id="img-remove-btn" onclick="removeImage()" class="absolute top-2 right-2 hidden bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center shadow transition text-xs"><i class="fas fa-times"></i></button>
            </div>
            <p id="img-info" class="text-xs text-gray-400 mt-1 text-right"></p>
          </div>
          <div id="nl-error" class="hidden text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg"></div>
          <div class="flex gap-3 pt-2">
            <button type="button" onclick="showPage('home')" class="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition text-sm">Annuler</button>
            <button type="submit" class="flex-1 bg-primary-600 text-white py-2.5 rounded-xl font-semibold hover:bg-primary-700 transition text-sm"><i class="fas fa-paper-plane mr-2"></i>Publier</button>
          </div>
        </form>
      </div>
    </div>

    <!-- PAGE: LISTING DETAIL -->
    <div id="page-listing-detail" class="hidden max-w-3xl mx-auto">
      <button onclick="showPage('home')" class="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-5 text-sm"><i class="fas fa-arrow-left"></i> Retour</button>
      <div id="listing-detail-content"></div>
    </div>

    <!-- PAGE: MESSAGES -->
    <div id="page-messages" class="hidden max-w-4xl mx-auto">
      <h2 class="text-2xl font-bold text-gray-800 mb-6"><i class="fas fa-envelope mr-2 text-primary-500"></i>Messagerie</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div class="p-3 border-b border-gray-100 bg-gray-50">
            <p class="text-sm font-semibold text-gray-700">Conversations</p>
          </div>
          <div id="conversations-list" class="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            <div class="text-center text-gray-400 py-8 text-sm"><i class="fas fa-spinner fa-spin"></i></div>
          </div>
        </div>
        <div class="md:col-span-2 bg-white rounded-xl border border-gray-200 flex flex-col" style="min-height:400px">
          <div id="chat-header" class="p-3 border-b border-gray-100 bg-gray-50 hidden">
            <p id="chat-title" class="text-sm font-semibold text-gray-700"></p>
            <p id="chat-subtitle" class="text-xs text-gray-400"></p>
          </div>
          <div id="chat-messages" class="flex-1 p-4 overflow-y-auto space-y-3 max-h-72">
            <div class="text-center text-gray-300 py-16"><i class="fas fa-comments text-4xl mb-2"></i><p class="text-sm">Sélectionne une conversation</p></div>
          </div>
          <div id="chat-input-area" class="hidden p-3 border-t border-gray-100">
            <div class="flex gap-2">
              <input type="text" id="chat-input" placeholder="Écrire un message..." class="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" onkeydown="if(event.key==='Enter')sendMessage()" />
              <button onclick="sendMessage()" class="bg-primary-600 text-white px-4 py-2 rounded-xl hover:bg-primary-700 transition text-sm"><i class="fas fa-paper-plane"></i></button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- PAGE: FAVORITES -->
    <div id="page-favorites" class="hidden">
      <h2 class="text-2xl font-bold text-gray-800 mb-6"><i class="fas fa-heart mr-2 text-red-500"></i>Mes favoris</h2>
      <div id="favorites-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div class="col-span-full text-center text-gray-400 py-12"><i class="fas fa-spinner fa-spin text-3xl"></i></div>
      </div>
    </div>

    <!-- PAGE: NOTIFICATIONS -->
    <div id="page-notifications" class="hidden max-w-2xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-gray-800"><i class="fas fa-bell mr-2 text-primary-500"></i>Notifications</h2>
        <button onclick="markAllNotifsRead()" class="text-sm text-primary-600 hover:underline"><i class="fas fa-check-double mr-1"></i>Tout marquer comme lu</button>
      </div>
      <div id="notifications-list" class="space-y-2">
        <div class="text-center text-gray-400 py-12"><i class="fas fa-spinner fa-spin text-3xl"></i></div>
      </div>
    </div>

    <!-- PAGE: PROFILE EDIT -->
    <div id="page-profile-edit" class="hidden max-w-2xl mx-auto">
      <h2 class="text-2xl font-bold text-gray-800 mb-6"><i class="fas fa-user-edit mr-2 text-primary-500"></i>Mon profil</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Avatar -->
        <div class="bg-white rounded-2xl shadow-sm p-6 text-center">
          <div class="relative inline-block mb-3">
            <div id="profile-avatar-display" class="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center mx-auto overflow-hidden border-4 border-primary-200">
              <i class="fas fa-user text-primary-400 text-3xl"></i>
            </div>
            <button onclick="document.getElementById('avatar-input').click()" class="absolute bottom-0 right-0 bg-primary-600 text-white rounded-full w-7 h-7 flex items-center justify-center shadow hover:bg-primary-700 transition text-xs">
              <i class="fas fa-camera"></i>
            </button>
          </div>
          <input type="file" id="avatar-input" accept="image/*" class="hidden" onchange="handleAvatarSelect(this)" />
          <p id="profile-name-display" class="font-semibold text-gray-800 mt-2"></p>
          <p id="profile-email-display" class="text-sm text-gray-400"></p>
        </div>
        <!-- Formulaire -->
        <div class="md:col-span-2 space-y-4">
          <div class="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <h3 class="font-semibold text-gray-700">Informations personnelles</h3>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
              <input type="text" id="profile-name" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Téléphone / WhatsApp</label>
              <input type="text" id="profile-phone" placeholder="+225 07 00 00 00 00" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Ville</label>
              <select id="profile-city" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
                <option value="">Choisir...</option>
                <option value="Abidjan">Abidjan</option><option value="Bouaké">Bouaké</option><option value="Yamoussoukro">Yamoussoukro</option>
                <option value="San-Pédro">San-Pédro</option><option value="Korhogo">Korhogo</option><option value="Daloa">Daloa</option>
                <option value="Man">Man</option><option value="Gagnoa">Gagnoa</option><option value="Abengourou">Abengourou</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea id="profile-bio" rows="3" placeholder="Parle un peu de toi..." class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"></textarea>
            </div>
            <div id="profile-save-msg" class="hidden"></div>
            <button onclick="saveProfile()" class="w-full bg-primary-600 text-white py-2.5 rounded-xl font-semibold hover:bg-primary-700 transition text-sm">
              <i class="fas fa-save mr-2"></i>Enregistrer
            </button>
          </div>
          <!-- Changer mot de passe -->
          <div class="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <h3 class="font-semibold text-gray-700">Changer le mot de passe</h3>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
              <input type="password" id="pwd-current" autocomplete="current-password" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
              <input type="password" id="pwd-new" autocomplete="new-password" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div id="pwd-msg" class="hidden text-sm px-3 py-2 rounded-lg"></div>
            <button onclick="changePassword()" class="w-full border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition text-sm">
              <i class="fas fa-key mr-2"></i>Changer le mot de passe
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- PAGE: ADMIN -->
    <div id="page-admin" class="hidden">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center"><i class="fas fa-shield-alt text-orange-500"></i></div>
        <div><h2 class="text-2xl font-bold text-gray-800">Administration</h2><p class="text-gray-500 text-sm">Panneau de gestion</p></div>
      </div>
      <!-- Tabs admin -->
      <div class="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        <button onclick="adminTab('stats')" id="admin-tab-stats" class="admin-tab-btn active px-4 py-2 rounded-lg text-sm font-medium transition"><i class="fas fa-chart-bar mr-1"></i>Stats</button>
        <button onclick="adminTab('listings')" id="admin-tab-listings" class="admin-tab-btn px-4 py-2 rounded-lg text-sm font-medium transition"><i class="fas fa-list mr-1"></i>Annonces</button>
        <button onclick="adminTab('users')" id="admin-tab-users" class="admin-tab-btn px-4 py-2 rounded-lg text-sm font-medium transition"><i class="fas fa-users mr-1"></i>Utilisateurs</button>
      </div>
      <div id="admin-content"></div>
    </div>

    <!-- PAGE: PUBLIC PROFILE -->
    <div id="page-public-profile" class="hidden max-w-3xl mx-auto">
      <button onclick="history.back()" class="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-5 text-sm"><i class="fas fa-arrow-left"></i> Retour</button>
      <div id="public-profile-content"></div>
    </div>

  </main>

  <!-- FOOTER -->
  <footer class="mt-12 bg-white border-t border-gray-200 py-8">
    <div class="max-w-7xl mx-auto px-4 text-center">
      <div class="flex items-center justify-center gap-2 mb-2">
        <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
          <i class="fas fa-tag text-white text-xs"></i>
        </div>
        <span class="font-bold text-gray-700">PetitesAnnoncesIvoire<span class="text-primary-600">.com</span></span>
      </div>
      <p class="text-gray-400 text-sm mb-1">La plateforme d'annonces N°1 en Côte d'Ivoire 🇨🇮</p>
      <p class="text-gray-300 text-xs">© 2025 PetitesAnnoncesIvoire.com — Tous droits réservés</p>
    </div>
  </footer>

  <!-- TOAST -->
  <div id="toast" class="fixed bottom-6 right-6 z-50 hidden">
    <div class="bg-gray-800 text-white px-5 py-3 rounded-xl shadow-lg text-sm flex items-center gap-3">
      <i id="toast-icon" class="fas fa-check-circle text-green-400"></i>
      <span id="toast-msg"></span>
    </div>
  </div>

  <!-- MODAL MESSAGE (contacter le vendeur) -->
  <div id="modal-message" class="fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-gray-800 text-lg">Contacter le vendeur</h3>
        <button onclick="closeMessageModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
      </div>
      <p id="modal-listing-title" class="text-sm text-gray-500 mb-4 bg-gray-50 px-3 py-2 rounded-lg"></p>
      <textarea id="modal-message-text" rows="4" placeholder="Bonjour, je suis intéressé par votre annonce..." class="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none mb-4"></textarea>
      <div id="modal-msg-error" class="hidden text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3"></div>
      <div class="flex gap-3">
        <button onclick="closeMessageModal()" class="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition text-sm">Annuler</button>
        <button onclick="submitMessage()" class="flex-1 bg-primary-600 text-white py-2.5 rounded-xl font-semibold hover:bg-primary-700 transition text-sm"><i class="fas fa-paper-plane mr-2"></i>Envoyer</button>
      </div>
    </div>
  </div>

  <script src="/static/app.js"></script>
</body>
</html>`)
})

export default app
