const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const techStacks = [
    "Fullstack (Node/React)",
    "Backend (Java/Spring)",
    "Backend (Go)",
    "Backend (Python/Django)",
    "Backend (Node.js)",
    "Frontend (React)",
    "Frontend (Vue.js)",
    "Frontend (Angular)",
    "Mobile (React Native)",
    "Mobile (Flutter)",
    "Mobile (iOS/Swift)",
    "Mobile (Android/Kotlin)",
    "DevOps (AWS/Terraform)",
    "Data Science (Python)",
    "Data Engineering (Spark/Kafka)"
];

async function main() {
    console.log('Seeding tech stacks...');
    for (const stack of techStacks) {
        await prisma.techStack.upsert({
            where: { name: stack },
            update: {},
            create: { name: stack },
        });
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
