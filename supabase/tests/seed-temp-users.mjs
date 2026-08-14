/**
 * Crée (ou supprime) trois comptes temporaires, un par rôle, pour vérifier
 * l'authentification et le layout dans un navigateur.
 *
 *   node --env-file=.env.local supabase/tests/seed-temp-users.mjs create
 *   node --env-file=.env.local supabase/tests/seed-temp-users.mjs drop
 *
 * ⚠️ Agit sur le projet Supabase réel. Comptes en @test.local, à supprimer
 * une fois la vérification faite.
 */
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

const PASSWORD = "Verif-2026!temp";
const ACCOUNTS = [
  { role: "super_admin", email: "admin@test.local", name: "مدير التجربة" },
  { role: "saisie", email: "saisie@test.local", name: "كاتب التجربة" },
  { role: "parlementaire", email: "parl@test.local", name: "برلماني التجربة" },
];

const mode = process.argv[2];

async function findByEmail(email) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  return data.users.find((u) => u.email === email);
}

if (mode === "create") {
  for (const acc of ACCOUNTS) {
    const existing = await findByEmail(acc.email);
    if (existing) await admin.auth.admin.deleteUser(existing.id);

    const { data, error } = await admin.auth.admin.createUser({
      email: acc.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: acc.name },
    });
    if (error) throw error;

    await admin
      .from("profiles")
      .update({ role: acc.role })
      .eq("id", data.user.id);

    console.log(`✅ ${acc.email} (${acc.role}) — mot de passe : ${PASSWORD}`);
  }
  console.log(
    `\nCadres créés : ${cadres.map((c) => c.id).join(", ")}\n` +
      `Le compte « saisie » n'est rattaché qu'au premier.`,
  );
} else if (mode === "drop") {
  for (const acc of ACCOUNTS) {
    const existing = await findByEmail(acc.email);
    if (existing) {
      await admin.auth.admin.deleteUser(existing.id);
      console.log(`🗑  ${acc.email}`);
    }
  }
  const { data } = await admin
    .from("cadres")
    .delete()
    .like("full_name", "مؤطر تجريبي%")
    .select("id");
  console.log(`🗑  ${data?.length ?? 0} cadre(s) de test`);
} else {
  console.log("Usage : … seed-temp-users.mjs create|drop");
  process.exit(1);
}
