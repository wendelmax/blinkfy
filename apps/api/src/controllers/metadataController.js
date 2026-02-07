exports.getTechStacks = (req, res) => {
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
    res.json(techStacks);
};
