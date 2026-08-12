/**
 * Crée (ou supprime) des électeurs de test répartis sur les cadres existants.
 *
 *   node --env-file=.env.local supabase/tests/seed-electeurs.mjs create
 *   node --env-file=.env.local supabase/tests/seed-electeurs.mjs drop
 *
 * ⚠️ Agit sur le projet Supabase réel. Les CIN sont préfixés `TST` pour être
 * repérables et supprimables sans ambiguïté.
 */
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

const NOMS = [
  "محمد العلوي",
  "فاطمة الزهراء بنعيسى",
  "يوسف الإدريسي",
  "خديجة المرابط",
  "عبد الرحمان الفاسي",
  "سعاد بنكيران",
  "كريم الشرقاوي",
  "نادية الحسني",
  "رشيد بوعزة",
  "أمينة الطاهري",
  "حسن المنصوري",
  "زينب العماري",
];

const LIEUX = [
  ["101", "مدرسة النهضة الابتدائية"],
  ["102", "ثانوية الأطلس التأهيلية"],
  ["103", "دار الشباب المركزية"],
];

const mode = process.argv[2];

if (mode === "create") {
  const { data: cadres, error: cadreError } = await admin
    .from("cadres")
    .select("id, full_name")
    .order("full_name");
  if (cadreError) throw cadreError;
  if (!cadres.length) {
    console.log("Aucun cadre en base — créez d'abord un مؤطر.");
    process.exit(1);
  }

  const rows = NOMS.map((nom, index) => {
    const [station, lieu] = LIEUX[index % LIEUX.length];
    return {
      // Réparti en tourniquet sur les cadres existants.
      cadre_id: cadres[index % cadres.length].id,
      cin: `TST${String(100000 + index)}`,
      full_name: nom,
      phone: `06${String(10000000 + index * 137).slice(0, 8)}`,
      polling_station_number: station,
      polling_location: lieu,
    };
  });

  const { data, error } = await admin
    .from("electeurs")
    .insert(rows)
    .select("cin");
  if (error) throw error;
  console.log(`✅ ${data.length} électeurs créés`);

  const { data: counts } = await admin
    .from("cadres_with_counts")
    .select("full_name, electeurs_count")
    .order("full_name");
  console.table(counts);
} else if (mode === "drop") {
  const { data, error } = await admin
    .from("electeurs")
    .delete()
    .like("cin", "TST%")
    .select("cin");
  if (error) throw error;
  console.log(`🗑  ${data.length} électeurs de test supprimés`);
} else {
  console.log("Usage : … seed-electeurs.mjs create|drop");
  process.exit(1);
}
