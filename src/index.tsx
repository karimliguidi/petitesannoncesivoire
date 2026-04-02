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

// Route principale → SPA
app.get('*', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PetitesAnnoncesIvoire.com — Achetez, Vendez, Échangez en Côte d'Ivoire</title>
  <meta name="description" content="Le site de petites annonces numéro 1 en Côte d'Ivoire. Achetez, vendez et échangez facilement à Abidjan et partout en Côte d'Ivoire." />
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/static/styles.css" />
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: { 50:'#fff7ed',100:'#ffedd5',200:'#fed7aa',300:'#fdba74',400:'#fb923c',500:'#f97316',600:'#ea580c',700:'#c2410c',800:'#9a3412' },
            accent:  { 400:'#4ade80',500:'#22c55e',600:'#16a34a' },
            ivoire:  { 100:'#fef9c3',500:'#eab308',600:'#ca8a04' }
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
      <!-- Logo -->
      <a href="#" onclick="showPage('home')" class="flex items-center gap-2 font-bold text-xl">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow">
          <i class="fas fa-tag text-white text-sm"></i>
        </div>
        <span class="text-primary-600">PetitesAnnonces<span class="text-accent-500">Ivoire</span><span class="text-gray-400 font-normal text-base">.com</span></span>
      </a>

      <!-- Nav desktop -->
      <nav class="flex items-center gap-2" id="nav-menu">
        <button onclick="showPage('home')" class="text-gray-600 hover:text-primary-600 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition hidden sm:inline-flex items-center gap-1">
          <i class="fas fa-home"></i><span class="hidden md:inline ml-1">Accueil</span>
        </button>
        <div id="nav-guest" class="flex gap-2">
          <button onclick="showPage('login')" class="text-gray-600 hover:text-primary-600 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
            Connexion
          </button>
          <button onclick="showPage('register')" class="bg-primary-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-primary-700 transition shadow-sm">
            S'inscrire
          </button>
        </div>
        <div id="nav-auth" class="hidden flex items-center gap-2">
          <button onclick="showPage('new-listing')" class="bg-accent-500 text-white text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-accent-600 transition shadow-sm">
            <i class="fas fa-plus mr-1"></i>Publier
          </button>
          <button onclick="showPage('dashboard')" class="text-gray-600 hover:text-primary-600 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
            <i class="fas fa-user mr-1"></i><span id="nav-username" class="hidden sm:inline">Mon compte</span>
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

      <!-- Hero avec couleurs Côte d'Ivoire (orange + vert) -->
      <div class="relative bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500 rounded-2xl p-8 mb-8 text-white text-center overflow-hidden">
        <!-- Décor fond -->
        <div class="absolute inset-0 opacity-10">
          <div class="absolute -top-4 -left-4 w-32 h-32 bg-white rounded-full"></div>
          <div class="absolute -bottom-8 -right-8 w-48 h-48 bg-white rounded-full"></div>
        </div>
        <div class="relative z-10">
          <div class="flex items-center justify-center gap-2 mb-3">
            <span class="text-2xl">🇨🇮</span>
            <span class="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">Côte d'Ivoire</span>
          </div>
          <h1 class="text-3xl font-bold mb-2">La bonne affaire est près de chez toi !</h1>
          <p class="text-white/90 mb-6 text-sm">Des milliers d'annonces à Abidjan, Bouaké, San-Pédro et partout en Côte d'Ivoire</p>
          <div class="flex max-w-2xl mx-auto gap-2">
            <input type="text" id="search-input" placeholder="Que cherches-tu ? (téléphone, moto, maison...)" class="flex-1 px-4 py-3 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-white shadow-sm" />
            <button onclick="searchListings()" class="bg-white text-primary-600 hover:bg-gray-50 px-6 py-3 rounded-xl font-bold transition shadow-sm">
              <i class="fas fa-search"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Villes populaires -->
      <div class="mb-6">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          <i class="fas fa-map-marker-alt mr-1 text-primary-500"></i>Parcourir par ville
        </h2>
        <div class="flex flex-wrap gap-2" id="cities-grid">
          <!-- Injecté via JS -->
        </div>
      </div>

      <!-- Catégories -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          <i class="fas fa-th-large mr-1 text-primary-500"></i>Parcourir par catégorie
        </h2>
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-9 gap-2" id="categories-grid">
          <!-- Injecté via JS -->
        </div>
      </div>

      <!-- Titre + filtre actif -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold text-gray-800">
          <span id="listings-title">Toutes les annonces</span>
        </h2>
        <button id="btn-reset-filter" onclick="resetFilter()" class="hidden text-sm text-primary-600 hover:underline flex items-center gap-1">
          <i class="fas fa-times"></i> Effacer le filtre
        </button>
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
          <p class="text-gray-500 text-sm mt-1">Rejoins la communauté ivoirienne gratuitement</p>
        </div>
        <form onsubmit="handleRegister(event)" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
            <input type="text" id="reg-name" required placeholder="Kouamé Konan" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Adresse email</label>
            <input type="email" id="reg-email" required placeholder="kouame@exemple.ci" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input type="password" id="reg-password" required minlength="6" placeholder="Au moins 6 caractères" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" autocomplete="new-password" />
          </div>
          <div id="reg-error" class="hidden text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg"></div>
          <button type="submit" class="w-full bg-primary-600 text-white py-2.5 rounded-xl font-semibold hover:bg-primary-700 transition text-sm shadow-sm">
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
          <p class="text-gray-500 text-sm mt-1">Bon retour parmi nous ! 🇨🇮</p>
        </div>
        <form onsubmit="handleLogin(event)" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Adresse email</label>
            <input type="email" id="login-email" required placeholder="kouame@exemple.ci" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input type="password" id="login-password" required placeholder="••••••••" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" autocomplete="current-password" />
          </div>
          <div id="login-error" class="hidden text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg"></div>
          <button type="submit" class="w-full bg-primary-600 text-white py-2.5 rounded-xl font-semibold hover:bg-primary-700 transition text-sm shadow-sm">
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
        <button onclick="showPage('new-listing')" class="bg-accent-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-accent-600 transition text-sm shadow-sm">
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
          <p class="text-gray-500 text-sm mt-1">Décris ton article ou service</p>
        </div>
        <form onsubmit="handleNewListing(event)" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Titre de l'annonce *</label>
            <input type="text" id="nl-title" required placeholder="Ex: Samsung Galaxy A54, Moto TVS, Terrain Cocody..." class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
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
            <textarea id="nl-description" required rows="4" placeholder="Décris ton article en détail : état, caractéristiques, raison de la vente..." class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"></textarea>
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
                  <option value="Abidjan - Bingerville">Abidjan — Bingerville</option>
                  <option value="Grand-Bassam">Grand-Bassam</option>
                  <option value="Anyama">Anyama</option>
                  <option value="Dabou">Dabou</option>
                  <option value="Jacqueville">Jacqueville</option>
                </optgroup>
                <optgroup label="Centre">
                  <option value="Bouaké">Bouaké</option>
                  <option value="Yamoussoukro">Yamoussoukro</option>
                  <option value="Dimbokro">Dimbokro</option>
                  <option value="Daoukro">Daoukro</option>
                  <option value="Toumodi">Toumodi</option>
                  <option value="Tiébissou">Tiébissou</option>
                </optgroup>
                <optgroup label="Ouest">
                  <option value="San-Pédro">San-Pédro</option>
                  <option value="Man">Man</option>
                  <option value="Daloa">Daloa</option>
                  <option value="Gagnoa">Gagnoa</option>
                  <option value="Soubré">Soubré</option>
                  <option value="Guiglo">Guiglo</option>
                  <option value="Issia">Issia</option>
                  <option value="Sassandra">Sassandra</option>
                  <option value="Tabou">Tabou</option>
                </optgroup>
                <optgroup label="Nord">
                  <option value="Korhogo">Korhogo</option>
                  <option value="Odienné">Odienné</option>
                  <option value="Boundiali">Boundiali</option>
                  <option value="Ferkessédougou">Ferkessédougou</option>
                  <option value="Tengréla">Tengréla</option>
                  <option value="Séguéla">Séguéla</option>
                </optgroup>
                <optgroup label="Est">
                  <option value="Abengourou">Abengourou</option>
                  <option value="Bondoukou">Bondoukou</option>
                  <option value="Agnibilékrou">Agnibilékrou</option>
                  <option value="Tanda">Tanda</option>
                </optgroup>
                <optgroup label="Sud">
                  <option value="Divo">Divo</option>
                  <option value="Lakota">Lakota</option>
                  <option value="Aboisso">Aboisso</option>
                  <option value="Adzopé">Adzopé</option>
                  <option value="Agboville">Agboville</option>
                  <option value="Tiassalé">Tiassalé</option>
                </optgroup>
                <option value="Autre ville">Autre ville</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Contact (WhatsApp / Tél)</label>
              <input type="text" id="nl-contact" placeholder="Ex: +225 07 00 00 00 00" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>

          <!-- Champ image -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              <i class="fas fa-camera mr-1 text-gray-400"></i>Photo de l'annonce
              <span class="text-gray-400 font-normal">(facultatif — max 5 Mo)</span>
            </label>
            <div id="img-upload-zone"
              onclick="document.getElementById('nl-image').click()"
              ondragover="event.preventDefault(); this.classList.add('border-primary-400','bg-primary-50')"
              ondragleave="this.classList.remove('border-primary-400','bg-primary-50')"
              ondrop="event.preventDefault(); this.classList.remove('border-primary-400','bg-primary-50'); const f=event.dataTransfer.files[0]; if(f){ const inp=document.getElementById('nl-image'); const dt=new DataTransfer(); dt.items.add(f); inp.files=dt.files; handleImageSelect(inp); }"
              class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition">
              <i class="fas fa-cloud-upload-alt text-3xl text-gray-300 mb-2"></i>
              <p class="text-sm text-gray-500 font-medium">Cliquez ou glissez une image ici</p>
              <p class="text-xs text-gray-400 mt-1">JPG, PNG, WEBP — max 5 Mo</p>
            </div>
            <input type="file" id="nl-image" accept="image/*" class="hidden" onchange="handleImageSelect(this)" />
            <div class="relative mt-2">
              <img id="img-preview" src="" alt="Aperçu"
                class="hidden w-full max-h-64 object-contain rounded-xl border border-gray-200 bg-gray-50" />
              <button type="button" id="img-remove-btn" onclick="removeImage()"
                class="absolute top-2 right-2 hidden bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center shadow transition text-xs">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <p id="img-info" class="text-xs text-gray-400 mt-1 text-right"></p>
          </div>

          <div id="nl-error" class="hidden text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg"></div>
          <div class="flex gap-3 pt-2">
            <button type="button" onclick="showPage('home')" class="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition text-sm">
              Annuler
            </button>
            <button type="submit" class="flex-1 bg-primary-600 text-white py-2.5 rounded-xl font-semibold hover:bg-primary-700 transition text-sm shadow-sm">
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
  <footer class="mt-12 bg-white border-t border-gray-200 py-8">
    <div class="max-w-7xl mx-auto px-4 text-center">
      <div class="flex items-center justify-center gap-2 mb-3">
        <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
          <i class="fas fa-tag text-white text-xs"></i>
        </div>
        <span class="font-bold text-gray-700">PetitesAnnoncesIvoire<span class="text-primary-600">.com</span></span>
      </div>
      <p class="text-gray-400 text-sm mb-2">La plateforme d'annonces N°1 en Côte d'Ivoire 🇨🇮</p>
      <p class="text-gray-300 text-xs">© 2025 PetitesAnnoncesIvoire.com — Achetez, Vendez, Échangez en toute simplicité</p>
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
