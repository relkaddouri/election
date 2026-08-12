/**
 * Applique les migrations non encore jouées sur la base pointée par
 * DATABASE_URL, chacune dans sa propre transaction.
 *
 *   npm run db:push
 *
 * La CLI Supabase ferait la même chose, mais `supabase db push` passe par un
 * conteneur Docker, absent de cette machine.
 */
import pg from "pg";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "migrations",
);

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
});
await client.connect();

await client.query(`
  create schema if not exists supabase_migrations;
  create table if not exists supabase_migrations.schema_migrations (
    version text primary key, statements text[], name text)
`);

let applied = 0;
let failed = 0;

for (const file of readdirSync(DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort()) {
  const version = file.split("_")[0];
  const { rows } = await client.query(
    "select 1 from supabase_migrations.schema_migrations where version = $1",
    [version],
  );
  if (rows.length) {
    console.log(`⏭  ${file}`);
    continue;
  }

  try {
    await client.query("begin");
    await client.query(readFileSync(path.join(DIR, file), "utf8"));
    await client.query(
      "insert into supabase_migrations.schema_migrations(version, name) values ($1, $2)",
      [version, file],
    );
    await client.query("commit");
    console.log(`✅ ${file}`);
    applied++;
  } catch (error) {
    await client.query("rollback");
    console.log(`❌ ${file}\n   ${error.message}`);
    failed++;
  }
}

await client.end();
console.log(`\n${applied} appliquée(s), ${failed} en échec`);
process.exit(failed ? 1 : 0);
