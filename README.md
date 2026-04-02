# PetitesAnnonces.fr

## Présentation
Site de petites annonces en ligne permettant à tout le monde de s'inscrire et de publier des annonces gratuitement.

## 🌐 URLs
- **Production** : https://webapp-932.pages.dev
- **Base de données D1** : `webapp-production` (Cloudflare D1)

## ✅ Fonctionnalités
- Inscription / Connexion par email + mot de passe
- Authentification JWT sécurisée (HMAC-SHA256, 7 jours)
- Publication d'annonces (titre, catégorie, prix, description, localisation, contact)
- 9 catégories : Véhicules, Immobilier, Électronique, Mode, Maison, Loisirs, Emploi, Services, Autres
- Recherche plein texte dans les annonces
- Filtre par catégorie
- Page détail d'une annonce
- Tableau de bord utilisateur (mes annonces + statistiques)
- Suppression et archivage de ses propres annonces

## 🏗️ Architecture
- **Backend** : Hono (Cloudflare Workers)
- **Base de données** : Cloudflare D1 (SQLite)
- **Frontend** : HTML + TailwindCSS + JavaScript vanilla
- **Auth** : JWT HMAC-SHA256 (Web Crypto API)
- **Déploiement** : Cloudflare Pages

## 📁 Structure
```
webapp/
├── src/
│   ├── index.tsx              # App principale + HTML SPA
│   └── routes/
│       ├── auth.ts            # Inscription / Connexion JWT
│       ├── listings.ts        # CRUD annonces
│       └── users.ts           # Dashboard & statistiques
├── migrations/
│   └── 0001_initial_schema.sql
├── public/static/
│   ├── app.js                 # JavaScript frontend
│   └── styles.css
├── wrangler.jsonc             # Config Cloudflare (D1 binding)
└── ecosystem.config.cjs       # PM2 (dev sandbox)
```

## 🔌 API Routes
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/auth/register` | Non | Inscription |
| POST | `/api/auth/login` | Non | Connexion |
| GET | `/api/listings` | Non | Liste des annonces |
| GET | `/api/listings/:id` | Non | Détail annonce |
| POST | `/api/listings` | Oui | Créer une annonce |
| DELETE | `/api/listings/:id` | Oui | Supprimer une annonce |
| PUT | `/api/listings/:id/archive` | Oui | Archiver une annonce |
| GET | `/api/users/me/listings` | Oui | Mes annonces |
| GET | `/api/users/me/stats` | Oui | Mes statistiques |

## 🗄️ Modèles de données
### users
- `id`, `email`, `name`, `password_hash`, `created_at`

### listings
- `id`, `user_id`, `title`, `description`, `category`, `price`, `location`, `contact`, `status`, `created_at`

## 🚀 Déploiement
- **Plateforme** : Cloudflare Pages
- **Statut** : ✅ Actif
- **Projet** : `webapp` (ID: webapp-932.pages.dev)
- **DB ID** : `959c0efe-ced1-4c55-bb6c-1fa4a9fab03c`
- **Dernière mise à jour** : 2025-04-02

## 💻 Développement local
```bash
npm run build
npm run db:migrate:local
pm2 start ecosystem.config.cjs
```
