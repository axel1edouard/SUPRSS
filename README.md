# SUPRSS — MVP

MVP fonctionnel : Backend (Express/Mongo), Frontend (React/Vite), Docker Compose.

## Lancer

1. **Prérequis** : Docker + Docker Compose.
2. **Démarrage** :
   ```bash
   docker compose up --build
   ```
3. Ouvre le front sur http://localhost:5173  
   L'API tourne sur http://localhost:4000

> Un utilisateur de démo peut être créé (en local hors docker) avec `npm run seed` dans `backend/`
> ou bien crée ton compte via l'écran d'inscription.

## Fonctionnalités incluses

- Auth email/mot de passe (JWT en cookie httpOnly) : `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`
- Ajout de flux RSS et ingestion d'articles (stockés en base) : `/api/feeds`
- Suppression d'un flux (supprime aussi ses articles) : `DELETE /api/feeds/:id`
- Liste d'articles + filtres simples : `/api/articles?feedId=&collectionId=&status=&favorite=&q=&limit=50`
- Marquer lu / favori : `POST /api/articles/:id/mark-read`, `POST /api/articles/:id/favorite`
- Collections partagées (MVP) : créer, lister, voir articles agrégés

## À ajouter facilement ensuite

- OAuth2 (Google/Microsoft/GitHub) via Passport.js
- Recherche plein texte avancée (index déjà en place)
- Filtrage UI (source, tags, lus/non lus, favoris)
- Export/Import (OPML/JSON/CSV)
- Messagerie et commentaires par article
- Permissions fines par collection

## Sécurité

- **Ne committe jamais** de secrets réels. Utilise `.env` (voir `backend/.env.example`).
- Les cookies sont `httpOnly`. Active `secure` en production (HTTPS).

## Structure

- `backend/` : API Node/Express + Mongoose
- `frontend/` : React (Vite)
- `docker-compose.yml` : 3 services (mongo, backend, frontend)

Bon courage !
