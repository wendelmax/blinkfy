# Módulo: Recrutamento, Sourcing e Sourcing Inteligente

Este módulo é o "motor de entrada" da plataforma, responsável por captar, parsear e ranquear candidatos de forma proativa.

## 1. Pipeline de Sourcing

O sistema integra múltiplas fontes para criar um perfil unificado do candidato:

### A. Parsing de Currículos (ATS 2.0)
- **Extração de Dados:** Uso de LLMs para extrair não apenas palavras-chave, mas o *contexto* da experiência (ex: "Gerenciou equipe de 10 pessoas" vs "Participou de equipe").
- **Normalização de Stacks:** Converte sinônimos (ex: "React.js", "ReactJS", "React") para uma base padronizada para busca precisa.

### B. Análise de LinkedIn
- **Scraping Ético & API:** Captura de histórico profissional, recomendações e conexões.
- **Análise de Estabilidade:** IA avalia o tempo médio de permanência em empresas para prever retenção.

### C. Auditoria de Portfólio (GitHub)
- **Tech Stack Real:** A IA analisa os repositórios para identificar quais linguagens o candidato *realmente* usa, além do que está escrito no CV.
- **Qualidade de Código:** Avaliação automática de:
    - Boas práticas (Clean Code).
    - Presença de testes unitários.
    - Qualidade da documentação (Readmes).
    - Frequência de contribuições (Commit graph).

## 2. O Algoritmo de Match (Ranking)

O ranking não é baseado apenas em skills técnicas, mas em um "Triângulo de Match":

1.  **Tecnologia (Hard Skills):** Match entre a stack da vaga e o que foi auditado no GitHub/Currículo.
2.  **Cultura & Contexto:** Match entre o tipo de empresa (Startup, Enterprise, Consultoria) e a experiência prévia do candidato.
3.  **Comunicação (Soft Skills):** Score preliminar baseado na clareza do perfil e interações iniciais.

## 3. Fluxo do Recrutador (Contratante)

1.  **Job Posting:** O contratante define a vaga e os pesos para cada "nuance" (ex: "Dobro de peso para experiência com Microserviços").
2.  **Filtro Automático:** O sistema apresenta o "Top 10" imediatamente.
3.  **Interação Preditiva:** O sistema sugere o melhor "hook" de abordagem baseado nos interesses do candidato detectados na IA.

---

> [!IMPORTANT]
> **Segurança Antifraude:** O sistema verifica se o perfil do GitHub e LinkedIn pertencem à mesma pessoa através de cruzamento de metadados e fotos de perfil.
