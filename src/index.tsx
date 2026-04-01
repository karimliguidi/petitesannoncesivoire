import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { authRoutes } from './routes/auth'
import { listingsRoutes } from './routes/listings'
import { userRoutes } from './routes/users'

export type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS
app.use('/api/*', cors())

// Servir les fichiers statiques
app.use('/static/*', serveStatic({ root: './' }))

// Routes API
app.route('/api/auth', authRoutes)
app.route('/api/listings', listingsRoutes)
app.route('/api/users', userRoutes)

// Route principale → SPA (Single Page App)
app.get('*', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PetitesAnnonces.fr — Achetez, Vendez, Échangez</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/static/styles.css" />
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: { 50:'#eff6ff',100:'#dbeafe',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8' },
            accent: { 500:'#f59e0b',600:'#d97706' }
          }
        }
      }
    }
  </script>
</head>
<body class="bg-gray-50 min-h-screen">

  <!-- HEADER -->
  <header class="bg-white shadow-sm sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
      <a href="#" onclick="showPage('home')" class="flex items-center gap-2 text-primary-600 font-bold text-xl">
        <i class="fas fa-tag rotate-[-15deg]"></i>
        <span>PetitesAnnonces<span class="text-accent-500">.fr</span></span>
      </a>
      <nav class="flex items-center gap-3" id="nav-menu">
        <button onclick="showPage('home')" class="text-gray-600 hover:text-primary-600 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
          <i class="fas fa-home mr-1"></i>Accueil
        </button>
        <div id="nav-guest" class="flex gap-2">
          <button onclick="showPage('login')" class="text-gray-600 hover:text-primary-600 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
            Connexion
          </button>
          <button onclick="showPage('register')" class="bg-primary-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-primary-700 transition">
            S'inscrire
          </button>
        </div>
        <div id="nav-auth" class="hidden flex items-center gap-3">
          <button onclick="showPage('new-listing')" class="bg-accent-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-accent-600 transition">
            <i class="fas fa-plus mr-1"></i>Publier
          </button>
          <button onclick="showPage('dashboard')" class="text-gray-600 hover:text-primary-600 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
            <i class="fas fa-user mr-1"></i><span id="nav-username">Mon compte</span>
          </button>
          <button onclick="logout()" class="text-red-500 hover:text-red-700 text-sm px-2 py-1.5 rounded-lg hover:bg-red-50 transition">
            <i class="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </nav>
    </div>
  </header>

  <!-- MAIN CONTENT -->
  <main class="max-w-7xl mx-auto px-4 py-6">

    <!-- PAGE: HOME -->
    <div id="page-home">
      <!-- Hero -->
      <div class="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 mb-8 text-white text-center">
        <h1 class="text-3xl font-bold mb-2">Trouvez la bonne affaire près de chez vous</h1>
        <p class="text-primary-100 mb-6">Des milliers d'annonces dans toutes les catégories</p>
        <div class="flex max-w-2xl mx-auto gap-2">
          <input type="text" id="search-input" placeholder="Que recherchez-vous ?" class="flex-1 px-4 py-3 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-white" />
          <button onclick="searchListings()" class="bg-accent-500 hover:bg-accent-600 px-6 py-3 rounded-xl font-semibold transition">
            <i class="fas fa-search"></i>
          </button>
        </div>
      </div>

      <!-- Catégories -->
      <div class="mb-8">
        <h2 class="text-lg font-bold text-gray-800 mb-4">Parcourir par catégorie</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3" id="categories-grid">
          <!-- Injecté via JS -->
        </div>
      </div>

      <!-- Filtre catégorie active -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold text-gray-800">
          <span id="listings-title">Toutes les annonces</span>
        </h2>
        <div class="flex gap-2 items-center">
          <button id="btn-reset-filter" onclick="resetFilter()" class="hidden text-sm text-primary-600 hover:underline">
            <i class="fas fa-times mr-1"></i>Effacer le filtre
          </button>
        </div>
      </div>

      <!-- Grille des annonces -->
      <div id="listings-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div class="col-span-full text-center text-gray-400 py-12">
          <i class="fas fa-spinner fa-spin text-3xl mb-3"></i><br/>Chargement...
        </div>
      </div>
    </div>

    <!-- PAGE: REGISTER -->
    <div id="page-register" class="hidden max-w-md mx-auto">
      <div class="bg-white rounded-2xl shadow-sm p-8">
        <div class="text-center mb-6">
          <div class="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-user-plus text-primary-600 text-xl"></i>
          </div>
          <h2 class="text-2xl font-bold text-gray-800">Créer un compte</h2>
          <p class="text-gray-500 text-sm mt-1">Rejoignez notre communauté gratuitement</p>
        </div>
        <form onsubmit="handleRegister(event)" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
            <input type="text" id="reg-name" required placeholder="Jean Dupont" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Adresse email</label>
            <input type="email" id="reg-email" required placeholder="jean@exemple.fr" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input type="password" id="reg-password" required minlength="6" placeholder="Au moins 6 caractères" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
          <div id="reg-error" class="hidden text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg"></div>
          <button type="submit" class="w-full bg-primary-600 text-white py-2.5 rounded-xl font-semibold hover:bg-primary-700 transition text-sm">
            Créer mon compte
          </button>
        </form>
        <p class="text-center text-sm text-gray-500 mt-5">
          Déjà inscrit ? <button onclick="showPage('login')" class="text-primary-600 font-medium hover:underline">Se connecter</button>
        </p>
      </div>
    </div>

    <!-- PAGE: LOGIN -->
    <div id="page-login" class="hidden max-w-md mx-auto">
      <div class="bg-white rounded-2xl shadow-sm p-8">
        <div class="text-center mb-6">
          <div class="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-sign-in-alt text-primary-600 text-xl"></i>
          </div>
          <h2 class="text-2xl font-bold text-gray-800">Connexion</h2>
          <p class="text-gray-500 text-sm mt-1">Bon retour parmi nous !</p>
        </div>
        <form onsubmit="handleLogin(event)" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Adresse email</label>
            <input type="email" id="login-email" required placeholder="jean@exemple.fr" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input type="password" id="login-password" required placeholder="••••••••" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
          <div id="login-error" class="hidden text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg"></div>
          <button type="submit" class="w-full bg-primary-600 text-white py-2.5 rounded-xl font-semibold hover:bg-primary-700 transition text-sm">
            Se connecter
          </button>
        </form>
        <p class="text-center text-sm text-gray-500 mt-5">
          Pas encore inscrit ? <button onclick="showPage('register')" class="text-primary-600 font-medium hover:underline">Créer un compte</button>
        </p>
      </div>
    </div>

    <!-- PAGE: DASHBOARD -->
    <div id="page-dashboard" class="hidden">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">Mon tableau de bord</h2>
          <p class="text-gray-500 text-sm mt-1">Gérez vos annonces publiées</p>
        </div>
        <button onclick="showPage('new-listing')" class="bg-accent-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-accent-600 transition text-sm">
          <i class="fas fa-plus mr-2"></i>Nouvelle annonce
        </button>
      </div>
      <div id="user-stats" class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"></div>
      <div id="user-listings" class="space-y-3"></div>
    </div>

    <!-- PAGE: NEW LISTING -->
    <div id="page-new-listing" class="hidden max-w-2xl mx-auto">
      <div class="bg-white rounded-2xl shadow-sm p-8">
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-800">Publier une annonce</h2>
          <p class="text-gray-500 text-sm mt-1">Décrivez votre article ou service</p>
        </div>
        <form onsubmit="handleNewListing(event)" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Titre de l'annonce *</label>
            <input type="text" id="nl-title" required placeholder="Ex: iPhone 14 Pro 256Go" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
              <select id="nl-category" required class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
                <option value="">Choisir...</option>
                <option value="Véhicules">Véhicules</option>
                <option value="Immobilier">Immobilier</option>
                <option value="Électronique">Électronique</option>
                <option value="Mode">Mode</option>
                <option value="Maison">Maison</option>
                <option value="Loisirs">Loisirs</option>
                <option value="Emploi">Emploi</option>
                <option value="Services">Services</option>
                <option value="Autres">Autres</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Prix (€)</label>
              <input type="number" id="nl-price" min="0" step="0.01" placeholder="0.00" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea id="nl-description" required rows="5" placeholder="Décrivez votre article en détail : état, caractéristiques, raison de la vente..." class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
              <input type="text" id="nl-location" placeholder="Ex: Paris, Lyon..." class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Contact</label>
              <input type="text" id="nl-contact" placeholder="Email ou téléphone" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div id="nl-error" class="hidden text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg"></div>
          <div class="flex gap-3 pt-2">
            <button type="button" onclick="showPage('home')" class="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition text-sm">
              Annuler
            </button>
            <button type="submit" class="flex-1 bg-primary-600 text-white py-2.5 rounded-xl font-semibold hover:bg-primary-700 transition text-sm">
              <i class="fas fa-paper-plane mr-2"></i>Publier l'annonce
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- PAGE: LISTING DETAIL -->
    <div id="page-listing-detail" class="hidden max-w-3xl mx-auto">
      <button onclick="showPage('home')" class="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-5 text-sm">
        <i class="fas fa-arrow-left"></i> Retour aux annonces
      </button>
      <div id="listing-detail-content"></div>
    </div>

  </main>

  <!-- FOOTER -->
  <footer class="mt-12 bg-white border-t border-gray-200 py-6">
    <div class="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
      © 2025 PetitesAnnonces.fr — Achetez, Vendez, Échangez en toute simplicité
    </div>
  </footer>

  <!-- TOAST NOTIFICATION -->
  <div id="toast" class="fixed bottom-6 right-6 z-50 hidden">
    <div class="bg-gray-800 text-white px-5 py-3 rounded-xl shadow-lg text-sm flex items-center gap-3">
      <i id="toast-icon" class="fas fa-check-circle text-green-400"></i>
      <span id="toast-msg"></span>
    </div>
  </div>

  <script src="/static/app.js"></script>
</body>
</html>`)
})

export default app
