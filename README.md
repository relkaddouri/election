# تدبير الناخبين — Application de gestion des électeurs

Application Next.js (App Router) + TypeScript + Tailwind CSS v4, interface
**100 % arabe en RTL**, backend **Supabase** (Auth + PostgreSQL + Storage).

Cahier des charges : [`docs/brief-app-electeurs.md`](docs/brief-app-electeurs.md).

## Démarrage

```bash
npm install
cp .env.example .env.local   # puis renseigner les clés Supabase
npm run dev
```

L'application démarre sans clés Supabase (le rafraîchissement de session est
alors simplement désactivé), mais toute fonctionnalité liée aux données en aura
besoin.

## Scripts

| Script              | Rôle                                    |
| ------------------- | --------------------------------------- |
| `npm run dev`       | Serveur de développement                |
| `npm run build`     | Build de production                     |
| `npm run typecheck` | `tsc --noEmit`                          |
| `npm run lint`      | ESLint (`lint:fix` pour corriger)       |
| `npm run format`    | Prettier (`format:check` pour vérifier) |

## Structure

```
src/
  app/                  Routes App Router (<html lang="ar" dir="rtl">)
  components/
    ui/                 Primitives (Button…)
    layout/             Coquille applicative, navigation
  lib/
    supabase/
      client.ts         Client navigateur (RLS)
      server.ts         Client serveur (RLS) + client admin (service_role)
      proxy.ts          Rafraîchissement de session
    constants.ts        Rôles, navigation arabe, constantes métier
    env.ts              Variables d'environnement validées
    utils.ts            cn(), normalisation CIN / chiffres arabes
  types/
    database.ts         Types de la base (à régénérer via Supabase CLI)
    index.ts            Alias métier (Electeur, Cadre, Profile…)
  proxy.ts              Ex-middleware.ts (renommé dans Next.js 16)
docs/                   Cahier des charges
```

## Conventions

### RTL et arabe

- `dir="rtl"` et `lang="ar"` sont posés sur `<html>` dans
  [`src/app/layout.tsx`](src/app/layout.tsx) : tout en hérite.
- **Utiliser les propriétés logiques Tailwind** (`ms-*`, `me-*`, `ps-*`, `pe-*`,
  `start-*`, `end-*`, `text-start`, `text-end`) et jamais `ml-*`, `mr-*`,
  `left-*`, `right-*`, `text-left`, `text-right` — sinon la mise en page casse
  en RTL.
- Police : **Cairo** via `next/font/google`, sous-ensembles `arabic` + `latin`,
  auto-hébergée (aucune requête vers Google).
- CIN, téléphones et numéros de bureau de vote : appliquer la classe
  `.ltr-field` pour que les chiffres restent lisibles de gauche à droite au sein
  d'un texte arabe.

### Responsive

- **Mobile-first** : styles de base pour 360px, puis `sm:` / `md:` / `lg:` /
  `xl:` pour enrichir. Un breakpoint `xs` (360px) est disponible.
- Cible de test : 360 / 768 / 1024 / 1920 px.
- Zones tactiles ≥ 44px : utiliser `min-h-touch` / `min-w-touch` (le composant
  `Button` les applique déjà).
- Les tableaux deviennent des cartes empilées sur mobile ; les filtres passent
  dans un tiroir.

### Sécurité des données

Le projet manipule des données personnelles (CIN, téléphones). Dépôt à garder
**privé**.

- Le projet utilise le format d'API keys actuel de Supabase
  (`sb_publishable_…` / `sb_secret_…`), pas les anciennes clés JWT
  `anon` / `service_role`.
- `SUPABASE_SECRET_KEY` contourne le RLS : usage serveur exclusivement,
  jamais dans un fichier `"use client"`, jamais préfixé `NEXT_PUBLIC_`.
- Seul `.env.example` est versionné ; `.env*` est ignoré par git.
- Le RLS est la ligne de défense principale : les contrôles côté client sont un
  confort, pas une protection.

## Étape suivante

Prompt 2 du cahier des charges : migrations SQL Supabase (`supabase/migrations/`),
contrainte `UNIQUE` sur `electeurs.cin`, RLS et policies par rôle. Une fois les
tables créées, régénérer les types :

```bash
npx supabase gen types typescript --project-id <project-ref> > src/types/database.ts
```
# election
