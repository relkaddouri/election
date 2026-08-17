# Envoi du rapport Excel par e-mail — mise en service

Le rapport Excel complet (une feuille par مؤطر) peut partir de deux façons :

| Déclencheur | Qui | Où |
| --- | --- | --- |
| Manuel | Super Admin uniquement | التقارير → « إرسال بالبريد الإلكتروني » |
| Automatique | Planificateur Vercel, ~06:00 heure du Maroc | Réglé dans الإعدادات |

Les deux envoient à la **même adresse**, celle du champ « البريد الإلكتروني للمُستقبِل » dans الإعدادات.

---

## 1. Créer le compte Resend et récupérer la clé

1. Créez un compte sur <https://resend.com> (l'offre gratuite couvre 3 000 e-mails par mois et 100 par jour — très au-delà d'un rapport quotidien).
2. Dans le tableau de bord, ouvrez **API Keys** → **Create API Key**.
   - Nom : `election-rapports`
   - Permission : **Sending access** suffit — inutile de donner l'accès complet.
3. Copiez la clé (`re_…`). **Elle ne s'affiche qu'une seule fois.**

### Expéditeur : le point qui bloque le plus souvent

Sans configuration, l'application écrit depuis `onboarding@resend.dev`, le domaine de test de Resend. Cette adresse **n'accepte d'écrire qu'à l'adresse du titulaire du compte Resend**. Un envoi vers n'importe quelle autre boîte est refusé, avec un message du type _« You can only send testing emails to your own email address »_.

Pour envoyer à une adresse tierce :

1. Resend → **Domains** → **Add Domain**, saisissez votre domaine.
2. Ajoutez chez votre hébergeur DNS les enregistrements affichés (MX, SPF, DKIM), puis attendez la vérification.
3. Renseignez la variable `REPORT_FROM_EMAIL`, par exemple :
   ```
   REPORT_FROM_EMAIL=تقارير الناخبين <rapports@mondomaine.ma>
   ```

Tant que le domaine n'est pas vérifié, réglez le destinataire sur l'adresse du compte Resend : l'envoi manuel fonctionnera immédiatement, ce qui permet de tester la chaîne complète.

---

## 2. Générer le secret du cron

```bash
openssl rand -hex 32
```

Ce secret protège `/api/cron/send-report`. Vercel l'envoie automatiquement dans l'en-tête `Authorization: Bearer …` à chaque déclenchement.

⚠️ **Si `CRON_SECRET` n'est pas défini, la route refuse toutes les requêtes** (HTTP 503). C'est délibéré : une variable oubliée ne doit pas ouvrir l'export complet de la base au premier venu.

---

## 3. Déclarer les variables sur Vercel

Projet → **Settings** → **Environment Variables**. Ajoutez, pour les environnements **Production** (et Preview si vous y testez) :

| Variable | Valeur | Obligatoire |
| --- | --- | --- |
| `RESEND_API_KEY` | la clé `re_…` de l'étape 1 | oui |
| `CRON_SECRET` | la chaîne de l'étape 2 | oui |
| `REPORT_FROM_EMAIL` | `Nom <adresse@domaine-vérifié>` | non |

Un **redéploiement est nécessaire** : les variables ne sont lues qu'au démarrage.

En local, les mêmes variables se placent dans `.env.local` (voir `.env.example`).

---

## 4. Le planificateur

Il est déjà déclaré dans [`vercel.json`](../vercel.json) :

```json
{
  "crons": [{ "path": "/api/cron/send-report", "schedule": "0 5 * * *" }]
}
```

`0 5 * * *` = **05:00 UTC**, soit **06:00 au Maroc** (UTC+1 toute l'année, sauf pendant le Ramadan où le pays repasse à UTC+0 — le rapport part alors vers 05:00 locales).

Les crons Vercel se déclenchent **une fois par jour** sur l'offre Hobby ; la route s'exécute donc quotidiennement, mais c'est **elle** qui décide si l'envoi est dû, d'après la fréquence choisie dans الإعدادات. Changer la fréquence dans l'interface ne demande aucun redéploiement.

Le cron n'apparaît dans l'onglet **Cron Jobs** du projet qu'après un déploiement en production.

---

## 5. Vérifier

**Envoi manuel** — connectez-vous en Super Admin, renseignez le destinataire dans الإعدادات, enregistrez, puis التقارير → « إرسال بالبريد الإلكتروني ». Le résultat s'affiche sous le bouton.

**Route cron, en local :**

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/send-report
```

Réponses possibles :

| Corps | Signification |
| --- | --- |
| `{"sent":true,…}` | rapport envoyé, `last_report_sent_at` mis à jour |
| `{"sent":false,"reason":"envoi automatique désactivé"}` | l'interrupteur est sur إيقاف |
| `{"sent":false,"reason":"déjà envoyé le …"}` | un rapport est déjà parti aujourd'hui |
| `{"sent":false,"reason":"mensuel : jour 17, attendu 1"}` | ce n'est pas le jour prévu |
| HTTP 401 | en-tête `Authorization` absent ou secret erroné |
| HTTP 503 | `CRON_SECRET` non définie sur le serveur |

---

## Détails de fonctionnement

- **Un seul envoi par jour.** L'envoi manuel horodate `last_report_sent_at` au même titre que l'automatique : un rapport expédié à la main le matin annule celui de la journée.
- **Fuseau.** Le jour de la semaine et le quantième sont évalués en heure marocaine (`Africa/Casablanca`), pas en UTC. En UTC, un envoi mensuel réglé au 1er partirait le dernier jour du mois précédent.
- **Quantièmes 29, 30, 31.** Un jour absent du mois en cours bascule sur le dernier jour du mois : régler le 31 ne prive pas de rapport en février.
- **Traçabilité.** Les envois apparaissent dans سجل العمليات — « إرسال بالبريد الإلكتروني / تقرير » — au nom du Super Admin pour un envoi manuel, au nom de « النظام » pour un envoi automatique.
