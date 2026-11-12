/**
 * Apply payment + coupon migrations to remote Supabase.
 * Skips migrations already recorded in app_schema_migrations.
 *
 * Run: npm run db:migrate:payment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const MIGRATIONS = [
    'supabase/migrations/20260612000000_add_payment_provider.sql',
    'supabase/migrations/20260613000000_add_coupon_system.sql',
    'supabase/migrations/20260613000001_fix_coupon_security.sql',
    'supabase/migrations/20260614000000_payment_spec_phase1.sql',
    'supabase/migrations/20260614000001_fix_scholarship_rls.sql',
    'supabase/migrations/20260614000002_admin_pricing_tier.sql',
    'supabase/migrations/20260615000000_payment_spec_phase2.sql',
    'supabase/migrations/20260616000000_payment_fixes_phase3.sql',
    'supabase/migrations/20260617000000_coupon_security_hardening.sql',
];

function loadEnv() {
    const envPath = path.join(root, '.env');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx === -1) continue;
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
    }
}

loadEnv();

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!databaseUrl) {
    console.error(
        'Missing DATABASE_URL in .env\n' +
            'Get it from Supabase Dashboard → Project Settings → Database → Connection string (URI)',
    );
    process.exit(1);
}

const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
});

async function ensureMigrationTable() {
    await client.query(`
        CREATE TABLE IF NOT EXISTS public.app_schema_migrations (
            filename TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    `);
}

async function isApplied(filename) {
    const { rows } = await client.query(
        'SELECT 1 FROM public.app_schema_migrations WHERE filename = $1',
        [filename],
    );
    return rows.length > 0;
}

async function markApplied(filename) {
    await client.query(
        'INSERT INTO public.app_schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
        [filename],
    );
}

async function backfillAppliedMigrations() {
    const { rows } = await client.query('SELECT COUNT(*)::int AS c FROM public.app_schema_migrations');
    if (rows[0]?.c > 0) return;

    const checks = [
        [
            '20260612000000_add_payment_provider.sql',
            "EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='payment_provider')",
        ],
        [
            '20260613000000_add_coupon_system.sql',
            "EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='coupons')",
        ],
        [
            '20260613000001_fix_coupon_security.sql',
            "NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coupons' AND policyname='Anyone can read active coupons metadata')",
        ],
        [
            '20260614000000_payment_spec_phase1.sql',
            "EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='scholarship_applications')",
        ],
        [
            '20260614000001_fix_scholarship_rls.sql',
            "EXISTS (SELECT 1 FROM pg_policies WHERE tablename='scholarship_applications' AND policyname='Students can submit scholarship applications')",
        ],
        [
            '20260614000002_admin_pricing_tier.sql',
            "EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_user_pricing_tier')",
        ],
        [
            '20260615000000_payment_spec_phase2.sql',
            "EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='early_bird_price')",
        ],
        [
            '20260616000000_payment_fixes_phase3.sql',
            "EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='instalment_schedule_id')",
        ],
    ];

    for (const [filename, condition] of checks) {
        const { rows: okRows } = await client.query(`SELECT ${condition} AS ok`);
        if (okRows[0]?.ok) {
            await markApplied(filename);
            console.log(`  ↪ backfilled: ${filename}`);
        }
    }
}

try {
    await client.connect();
    await ensureMigrationTable();
    await backfillAppliedMigrations();
    console.log('Connected. Applying migrations…\n');

    let applied = 0;
    let skipped = 0;

    for (const relPath of MIGRATIONS) {
        const filename = path.basename(relPath);
        const migrationPath = path.join(root, relPath);

        if (!fs.existsSync(migrationPath)) {
            console.error(`Migration file not found: ${relPath}`);
            process.exit(1);
        }

        if (await isApplied(filename)) {
            console.log(`→ ${filename} (already applied, skip)`);
            skipped++;
            continue;
        }

        const sql = fs.readFileSync(migrationPath, 'utf8');
        console.log(`→ ${filename}`);
        await client.query(sql);
        await markApplied(filename);
        console.log(`  ✓ applied\n`);
        applied++;
    }

    console.log(`Done. ${applied} applied, ${skipped} skipped.`);
} catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
} finally {
    await client.end();
}
