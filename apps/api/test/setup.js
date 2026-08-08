process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ||= 'postgresql://admin:password@localhost:5432/recruitment_platform_test';

let databaseName;

try {
    databaseName = new URL(process.env.DATABASE_URL).pathname.slice(1);
} catch {
    throw new Error('DATABASE_URL must be a valid URL for tests');
}

if (!databaseName.includes('test')) {
    throw new Error('DATABASE_URL must point to a database whose name includes "test"');
}
