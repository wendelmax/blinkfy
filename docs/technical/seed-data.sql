-- Standard Seed Data for International Recruitment Platform
-- Focus: Most used technologies and roles in the global market.

-- Roles Seeding
INSERT INTO roles (id, title) VALUES 
(gen_random_uuid(), 'Backend Engineer'),
(gen_random_uuid(), 'Frontend Engineer'),
(gen_random_uuid(), 'Fullstack Engineer'),
(gen_random_uuid(), 'DevOps / SRE'),
(gen_random_uuid(), 'Mobile Engineer (iOS/Android)'),
(gen_random_uuid(), 'Data Scientist / ML Engineer'),
(gen_random_uuid(), 'Systems Architect'),
(gen_random_uuid(), 'Engineering Manager');

-- Technologies Seeding (Standard Stacks)
INSERT INTO technologies (id, name, is_standard) VALUES 
-- Languages
(gen_random_uuid(), 'JavaScript / TypeScript', true),
(gen_random_uuid(), 'Python', true),
(gen_random_uuid(), 'Java', true),
(gen_random_uuid(), 'Go (Golang)', true),
(gen_random_uuid(), 'Rust', true),
(gen_random_uuid(), 'C# / .NET', true),
(gen_random_uuid(), 'PHP', true),
(gen_random_uuid(), 'Ruby', true),

-- Frontend Frameworks
(gen_random_uuid(), 'React', true),
(gen_random_uuid(), 'Next.js', true),
(gen_random_uuid(), 'Vue.js', true),
(gen_random_uuid(), 'Angular', true),

-- Backend Frameworks
(gen_random_uuid(), 'Node.js / Express', true),
(gen_random_uuid(), 'Spring Boot', true),
(gen_random_uuid(), 'Django', true),
(gen_random_uuid(), 'FastAPI', true),
(gen_random_uuid(), 'Laravel', true),

-- Infrastructure / Cloud
(gen_random_uuid(), 'AWS', true),
(gen_random_uuid(), 'Google Cloud (GCP)', true),
(gen_random_uuid(), 'Azure', true),
(gen_random_uuid(), 'Docker', true),
(gen_random_uuid(), 'Kubernetes', true),
(gen_random_uuid(), 'Terraform', true),

-- Databases
(gen_random_uuid(), 'PostgreSQL', true),
(gen_random_uuid(), 'MongoDB', true),
(gen_random_uuid(), 'Redis', true),
(gen_random_uuid(), 'MySQL', true);

-- Example of Custom Tech (User Added)
-- INSERT INTO technologies (id, name, is_standard) VALUES 
-- (gen_random_uuid(), 'Obscure-Legacy-Stack', false);
