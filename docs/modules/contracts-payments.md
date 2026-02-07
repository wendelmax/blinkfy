# Módulo: Assinaturas, Pagamentos e Contratos (FinOps)

Este módulo garante a viabilidade financeira e a segurança jurídica da plataforma para transações internacionais.

## 1. Modelos de Assinatura (Para Empresas)

Oferecemos flexibilidade para diferentes tamanhos de operação:

| Plano | Foco | Modelo de Cobrança |
| :--- | :--- | :--- |
| **Growth** | Startups em expansão | Assinatura mensal + Taxa por contratação (Success Fee). |
| **Enterprise** | Grandes volumes | Taxa fixa anual com contratações ilimitadas. |
| **On-Demand** | Contratações pontuais | Pagamento único por vaga aberta/preenchida. |

## 2. Modelos de Contratação Suportados

A plataforma facilita a parte burocrática para ambos os lados:

- **Independent Contractor (PJ):** A empresa contrata o desenvolvedor diretamente como prestador de serviços. A plataforma gera as Invoices e facilita o repasse.
- **Employer of Record (EOR):** A plataforma atua como o empregador legal local, lidando com todos os encargos trabalhistas do país do candidato (ex: CLT no Brasil), enquanto o candidato trabalha integramente para a empresa estrangeira.

## 3. Gateway de Pagamento Internacional

Integração com players como **Stripe**, **Deel** ou **Payoneer**:

- **Multimoeda:** A empresa paga em USD/EUR/GBP e o candidato recebe em BRL (ou sua moeda local) com taxas de conversão otimizadas.
- **Garantia de Recebimento (Escrow):** O valor da contratação (Success Fee) e o **Bônus de Retenção (90 dias)** ficam retidos na plataforma. O Success Fee é liberado no dia 1, enquanto o bônus é liberado automaticamente após o 3º mês de contrato ativo.
- **Compliance Fiscal:** Geração automática de relatórios para declaração de imposto de renda e conformidade bancária.

## 5. Fluxo Contábil e Geração de Documentos (NF vs Invoice)

Uma das maiores dores de cabeça para o desenvolvedor e para a empresa é a conciliação fiscal. A plataforma automatiza este processo:

### A. Geração de Invoice (Internacional)
- **O que é:** O documento legal que a empresa estrangeira utiliza para justificar o pagamento no balanço dela.
- **Automação:** Assim que o pagamento é processado via plataforma, uma Invoice é gerada automaticamente com todos os dados da empresa (VAT/Tax ID) e do candidato.
- **Formulários Fiscais:** Integração e armazenamento de formulários como **W-8BEN** (para empresas nos EUA), garantindo que não haja retenção indevida de impostos na fonte.

### B. Emissão de Nota Fiscal (NF-e - Local Brasil)
- **O que é:** O documento exigido pela Receita Federal/Prefeitura para o desenvolvedor (PJ) declarar sua receita no Brasil.
- **Integração via API:** Conexão direta com sistemas de emissão (ex: PlugNotas, e-Notas) para gerar a NF-e de serviço assim que o valor cai na conta do desenvolvedor.
- **CNAE e Tributação:** A plataforma sugere os códigos de serviço (CNAE) corretos para "Exportação de Serviços", que muitas vezes contam com isenção de ISS, aumentando o ganho líquido do candidato.

### C. Conciliação Automática de Câmbio
- **Câmbio Comercial + Spread:** A plataforma utiliza a taxa PTAX do dia ou taxas de mercado spot para garantir que o valor na Invoice bata exatamente com o valor convertido na Nota Fiscal, evitando problemas com o Banco Central.

---

> [!TIP]
> **Dica Contábil:** A plataforma oferece integração com contabilidades parceiras especializadas em tecnologia para garantir que o desenvolvedor esteja sempre no regime tributário mais vantajoso (Simples Nacional vs Lucro Presumido).
