# Cahier des charges — Application de gestion des électeurs
## (Complément : Responsive 100% + Prompts Claude Code + GitHub)

---

## 1. Ajout au cahier des charges — Responsive 100%

À insérer dans la **section 3 (Langue de l'application)** ou juste après :

### 3bis. Exigence de responsive design

L'application doit être **100% responsive**, c'est-à-dire parfaitement utilisable et lisible sur :

* **Desktop** (écrans larges, usage bureau/QG de campagne) ;
* **Tablette** (usage terrain, saisie par les encadrants) ;
* **Mobile/smartphone** (saisie rapide sur le terrain, souvent la situation la plus fréquente en pratique).

Contraintes précises :

* Aucune fonctionnalité ne doit être **inaccessible** sur mobile (formulaires, filtres, tableaux, PDF, dashboard).
* Les **tableaux** (liste des électeurs, liste des cadres) doivent se transformer en **cartes empilées** ou permettre un **scroll horizontal contrôlé** sur petits écrans, plutôt que de casser la mise en page.
* Les **formulaires** (ajout/modification d'électeur, de cadre) doivent passer d'une disposition en colonnes à une disposition **verticale en une colonne** sur mobile.
* Les **filtres combinés** (section 9-10) doivent rester utilisables sur mobile, par exemple via un panneau/tiroir (« drawer ») au lieu d'une barre latérale fixe.
* Le layout doit rester cohérent en **RTL** à toutes les tailles d'écran (le RTL ne doit pas casser sur mobile).
* Design **mobile-first** recommandé : on construit d'abord la version mobile, puis on l'enrichit pour tablette et desktop (cohérent avec Tailwind CSS déjà prévu dans le stack).
* Cibles techniques : bon fonctionnement à partir de 360px de large (petit smartphone) jusqu'à un grand écran desktop (1920px+), avec des points de rupture (breakpoints) intermédiaires standards (~640px, ~768px, ~1024px, ~1280px).
* Les boutons et zones tactiles doivent respecter une taille minimale confortable au doigt (44x44px environ) pour l'usage tablette/mobile sur le terrain.

---

## 2. Prompts pour Claude Code

Je te propose une série de prompts **séquentiels**, à donner un par un à Claude Code. Chaque prompt correspond à une étape cohérente du projet. Ne passe au prompt suivant qu'une fois l'étape validée (build qui passe, fonctionnalité testée).

> 💡 Conseil : garde ce fichier `brief-app-electeurs.md` à la racine du repo (par exemple dans un dossier `docs/`) et référence-le dans tes prompts avec `@docs/brief-app-electeurs.md` si Claude Code le supporte dans ton environnement — ça évite de tout recopier à chaque fois.

### Prompt 1 — Initialisation du projet

```
Initialise un nouveau projet Next.js (App Router) + TypeScript + Tailwind CSS
pour une application de gestion d'électeurs.

Contraintes :
- Toute l'UI sera en arabe, en RTL (Right To Left)
- L'application doit être responsive à 100% (mobile-first : 360px → 1920px+)
- Utilise Supabase comme backend (Auth + PostgreSQL + Storage)
- Configure dès maintenant :
  - la structure de dossiers (app/, components/, lib/, types/)
  - Tailwind avec dir="rtl" par défaut sur <html lang="ar" dir="rtl">
  - une police adaptée à l'arabe (ex: Cairo, Tajawal, ou IBM Plex Sans Arabic via next/font)
  - un fichier .env.example avec les variables Supabase
  - ESLint + Prettier

Le cahier des charges complet est dans docs/brief-app-electeurs.md, lis-le
entièrement avant de commencer.
```

### Prompt 2 — Schéma de base de données (Supabase)

```
En te basant sur la section "Schéma de base de données recommandé" du cahier
des charges (docs/brief-app-electeurs.md), crée les migrations SQL Supabase
pour les tables suivantes :

- profiles (id, full_name, phone, role, is_active, created_at)
- cadres (id, name, phone, is_active, created_at, updated_at)
- electeurs (id, cadre_id, cin UNIQUE, full_name, phone,
  polling_station_number, polling_location, created_at, updated_at)
- user_cadres (user_id, cadre_id)
- settings (id, party_name, territorial_community, logo_url, updated_at)
- audit_logs (id, user_id, action, entity_type, entity_id, created_at)

Exigences impératives :
- Contrainte UNIQUE stricte sur electeurs.cin au niveau PostgreSQL
  (pas seulement côté application)
- Active Row Level Security (RLS) sur toutes les tables
- Écris les policies RLS de base selon les 3 rôles : super_admin,
  saisie, parlementaire (lecture seule pour ce dernier)
- Un utilisateur "saisie" ne doit voir/modifier que les cadres présents
  dans user_cadres pour son user_id
- Ajoute les index nécessaires (cin, cadre_id, polling_station_number)
- Fournis les migrations dans un dossier supabase/migrations/
```

### Prompt 3 — Authentification et rôles

```
Implémente l'authentification avec Supabase Auth :
- Page de connexion en arabe RTL, responsive
- Gestion de session (middleware Next.js)
- 3 rôles : super_admin (👑), saisie (utilisateur de saisie), parlementaire
  (lecture seule) — voir sections 17 à 19 du cahier des charges
- Redirection selon le rôle après connexion
- Protection des routes selon permissions (un "saisie" ne doit pas pouvoir
  accéder aux pages Utilisateurs/Paramètres)
- Layout principal avec navigation latérale en arabe RTL :
  الرئيسية / المؤطرون / الناخبون / المستخدمون / التقارير / الإعدادات
  (navigation qui doit se transformer en menu tiroir/hamburger sur mobile)
```

### Prompt 4 — Gestion des cadres (المؤطرون)

```
Crée les pages CRUD pour les "cadres/encadrants" (section 13 du cahier des
charges) :
- Liste des cadres avec recherche, responsive (cartes sur mobile, tableau
  sur desktop)
- Ajout / modification d'un cadre (nom, téléphone)
- Le nombre d'électeurs par cadre doit être calculé automatiquement
  (COUNT), jamais saisi manuellement
- Page détail d'un cadre avec ses électeurs, recherche et filtres locaux
  (section 11)
- Tout le texte en arabe, RTL
```

### Prompt 5 — Gestion des électeurs + détection des doublons CIN

```
Implémente la fonctionnalité centrale de l'application : la gestion des
électeurs avec détection de doublons par CIN (sections 6, 7 et 15-16 du
cahier des charges).

- Formulaire d'ajout d'électeur en arabe (CIN, nom complet, téléphone,
  bureau de vote, lieu de vote, cadre)
- Vérification en temps réel du CIN pendant la saisie (debounce ~400ms) :
  si le CIN existe déjà, afficher immédiatement le message
  "هذا الناخب مسجل مسبقاً في النظام" avec le cadre concerné
- À la soumission, la contrainte UNIQUE PostgreSQL doit être la source de
  vérité finale (gérer proprement l'erreur de contrainte si la vérification
  front a été contournée ou en cas de saisie simultanée)
- رقم الترتيب (numéro d'ordre) généré automatiquement, jamais saisi
- Modification d'un électeur : la règle d'unicité CIN s'applique aussi si
  le CIN est modifié
- Formulaire 100% responsive : une colonne sur mobile, disposition en
  grille sur desktop
```

### Prompt 6 — Liste, recherche et filtres combinés

```
Implémente la page "الناخبون" (section 14) avec :
- Recherche par CIN, nom complet, téléphone
- Filtres combinables : cadre, bureau de vote, lieu de vote (sections 9-10)
- Affichage du compteur "عدد النتائج"
- Bouton "إعادة ضبط الفلاتر"
- Sur mobile : les filtres s'ouvrent dans un panneau/tiroir plutôt que
  d'occuper l'écran en permanence
- Le tableau des résultats se transforme en liste de cartes empilées sur
  mobile, reste un tableau classique sur desktop
- Pagination ou scroll infini pour gérer de grandes listes (milliers
  d'électeurs)
```

### Prompt 7 — Dashboard

```
Crée le dashboard (section 12), adapté selon le rôle connecté :
- Super Admin : total électeurs, total cadres, total utilisateurs,
  répartition par cadre (tableau + graphique simple)
- Parlementaire : vue lecture seule des mêmes statistiques globales
- 100% responsive : cartes de stats empilées verticalement sur mobile,
  grille sur desktop
- Tout en arabe RTL
```

### Prompt 8 — Génération PDF et export Excel

```
Implémente (section 20, 23) :
1. Génération PDF côté serveur pour un cadre donné :
   - En-tête avec logo (settings.logo_url), nom du parti, جماعة ترابية
     configurables
   - Informations du cadre + tableau des électeurs
   - Gestion propre du multi-pages, texte arabe correctement rendu en PDF
     (attention aux polices arabes compatibles PDF)
2. Export Excel complet (Super Admin uniquement) :
   - Un fichier .xlsx avec une feuille par cadre
   - En-tête de chaque feuille : logo, nom du parti, جماعة ترابية, nom du
     cadre, nombre d'électeurs
   - Colonnes : رقم الترتيب, رقم البطاقة الوطنية, الاسم الكامل, رقم الهاتف,
     رقم مكتب التصويت, مكان التصويت

Utilise une librairie adaptée au rendu arabe (ex: pdf-lib ou puppeteer côté
serveur pour le PDF, exceljs pour l'Excel).
```

### Prompt 9 — Paramètres, utilisateurs et audit

```
Implémente (sections 17-19, 21-22, 24) :
- Page "الإعدادات" (Super Admin uniquement) : nom du parti, جماعة ترابية,
  upload/changement du logo (Supabase Storage)
- Page "المستخدمون" (Super Admin uniquement) : créer un utilisateur,
  définir son rôle, l'affecter à un ou plusieurs cadres (table user_cadres)
- Journal d'audit "سجل العمليات" : enregistrer automatiquement les
  opérations importantes (ajout/modification/suppression d'électeur,
  création de cadre, etc.) avec utilisateur, action, date
- Toutes ces pages 100% responsives et en arabe RTL
```

### Prompt 10 — Import Excel (V2, à préparer dès maintenant côté architecture)

```
Prépare l'architecture pour un futur import Excel en masse (section 8),
sans forcément l'activer en V1 :
- Endpoint qui analyse un fichier Excel avant import
- Détection des CIN déjà en base parmi les lignes importées
- Retourne un résumé : total, nouveaux électeurs, doublons détectés,
  erreurs
- Interface (même si simplifiée pour l'instant) permettant de visualiser
  les doublons avant confirmation d'import
```

### Prompt 11 — Passage final responsive + QA

```
Fais une passe complète de vérification responsive sur toute l'application :
- Teste chaque page à 360px, 768px, 1024px et 1920px de large
- Vérifie qu'aucun élément ne déborde, que le RTL reste cohérent partout
- Vérifie que les zones tactiles (boutons, liens) font au moins ~44x44px
  sur mobile/tablette
- Vérifie que les formulaires, tableaux et filtres restent pleinement
  utilisables à toutes les tailles
- Corrige les problèmes trouvés
```

---

## 3. Mettre le projet sur GitHub

Je n'ai pas d'accès direct à ton compte GitHub depuis cette conversation (pas de connecteur GitHub connecté ici), donc voici les commandes à exécuter toi-même — soit dans ton terminal, soit en les demandant directement à Claude Code (il peut lancer `git`/`gh` pour toi dans ton environnement local).

### Étape 1 — Créer le dépôt sur GitHub

Option A (interface web) :
1. Va sur https://github.com/new
2. Nom du dépôt, ex. `electeurs-app`
3. Choisis **Privé** (recommandé, vu la nature des données personnelles — voir section 30 du brief sur les obligations de protection des données)
4. Ne coche pas "Initialize with README" si tu as déjà du code local

Option B (avec GitHub CLI, si installé) :
```bash
gh repo create electeurs-app --private --source=. --remote=origin
```

### Étape 2 — Initialiser Git localement et pousser le code

```bash
cd chemin/vers/ton-projet
git init
git add .
git commit -m "Initial commit: cahier des charges + setup projet"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/electeurs-app.git
git push -u origin main
```

### Étape 3 — .gitignore essentiel

Assure-toi d'avoir un `.gitignore` qui exclut au minimum :
```
node_modules/
.env
.env.local
.next/
*.log
```

⚠️ Important : ne commite **jamais** tes clés Supabase (`SUPABASE_SERVICE_ROLE_KEY` notamment) — seul `.env.example` (sans valeurs réelles) doit être versionné.

### Étape 4 — Demander à Claude Code de gérer les commits ensuite

Une fois le dépôt créé et le premier push fait, tu peux simplement demander à Claude Code, à chaque étape terminée :
```
Commit les changements avec un message clair décrivant ce qui a été fait,
puis pousse sur la branche main.
```

---

## 4. Ordre d'exécution recommandé

1. Créer le dépôt GitHub (section 3 ci-dessus)
2. Prompt 1 (init projet) → commit
3. Prompt 2 (schéma DB) → commit
4. Prompt 3 (auth/rôles) → commit
5. Prompt 4 (cadres) → commit
6. Prompt 5 (électeurs + doublons CIN — cœur du produit) → commit
7. Prompt 6 (recherche/filtres) → commit
8. Prompt 7 (dashboard) → commit
9. Prompt 8 (PDF/Excel) → commit
10. Prompt 9 (paramètres/utilisateurs/audit) → commit
11. Prompt 10 (architecture import Excel) → commit
12. Prompt 11 (QA responsive finale) → commit
