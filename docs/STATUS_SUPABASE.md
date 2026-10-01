# Estado da instalação SQL — 01/10/2026

Projeto: **DNAClub**, referência `gptofnrdirvycesycidw`.

Aplicadas pela API administrativa do Supabase:

- `202610010001_clube_dna.sql`: tabelas, operações transacionais, políticas RLS, configuração inicial e importação de legado.
- `202610010002_function_permissions.sql`: revogação explícita das permissões padrão de funções para anônimos, seguida das concessões destinadas a cada perfil.

## Verificações no projeto real

- 7 contas presentes no portal: 2 administradores, 1 revendedora e 4 clientes.
- 1 pedido antigo importado como pendente para reconferência do pagamento no Omni.
- Tabelas antigas preservadas: 4 perfis e 1 registro em `sales`, sem exclusões.
- 10 tabelas novas com RLS habilitada e 10 políticas de leitura.
- Alteração direta de perfis e benefícios bloqueada para o papel `authenticated`.
- Função de operações internas sem permissão de execução para anônimos: requisição REST com a chave pública retornou HTTP 401 / PostgreSQL 42501.
- Consulta pública de configuração pelo mesmo caminho usado pelo app retornou HTTP 200.
- Gatilho de criação de perfil instalado em `auth.users`.
- Teste transacional com concessão de R$ 100 de cashback, reserva de R$ 40 e cancelamento. A leitura de membros foi restrita ao titular sob o papel autenticado. A transação foi revertida: nenhum saldo, voucher ou concessão de teste permaneceu.
- Após a validação, benefícios e indicações continuam sem registros; o pedido real permanece pendente.

A configuração inicial mantém validade de 365 dias, teto de cashback de 50%, combinação habilitada e período do programa de indicação de 15/09/2026 a 31/12/2026. O WhatsApp da empresa deve ser preenchido pelo administrador no portal.

## Pendências fora do SQL

- Publicar a Edge Function `dna-invite`, definir `APP_ORIGIN` e conferir o serviço de e-mail para convites internos.
- Conferir as URLs de redirecionamento do Supabase Auth para o domínio do portal.
- Validar login no navegador com as contas reais e conferir a classificação e os dados importados.

As migrações foram executadas pela API administrativa, não pelo Supabase CLI. Não reaplique a migração inicial neste projeto: para adoção posterior do CLI, concilie o histórico de migrações antes de usar `db push`.

O token administrativo não foi escrito em arquivos do repositório. Os testes e registros apresentados aqui não contêm seu valor.
