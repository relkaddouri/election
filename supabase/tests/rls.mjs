/**
 * Vérification comportementale des policies RLS.
 *
 *   npm run test:rls
 *
 * ⚠️ S'exécute sur la base pointée par .env.local — donc sur le projet réel.
 * Le script crée trois utilisateurs de test, deux cadres et quelques électeurs,
 * puis supprime tout dans son bloc `finally`. Ne pas l'exécuter sur une base
 * contenant des données de production sans avoir relu le nettoyage.
 *
 * Tester le RLS en interrogeant `pg_policies` ne prouve rien : seules de vraies
 * sessions authentifiées démontrent que les policies produisent l'effet voulu.
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PK = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SK = process.env.SUPABASE_SECRET_KEY;
const admin = createClient(URL, SK, { auth: { persistSession: false } });

const PW = "Test-" + Math.random().toString(36).slice(2) + "!A9";
const users = {
  super_admin: `t-admin-${Date.now()}@example.com`,
  saisie: `t-saisie-${Date.now()}@example.com`,
  parlementaire: `t-parl-${Date.now()}@example.com`,
};
const ids = {};
let cadreA, cadreB;
const created = [];
let pass = 0,
  fail = 0;

const check = (label, ok, detail = "") => {
  console.log(
    `${ok ? "  ✅" : "  ❌"} ${label}${detail ? ` — ${detail}` : ""}`,
  );
  if (ok) pass++;
  else fail++;
};

async function session(email) {
  const c = createClient(URL, PK, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PW });
  if (error) throw new Error(`connexion ${email} : ${error.message}`);
  return c;
}

try {
  // --- Montage ---------------------------------------------------------------
  for (const [role, email] of Object.entries(users)) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PW,
      email_confirm: true,
      user_metadata: { full_name: `Test ${role}`, role: "super_admin" },
    });
    if (error) throw error;
    ids[role] = data.user.id;
  }

  console.log("\n— Trigger de création de profil —");
  const { data: profs } = await admin
    .from("profiles")
    .select("id, role, full_name")
    .in("id", Object.values(ids));
  check("un profil créé automatiquement par utilisateur", profs?.length === 3);
  check(
    "role forcé à 'saisie' malgré user_metadata.role='super_admin'",
    profs?.every((p) => p.role === "saisie"),
    "pas d'auto-escalade au signup",
  );

  for (const [role, id] of Object.entries(ids)) {
    await admin.from("profiles").update({ role }).eq("id", id);
  }

  const { data: cs } = await admin
    .from("cadres")
    .insert([
      {
        cin: "TESTCADREA",
        full_name: "مؤطر أ",
        polling_station_number: "1",
        polling_location: "مكان أ",
      },
      {
        cin: "TESTCADREB",
        full_name: "مؤطر ب",
        polling_station_number: "2",
        polling_location: "مكان ب",
      },
    ])
    .select("id, full_name");
  [cadreA, cadreB] = cs.map((c) => c.id);
  created.push(...cs.map((c) => c.id));

  await admin.from("electeurs").insert([
    {
      cadre_id: cadreA,
      cin: "AA1111",
      full_name: "ناخب أ",
      phone: "0600000000",
      polling_station_number: "1",
      polling_location: "مكان",
    },
    {
      cadre_id: cadreB,
      cin: "BB2222",
      full_name: "ناخب ب",
      phone: "0600000000",
      polling_station_number: "1",
      polling_location: "مكان",
    },
  ]);

  // --- Normalisation + unicité CIN ------------------------------------------
  console.log("\n— Unicité et normalisation du CIN (contrainte PostgreSQL) —");
  const dup = await admin.from("electeurs").insert({
    cadre_id: cadreA,
    cin: "AA1111",
    full_name: "doublon",
    phone: "0600000000",
    polling_station_number: "1",
    polling_location: "مكان",
  });
  check("CIN identique rejeté", dup.error?.code === "23505", dup.error?.code);

  const dupArabe = await admin.from("electeurs").insert({
    cadre_id: cadreA,
    cin: " aa١١١١ ",
    full_name: "doublon arabe",
    phone: "0600000000",
    polling_station_number: "1",
    polling_location: "مكان",
  });
  check(
    "« aa١١١١ » (chiffres arabes + espaces + minuscules) reconnu comme AA1111",
    dupArabe.error?.code === "23505",
    dupArabe.error?.code ?? "ACCEPTÉ À TORT",
  );

  const dupCadre = await admin.from("cadres").insert({
    cin: "testcadrea",
    full_name: "cadre doublon",
    polling_station_number: "9",
    polling_location: "مكان",
  });
  check(
    "CIN de cadre dupliqué rejeté (et normalisé en majuscules)",
    dupCadre.error?.code === "23505",
    dupCadre.error?.code ?? "ACCEPTÉ À TORT",
  );

  // L'unicité est volontairement limitée à chaque table : un encadrant est
  // souvent lui-même électeur de la circonscription.
  const memeCin = await admin.from("electeurs").insert({
    cadre_id: cadreA,
    cin: "TESTCADREA",
    full_name: "المؤطر كناخب",
    phone: "0600000000",
    polling_station_number: "1",
    polling_location: "مكان",
  });
  check(
    "un cadre PEUT aussi être saisi comme électeur avec le même CIN",
    !memeCin.error,
    memeCin.error?.code ?? "accepté",
  );

  // --- Détection de doublon d'électeur --------------------------------------
  console.log("\n— Détection de doublon d'électeur (sections 15-16) —");
  const s = await session(users.saisie);

  const { data: lookup } = await s.rpc("electeur_cin_lookup", {
    p_cin: " bb٢٢٢٢ ",
    p_exclude_id: null,
  });
  check(
    "le doublon est détecté et le cadre nommé",
    lookup?.length === 1 && lookup[0].cadre_full_name === "مؤطر ب",
    lookup?.[0]?.cadre_full_name ?? "AUCUN DOUBLON DÉTECTÉ",
  );

  const { data: libre } = await s.rpc("electeur_cin_lookup", {
    p_cin: "ZZ999999",
    p_exclude_id: null,
  });
  check("un CIN libre ne remonte aucun doublon", libre?.length === 0);

  // رقم الترتيب : dérivé de la séquence d'insertion, jamais stocké ni saisi.
  //
  // La numérotation est PAR CADRE (`partition by cadre_id`) : elle repart à 1
  // pour chacun. Vérifier la suite globale n'aurait de sens que si l'on ne
  // voyait qu'un seul cadre — ce qui n'est plus le cas.
  const { data: ordered } = await s
    .from("electeurs_ordered")
    .select("order_number, cadre_id")
    .order("cadre_id")
    .order("order_number");

  const parCadre = new Map();
  for (const row of ordered ?? []) {
    parCadre.set(row.cadre_id, [
      ...(parCadre.get(row.cadre_id) ?? []),
      row.order_number,
    ]);
  }
  const numérotationSaine = [...parCadre.values()].every((numéros) =>
    numéros.every((n, index) => n === index + 1),
  );
  check(
    "رقم الترتيب repart à 1 dans chaque cadre, sans trou",
    parCadre.size > 0 && numérotationSaine,
    [...parCadre.values()].map((n) => `[${n.join(",")}]`).join(" "),
  );

  // --- saisie ----------------------------------------------------------------
  console.log("\n— Rôle « saisie » (accès à tous les cadres) —");
  const { data: tousCadres } = await admin.from("cadres").select("id");
  const sCadres = await s.from("cadres").select("id, full_name");
  check(
    "voit TOUS les cadres, sans restriction d'affectation",
    sCadres.data?.length === tousCadres?.length,
    `${sCadres.data?.length} sur ${tousCadres?.length}`,
  );

  const { count: tousElecteurs } = await admin
    .from("electeurs")
    .select("*", { count: "exact", head: true });
  const sElecteurs = await s.from("electeurs").select("cin");
  check(
    "voit TOUS les électeurs",
    sElecteurs.data?.length === tousElecteurs,
    `${sElecteurs.data?.length} sur ${tousElecteurs}`,
  );

  // Le cadre B n'est plus « hors périmètre » : il doit être modifiable.
  const sInsertB = await s.from("electeurs").insert({
    cadre_id: cadreB,
    cin: "OPEN0001",
    full_name: "ناخب في المؤطر ب",
    phone: "0600000000",
    polling_station_number: "1",
    polling_location: "مكان",
  });
  check(
    "peut ajouter un électeur dans n'importe quel cadre",
    !sInsertB.error,
    sInsertB.error?.code ?? "accepté",
  );

  const sUpdB = await s
    .from("cadres")
    .update({ full_name: "مؤطر ب معدَّل" })
    .eq("id", cadreB)
    .select("id");
  check(
    "peut modifier n'importe quel cadre",
    sUpdB.data?.length === 1,
    sUpdB.error?.code ?? `${sUpdB.data?.length} ligne(s)`,
  );

  // --- Création de cadres par le rôle « saisie » ----------------------------
  const nouveauCadreId = crypto.randomUUID();
  const sCadreInsert = await s.from("cadres").insert({
    id: nouveauCadreId,
    cin: "SAISIECREE",
    full_name: "مؤطر أنشأه الكاتب",
    polling_station_number: "9",
    polling_location: "مكان",
    // Tentative de s'attribuer la création à quelqu'un d'autre.
    created_by: ids.super_admin,
  });
  check(
    "un « saisie » peut créer un cadre",
    !sCadreInsert.error,
    sCadreInsert.error?.code ?? "accepté",
  );
  created.push(nouveauCadreId);

  const { data: cadreCree } = await s
    .from("cadres")
    .select("created_by, updated_by")
    .eq("id", nouveauCadreId)
    .maybeSingle();
  check(
    "le cadre créé lui est immédiatement visible",
    cadreCree != null,
    cadreCree ? "visible" : "INVISIBLE",
  );
  check(
    "created_by porte le vrai auteur, la valeur envoyée est ignorée",
    cadreCree?.created_by === ids.saisie,
    cadreCree?.created_by === ids.super_admin
      ? "FALSIFICATION ACCEPTÉE"
      : "auteur réel",
  );

  const { data: cadreMaj } = await s
    .from("cadres")
    .update({ full_name: "مؤطر معدَّل", created_by: ids.super_admin })
    .eq("id", nouveauCadreId)
    .select("created_by")
    .maybeSingle();
  check(
    "created_by reste figé lors d'une modification",
    cadreMaj?.created_by === ids.saisie,
    cadreMaj?.created_by === ids.super_admin ? "RÉÉCRIT" : "figé",
  );

  const sCadreDelete = await s
    .from("cadres")
    .delete()
    .eq("id", nouveauCadreId)
    .select("id");
  check(
    "un « saisie » ne peut PAS supprimer un cadre",
    sCadreDelete.error != null || sCadreDelete.data?.length === 0,
    sCadreDelete.error?.code ?? `${sCadreDelete.data?.length} ligne(s)`,
  );

  const sProfiles = await s.from("profiles").select("id");
  check(
    "ne voit que son propre profil",
    sProfiles.data?.length === 1,
    `${sProfiles.data?.length} profil(s)`,
  );
  const sUsers = await s
    .from("profiles")
    .update({ role: "super_admin" })
    .eq("id", ids.saisie)
    .select();
  check(
    "ne peut PAS s'auto-promouvoir super_admin",
    sUsers.error != null || sUsers.data?.length === 0,
    sUsers.error?.code ?? `${sUsers.data?.length} ligne(s)`,
  );
  const sSettings = await s
    .from("settings")
    .update({ party_name: "piraté" })
    .neq("id", "00000000-0000-0000-0000-000000000000")
    .select();
  check(
    "ne peut PAS modifier les paramètres",
    sSettings.error != null || sSettings.data?.length === 0,
  );

  // --- parlementaire ---------------------------------------------------------
  console.log("\n— Rôle « parlementaire » (lecture seule) —");
  const p = await session(users.parlementaire);
  const pCadres = await p.from("cadres").select("id");
  check(
    "voit tous les cadres",
    pCadres.data?.length >= 2,
    `${pCadres.data?.length} cadre(s)`,
  );
  const pElecteurs = await p.from("electeurs").select("id");
  check(
    "voit tous les électeurs",
    pElecteurs.data?.length >= 3,
    `${pElecteurs.data?.length} électeur(s)`,
  );
  const pInsert = await p.from("electeurs").insert({
    cadre_id: cadreA,
    cin: "PP5555",
    full_name: "interdit",
    phone: "0600000000",
    polling_station_number: "1",
    polling_location: "مكان",
  });
  check(
    "ne peut PAS créer d'électeur",
    pInsert.error?.code === "42501",
    pInsert.error?.code ?? "ACCEPTÉ À TORT",
  );
  const pUpdate = await p
    .from("electeurs")
    .update({ full_name: "modifié" })
    .eq("cin", "AA1111")
    .select();
  check(
    "ne peut PAS modifier d'électeur",
    pUpdate.error != null || pUpdate.data?.length === 0,
  );
  const pDelete = await p
    .from("electeurs")
    .delete()
    .eq("cin", "AA1111")
    .select();
  check(
    "ne peut PAS supprimer d'électeur",
    pDelete.error != null || pDelete.data?.length === 0,
  );

  // --- super_admin -----------------------------------------------------------
  console.log("\n— Rôle « super_admin » —");
  const a = await session(users.super_admin);
  const aCadres = await a.from("cadres").select("id");
  check("voit tous les cadres", aCadres.data?.length >= 2);
  const aInsert = await a
    .from("cadres")
    .insert({
      cin: "TESTCADREC",
      full_name: "مؤطر ج",
      polling_station_number: "3",
      polling_location: "مكان ج",
    })
    .select("id");
  check("peut créer un cadre", !aInsert.error);
  if (aInsert.data?.[0]) created.push(aInsert.data[0].id);
  const aProfiles = await a.from("profiles").select("id");
  check(
    "voit tous les profils",
    aProfiles.data?.length >= 3,
    `${aProfiles.data?.length} profil(s)`,
  );

  // --- audit_logs ------------------------------------------------------------
  console.log("\n— Journal d'audit (append-only) —");
  const logIns = await a
    .from("audit_logs")
    .insert({
      user_id: ids.super_admin,
      action: "test",
      entity_type: "electeur",
    })
    .select("id");
  check("un utilisateur peut journaliser son action", !logIns.error);
  const logSpoof = await a
    .from("audit_logs")
    .insert({ user_id: ids.saisie, action: "usurpé", entity_type: "electeur" });
  check(
    "ne peut PAS journaliser sous l'identité d'un autre",
    logSpoof.error?.code === "42501",
    logSpoof.error?.code ?? "ACCEPTÉ À TORT",
  );
  const logDel = await a.from("audit_logs").delete().neq("action", "").select();
  check(
    "même un super_admin ne peut PAS effacer le journal",
    logDel.error != null || logDel.data?.length === 0,
  );
  const logRead = await s.from("audit_logs").select("id");
  check(
    "un « saisie » ne peut PAS lire le journal",
    logRead.data?.length === 0,
    `${logRead.data?.length} ligne(s)`,
  );

  // --- utilisateur désactivé -------------------------------------------------
  console.log("\n— Utilisateur désactivé —");
  await admin
    .from("profiles")
    .update({ is_active: false })
    .eq("id", ids.saisie);
  const s2 = await session(users.saisie);
  const offCadres = await s2.from("cadres").select("id");
  check(
    "is_active=false coupe tout accès",
    offCadres.data?.length === 0,
    `${offCadres.data?.length} cadre(s)`,
  );

  // --- anon ------------------------------------------------------------------
  console.log("\n— Visiteur non authentifié —");
  const anon = createClient(URL, PK, { auth: { persistSession: false } });
  const anonRead = await anon.from("electeurs").select("id");
  check(
    "aucun accès aux électeurs sans session",
    anonRead.error != null || anonRead.data?.length === 0,
    anonRead.error?.code ?? `${anonRead.data?.length} ligne(s)`,
  );
} finally {
  // --- Nettoyage -------------------------------------------------------------
  await admin.from("electeurs").delete().in("cadre_id", created);
  await admin.from("audit_logs").delete().in("user_id", Object.values(ids));
  await admin.from("cadres").delete().in("id", created);
  for (const id of Object.values(ids)) await admin.auth.admin.deleteUser(id);
  console.log(`\n${"=".repeat(52)}\n  ${pass} réussis, ${fail} échoués`);
  console.log("  données de test supprimées");
  process.exit(fail ? 1 : 0);
}
