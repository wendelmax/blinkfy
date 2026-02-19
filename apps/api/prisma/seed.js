const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const techStacks = [
    'Fullstack (Node/React)',
    'Backend (Java/Spring)',
    'Backend (Go)',
    'Backend (Python/Django)',
    'Backend (Node.js)',
    'Frontend (React)',
    'Frontend (Vue.js)',
    'Frontend (Angular)',
    'Mobile (React Native)',
    'Mobile (Flutter)',
    'DevOps (AWS/Terraform)',
    'Data Science (Python)',
    'Data Engineering (Spark/Kafka)',
];

const marketRates = [
    { roleLabel: 'Senior Backend', salaryAvgUsd: 8000 },
    { roleLabel: 'Senior Frontend', salaryAvgUsd: 7500 },
    { roleLabel: 'Mid Backend', salaryAvgUsd: 5500 },
    { roleLabel: 'Junior', salaryAvgUsd: 3500 },
];

async function main() {
    console.log('Seeding tech stacks...');
    for (const name of techStacks) {
        await prisma.techStack.upsert({
            where: { name },
            update: {},
            create: { name },
        });
    }
    console.log('Seeding market rates...');
    const existingRates = await prisma.marketRate.count();
    if (existingRates === 0) {
        for (const r of marketRates) {
            await prisma.marketRate.create({ data: r });
        }
    }
    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
