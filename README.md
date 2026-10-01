# Clube DNA Depilamor

Portal React/Vite com Supabase para clientes, revendedoras e equipe interna. Inclui pedidos manuais do Omni, indicações, descontos, cashback em produtos, vouchers compartilháveis pelo WhatsApp, brindes, campanhas, configurações e histórico de operações.

A estrutura de banco, as permissões e as operações transacionais estão em [supabase/migrations/202610010001_clube_dna.sql](supabase/migrations/202610010001_clube_dna.sql).

**Antes de usar com dados reais, siga [docs/ATIVACAO.md](docs/ATIVACAO.md).** O frontend precisa da migração aplicada no Supabase. Convites internos também precisam da Edge Function `dna-invite`.

- `npm run dev`: desenvolvimento com Vite.
- `npm run build`: compilação de produção.
- `npm test`: testes de cálculos e banco PostgreSQL embutido.
- `npm run test:browser`: fluxos de interface com Chromium e Supabase interceptado; servidor de desenvolvimento deve estar ativo.

Neste ambiente, as dependências ficam fora do checkout para preservar o `node_modules` versionado. Consulte as instruções de instalação e validação no guia de ativação.
