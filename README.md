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

| Script                   | Rôle                                    |
| ------------------------ | --------------------------------------- |
| `npm run dev`            | Serveur de développement                |
| `npm run build`          | Build de production                     |
| `npm run typecheck`      | `tsc --noEmit`                          |
| `npm run lint`           | ESLint (`lint:fix` pour corriger)       |
| `npm run format`         | Prettier (`format:check` pour vérifier) |
| `npm run test:rls`       | Vérifie les policies RLS sur la base    |
| `npm run db:push`        | Applique les migrations en attente      |
| `npm run seed:electeurs` | Électeurs de test (`create` / `drop`)   |

## Structure

```
src/
  app/
    layout.tsx          Racine (<html lang="ar" dir="rtl">)
    login/              Page de connexion (hors coquille applicative)
    (app)/              Pages authentifiées — layout avec navigation
      page.tsx          Tableau de bord
      cadres/ electeurs/ utilisateurs/ rapports/ parametres/
      acces-refuse/     Refus explicite quand le rôle est insuffisant
  components/
    ui/                 Primitives (Button, Input…)
    layout/             Coquille, navigation, tiroir mobile
  lib/
    actions/auth.ts     Server Actions : connexion, déconnexion
    supabase/
      client.ts         Client navigateur (RLS)
      server.ts         Client serveur (RLS) + client admin (clé secrète)
      proxy.ts          Session + arbitrage anonyme / connecté
    auth.ts             getSessionUser, requireUser, requireRole
    constants.ts        Rôles, navigation arabe, constantes métier
    env.ts              Variables d'environnement validées
    utils.ts            cn(), normalisation CIN / chiffres arabes
  types/
    database.ts         Types de la base
    index.ts            Alias métier (Electeur, Cadre, Profile…)
  proxy.ts              Ex-middleware.ts (renommé dans Next.js 16)
supabase/
  migrations/           Migrations SQL (schéma, RLS, storage)
  tests/                Vérification RLS, comptes temporaires
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

## Base de données

Migrations dans [`supabase/migrations/`](supabase/migrations/), appliquées sur
le projet Supabase.

| Migration                             | Contenu                                      |
| ------------------------------------- | -------------------------------------------- |
| `…_initial_schema.sql`                | Tables, index, triggers, activation du RLS   |
| `…_rls_policies.sql`                  | Fonctions d'aide et policies par rôle        |
| `…_storage_logo.sql`                  | Bucket `public-assets` pour le logo du parti |
| `…_cadres_person_fields.sql`          | Le cadre devient une personne identifiée     |
| `…_cadres_view_and_cin_check.sql`     | Vue de comptage + vérification CIN           |
| `…_electeurs_view_and_cin_lookup.sql` | رقم الترتيب + détection de doublon           |
| `…_electeurs_insertion_sequence.sql`  | Ordre d'insertion déterministe               |

```bash
npm run db:push
```

Applique les migrations manquantes, chacune dans sa transaction, en s'appuyant
sur `supabase_migrations.schema_migrations` (la même table que la CLI Supabase).

### Règles structurantes

- **`cadres` et `electeurs` portent les mêmes champs personne** : `cin`,
  `full_name`, `phone`, `polling_station_number`, `polling_location`. Un même
  trigger (`normalize_person_row`) sert les deux tables.
- **Obligation des champs — la seule différence entre les deux tables :**

  |                          | `cadres`   | `electeurs` |
  | ------------------------ | ---------- | ----------- |
  | `cin`                    | requis     | requis      |
  | `full_name`              | requis     | requis      |
  | `phone`                  | facultatif | **requis**  |
  | `polling_station_number` | requis     | **requis**  |
  | `polling_location`       | requis     | **requis**  |

  Un électeur sans téléphone ni bureau de vote n'est pas exploitable le jour du
  scrutin. Les contraintes `CHECK (btrim(…) <> '')` rattrapent les saisies
  composées uniquement d'espaces, que le trigger de normalisation réduit à
  `NULL`.

- **`cin` est `UNIQUE` au niveau PostgreSQL dans chaque table.** Le trigger
  normalise le CIN avant écriture (chiffres arabes → occidentaux, espaces
  supprimés, majuscules) : l'unicité porte donc sur la forme canonique. Le code
  applicatif doit traiter l'erreur `23505` comme le verdict final, la
  vérification en temps réel n'étant qu'un confort de saisie.
- **L'unicité du CIN ne franchit pas la frontière des tables.** Un cadre peut
  figurer en parallèle dans `electeurs` avec le même CIN : un encadrant est
  souvent lui-même électeur de la circonscription. La détection de doublons
  d'électeurs ne consulte donc pas la table `cadres`.
- **Le rôle n'est jamais lu depuis `raw_user_meta_data`.** Ces métadonnées sont
  modifiables par l'utilisateur au signup ; tout nouveau compte démarre en
  `saisie`, seul un `super_admin` peut l'élever.
- **`audit_logs` est append-only** : aucune policy `UPDATE`/`DELETE`, y compris
  pour un `super_admin`.
- **`is_active = false` coupe tout accès**, sans avoir à supprimer le compte.
- Supprimer un cadre portant des électeurs échoue (`on delete restrict`).
- **Le nombre d'électeurs n'est jamais stocké.** La vue `cadres_with_counts`
  (en `security_invoker`, donc soumise au RLS de l'appelant) le dérive d'un
  `COUNT` : aucune colonne compteur, donc aucune désynchronisation possible.
- **La vérification du CIN passe par `cadre_cin_exists`**, une fonction
  `SECURITY DEFINER` qui ne renvoie qu'un booléen. Une requête ordinaire serait
  filtrée par le RLS et répondrait « CIN libre » pour un cadre hors périmètre,
  juste avant que la contrainte `UNIQUE` ne rejette l'écriture.
- **`electeur_cin_lookup` va plus loin : elle nomme le cadre détenteur**, comme
  l'exige le cahier des charges. Compromis assumé — un utilisateur « saisie »
  apprend qu'un CIN est pris par un cadre hors de son périmètre, et par qui.
  C'est le but même de la détection de doublons en campagne. Rien d'autre ne
  fuit : ni identité de l'électeur, ni téléphone, ni bureau de vote.
- **Les listes sont paginées côté PostgreSQL** (`range` + `count: "exact"`).
  « عدد النتائج » porte sur le total filtré, pas sur la page affichée. Le tri
  inclut `cadre_id` en départage : deux cadres homonymes suffiraient sinon à
  faire apparaître une ligne sur deux pages, ou sur aucune.
- **Les valeurs des filtres viennent d'une vue `DISTINCT`**
  (`electeurs_filter_options`), et non d'un chargement de toutes les lignes.
  Elle est restreinte au cadre sélectionné : aucune option proposée ne peut
  mener à zéro résultat.
- **رقم الترتيب n'est jamais stocké.** La vue `electeurs_ordered` le calcule par
  `row_number()` au sein de chaque cadre, ordonné par `electeurs.seq` (identité
  monotone). Une colonne persistée se trouerait à la première suppression ;
  départager par `created_at` échouerait sur les insertions en lot, où `now()`
  est identique pour toutes les lignes.

### Périmètre par rôle

|                    | `super_admin` | `saisie`                   | `parlementaire` |
| ------------------ | ------------- | -------------------------- | --------------- |
| cadres / électeurs | tout          | ses cadres (`user_cadres`) | lecture seule   |
| profils            | tout          | le sien                    | lecture seule   |
| paramètres         | écriture      | lecture                    | lecture         |
| journal d'audit    | lecture       | —                          | —               |

### Vérifier le RLS

```bash
npm run test:rls
```

32 assertions sur de vraies sessions authentifiées (périmètre `saisie`,
lecture seule du `parlementaire`, unicité CIN dans chaque table, cadre pouvant
aussi être électeur, détection de doublon hors périmètre, رقم الترتيب sans trou,
journal append-only, compte désactivé, accès anonyme).
Voir [`supabase/tests/rls.mjs`](supabase/tests/rls.mjs).

### Régénérer les types

`src/types/database.ts` est écrit à la main et vérifié contre le schéma réel.
Pour le régénérer (nécessite Docker, ou un `SUPABASE_ACCESS_TOKEN`) :

```bash
npx supabase gen types typescript --project-id <project-ref> > src/types/database.ts
```

### Appliquer les migrations

`db.<ref>.supabase.co` ne résout qu'en IPv6. Depuis un réseau IPv4, utiliser
l'URL du **Connection pooler** (Session mode, port 5432) du dashboard Supabase,
ou coller le SQL dans le SQL Editor.

## Authentification et autorisation

Trois barrières, du moins au plus fiable :

1. **`src/proxy.ts`** — rafraîchit la session et arbitre anonyme / connecté.
   Il ne fait **pas** de contrôle par rôle : cela imposerait une requête sur
   `profiles` à chaque navigation.
2. **`requireRole()` en tête de chaque page réservée** — c'est là que se joue
   l'autorisation. Une entrée de navigation masquée n'est pas une protection ;
   l'accès direct par URL passe par ici et aboutit à `/acces-refuse`.
3. **Le RLS** — la seule barrière qui tienne si les deux premières sont
   contournées.

`NAV_ITEMS` (dans `lib/constants.ts`) sert à la fois à filtrer l'affichage et à
décrire les rôles autorisés : les deux ne peuvent pas diverger.

### Créer le premier super_admin

Aucune inscription publique : les comptes se créent avec la clé secrète. Le
trigger `handle_new_user` force le rôle `saisie`, il faut donc l'élever
explicitement.

```bash
node --env-file=.env.local -e '
const { createClient } = require("@supabase/supabase-js");
const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
a.auth.admin.createUser({ email: "VOTRE@EMAIL", password: "VOTRE_MOT_DE_PASSE",
  email_confirm: true, user_metadata: { full_name: "الاسم الكامل" } })
 .then(({ data, error }) => error ? Promise.reject(error)
   : a.from("profiles").update({ role: "super_admin" }).eq("id", data.user.id))
 .then(() => console.log("super_admin créé"));'
```

Pour un aller-retour de vérification à trois rôles :

```bash
node --env-file=.env.local supabase/tests/seed-temp-users.mjs create
node --env-file=.env.local supabase/tests/seed-temp-users.mjs drop
```

## Étape suivante

Prompt 6 du cahier des charges : filtres combinés sur « الناخبون » (cadre,
bureau, lieu), tiroir de filtres sur mobile, et pagination — la liste actuelle
charge tous les résultats, ce qui ne tiendra pas à plusieurs milliers
d'électeurs.
