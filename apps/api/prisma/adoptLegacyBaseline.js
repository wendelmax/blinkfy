const { execFileSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');

const BASELINE_MIGRATION = '20260807230000_legacy_baseline';
const LEGACY_TABLES = [
    'User',
    'Session',
    'CandidateProfile',
    'Company',
    'TechStack',
    'Job',
    'Application',
    'Placement',
    'WalletTransaction',
    'ExchangeRateLog',
    'MarketRate',
    'EmailVerificationToken',
];

async function adoptLegacyBaseline() {
    const prisma = new PrismaClient();

    try {
        const tables = await prisma.$queryRaw`
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = current_schema()
        `;
        const tableNames = new Set(tables.map(({ tablename }) => tablename));
        const missingTables = LEGACY_TABLES.filter((table) => !tableNames.has(table));

        if (missingTables.length > 0) {
            throw new Error(
                `Cannot adopt the legacy baseline; missing tables: ${missingTables.join(', ')}`,
            );
        }
        if (tableNames.has('Workspace')) {
            throw new Error(
                'Cannot adopt the legacy baseline after the workspace migration has been applied.',
            );
        }

        const migrationTableExists = tableNames.has('_prisma_migrations');
        const appliedMigrations = migrationTableExists
            ? await prisma.$queryRaw`SELECT migration_name FROM "_prisma_migrations"`
            : [];
        if (appliedMigrations.some(({ migration_name }) => migration_name === BASELINE_MIGRATION)) {
            console.log(`Legacy baseline ${BASELINE_MIGRATION} is already adopted.`);
            return;
        }
    } finally {
        await prisma.$disconnect();
    }

    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    execFileSync(npx, ['prisma', 'migrate', 'resolve', '--applied', BASELINE_MIGRATION], {
        cwd: __dirname + '/..',
        env: process.env,
        stdio: 'inherit',
    });
}

adoptLegacyBaseline().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
