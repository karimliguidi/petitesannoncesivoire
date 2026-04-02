# PetitesAnnoncesIvoire.com

## Présentation
Plateforme de petites annonces N°1 en Côte d'Ivoire — Achetez, vendez et échangez à Abidjan et partout en CI.

- **URL Production** : https://webapp-932.pages.dev
- **Hébergement** : Cloudflare Pages (edge global, gratuit)
- **Stack** : Hono (TypeScript) + Cloudflare D1 (SQLite) + TailwindCSS + FontAwesome

---

## Fonctionnalités implémentées ✅

### Authentification
- Inscription / Connexion par email + mot de passe
- Mots de passe hashés SHA-256 (Web Crypto API)
- JWT HMAC-SHA256 valable 7 jours (stocké en localStorage)
- Déconnexion

### Annonces
- Publication d'annonces (titre, catégorie, prix FCFA, description, localité, contact, photo)
- Upload photo avec compression client-side (max 1200px, JPEG 82%, base64 en D1)
- Listage public avec pagination (20 par page)
- Filtres avancés : catégorie, ville, prix min/max, tri (récent / prix ↑ / prix ↓)
- Recherche plein texte (titre + description)
- Boutons rapides par ville et par catégorie
- Page de détail d'une annonce
- Suppression et archivage (propriétaire uniquement)

### Profil & Compte
- Page profil éditable (nom, téléphone, ville, bio, avatar)
- Changement de mot de passe
- Profil public par utilisateur avec ses annonces actives

### Messagerie
- Envoyer un message à un vendeur (depuis la page annonce)
- Boîte de réception avec conversations groupées
- Fil de messages par conversation
- Badge de comptage messages non lus

### Favoris
- Ajouter/retirer une annonce des favoris (cœur)
- Page "Mes favoris" avec liste des annonces sauvegardées

### Notifications
- Création automatique lors d'un nouveau message
- Badge compteur dans le header
- Marquer lu individuellement ou tout marquer lu

### Tableau de bord
- Stats : annonces actives / archivées / total / messages
- Liste de ses propres annonces avec actions

### Administration
- Panel admin (accessible aux comptes marqués `is_admin = 1`)
- Onglet Stats : utilisateurs, annonces, messages, favoris, top catégories, derniers inscrits
- Onglet Annonces : liste et suppression
- Onglet Utilisateurs : liste, promotion / rétrogradation admin

---

## API Backend (Hono sur Cloudflare Workers)

### Auth
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/auth/register` | ❌ | Inscription |
| POST | `/api/auth/login` | ❌ | Connexion |

### Annonces
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/listings` | ❌ | Liste (filtres: category, search, location, min_price, max_price, sort, limit, offset) |
| GET | `/api/listings/:id` | ❌ | Détail avec image_data |
| GET | `/api/listings/:id/image` | ❌ | Image binaire (cache 24h) |
| POST | `/api/listings` | ✅ | Créer une annonce |
| DELETE | `/api/listings/:id` | ✅ | Supprimer (propriétaire) |
| PUT | `/api/listings/:id/archive` | ✅ | Archiver (propriétaire) |

### Utilisateurs
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/users/me/listings` | ✅ | Mes annonces |
| GET | `/api/users/me/stats` | ✅ | Mes statistiques |

### Messagerie
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/messages` | ✅ | Envoyer un message |
| GET | `/api/messages/unread-count` | ✅ | Nb messages non lus |
| GET | `/api/messages/inbox` | ✅ | Conversations groupées |
| GET | `/api/messages/:listingId/:otherUserId` | ✅ | Fil d'une conversation |

### Favoris
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/favorites/:id` | ✅ | Toggle favori |
| GET | `/api/favorites` | ✅ | Mes favoris |
| GET | `/api/favorites/ids` | ✅ | IDs en favoris |

### Notifications
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/notifications` | ✅ | Liste (50 dernières) |
| GET | `/api/notifications/count` | ✅ | Nb non lues |
| PUT | `/api/notifications/:id/read` | ✅ | Marquer lue |
| PUT | `/api/notifications/read-all` | ✅ | Tout marquer lu |

### Profil
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/profile/me` | ✅ | Mon profil complet |
| PUT | `/api/profile/me` | ✅ | Mettre à jour profil |
| PUT | `/api/profile/me/password` | ✅ | Changer mot de passe |
| GET | `/api/profile/:id` | ❌ | Profil public |

### Admin
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/profile/admin/stats` | 👑 Admin | Statistiques globales |
| GET | `/api/profile/admin/listings` | 👑 Admin | Toutes les annonces |
| DELETE | `/api/profile/admin/listings/:id` | 👑 Admin | Supprimer une annonce |
| GET | `/api/profile/admin/users` | 👑 Admin | Liste utilisateurs |
| PUT | `/api/profile/admin/users/:id/toggle-admin` | 👑 Admin | Promouvoir/rétrograder |

---

## Base de données (Cloudflare D1 — SQLite)

### Tables
- `users` : id, name, email, password_hash, phone, city, bio, avatar, is_admin, created_at
- `listings` : id, user_id, title, description, category, price, location, contact, image_data, status, created_at
- `messages` : id, listing_id, sender_id, receiver_id, content, is_read, created_at
- `favorites` : id, user_id, listing_id, created_at
- `notifications` : id, user_id, type, title, body, link, is_read, created_at

### Migrations
- `0001_initial_schema.sql` — tables users + listings
- `0002_add_image.sql` — colonne image_data
- `0003_add_social_features.sql` — messages, favorites, notifications, profil étendu, is_admin

---

## Villes disponibles
Abidjan (Cocody, Plateau, Marcory, Yopougon, Abobo, Adjamé, Treichville, Koumassi, Port-Bouët, Attécoubé), Grand-Bassam, Anyama, Dabou, Bouaké, Yamoussoukro, Dimbokro, Toumodi, San-Pédro, Man, Daloa, Gagnoa, Soubré, Sassandra, Korhogo, Odienné, Ferkessédougou, Boundiali, Abengourou, Bondoukou, Divo, Aboisso, Agboville.

## Catégories
Véhicules, Immobilier, Électronique, Mode & Beauté, Maison & Déco, Alimentation, Loisirs & Sports, Emploi, Services, Agriculture, Autres.

---

## Déploiement
```bash
npm run build
npx wrangler pages deploy dist --project-name webapp --commit-dirty=true
```

**Statut** : ✅ Actif — https://webapp-932.pages.dev  
**Dernière mise à jour** : Avril 2026
