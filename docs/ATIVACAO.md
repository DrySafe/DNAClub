# Ativação do portal Clube DNA

A estrutura SQL foi aplicada em 01/10/2026 no projeto Supabase DNAClub (`gptofnrdirvycesycidw`), incluindo a correção de permissões das funções. Consulte `docs/STATUS_SUPABASE.md` para o resultado da validação. A função de convites ainda precisa ser publicada antes de utilizar convites internos.

## 1. Banco de dados

**Neste projeto, as migrações já foram aplicadas. Não execute novamente a migração inicial.** Para instalar em um projeto novo, execute no SQL Editor **uma vez** o conteúdo de `supabase/migrations/202610010001_clube_dna.sql`, com uma conexão de proprietário do banco. Também é possível aplicar a migração pelo fluxo habitual do Supabase CLI. A execução é transacional: uma falha não deve deixar metade da estrutura instalada.

A migração cria tabelas `dna_*`, políticas de acesso e operações transacionais. A migração complementar `202610010002_function_permissions.sql` restringe explicitamente as permissões padrão de funções do Supabase e deve acompanhar instalações por migrações. Não substitui nem apaga `profiles`, `sales` ou `referrals` do app anterior.

- Copia as identidades existentes em `auth.users`/`profiles`, preservando os perfis e códigos de indicação existentes.
- Revendedoras antigas sem categoria válida recebem inicialmente DNA Profissional; confira a classificação manual na tela Pessoas.
- Copia apenas pedidos antigos com titular inequívoco, número de pedido, valor positivo e data. Se o registro tiver simultaneamente `cliente_id` e `revendedor_id`, ele deve ser conciliado manualmente, sem presumir quem comprou.
- Pedidos importados ficam **pendentes**: uma aprovação no app anterior não comprova pagamento. Confirme o pagamento no Omni antes de liberar recompensas.
- Copia indicações antigas identificáveis como pendentes, para conferência. Não inventa pagamentos nem gera premiações retroativas automaticamente.
- Benefícios financeiros antigos não são inferidos de totais agregados: cadastre eventual saldo inicial pela ação Conceder benefício, com origem e justificativa.

Confira a quantidade e os titulares dos dados importados antes de liberar acesso. Registros ambíguos ou sem dados mínimos permanecem nas tabelas antigas e precisam ser conciliados pela equipe. Um erro de códigos duplicados deve ser resolvido nas identidades antes de reaplicar a migração, sem excluir participantes.

Se não houver administrador no cadastro anterior, crie sua conta pelo portal e atribua o acesso no SQL Editor, escolhendo a conta correta:

```sql
update public.dna_members
set role = 'admin', level = null
where email = 'EMAIL_DA_CONTA_RESPONSAVEL';
```

Não use a chave `service_role` no navegador. Todas as operações de saldo, aprovação, alteração de papéis e configurações passam por `dna_action`, com autorização no servidor. As tabelas permitem leitura conforme RLS; edição direta pelo cliente está bloqueada.

As tabelas antigas permanecem intactas. Antes de publicar, revise também suas políticas de acesso existentes: a proteção das novas tabelas não corrige permissões inseguras que já existam no modelo anterior.

## 2. Autenticação e convites

Configure o Site URL e as URLs de redirecionamento no Supabase Auth para o domínio real:

- `/app/inicio`: confirmação de cadastro;
- `/recuperar-senha?mode=reset`: recuperação e definição de senha.

O cadastro público sempre cria **cliente**, independentemente de metadados enviados pelo navegador. Revenda e acessos internos dependem de aprovação da equipe.

Para habilitar o botão Convidar da tela Pessoas, publique `supabase/functions/dna-invite/index.ts` como Edge Function `dna-invite`. Configure `APP_ORIGIN` com a origem HTTPS exata do portal, sem caminho nem barra final. `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são variáveis do ambiente da função, nunca do frontend. A função autentica o solicitante e exige papel admin antes de enviar um convite. O serviço de e-mail do Supabase precisa estar configurado.

A função de convites foi preparada, mas seu envio real não foi executado: depende da publicação da função e da configuração de e-mail. Cadastros públicos não dependem dela.

## 3. Configuração inicial

Com uma conta admin, abra Configurações:

1. Informe o WhatsApp da empresa com código do país e DDD.
2. Confira o período do programa de indicação e as regras por categoria.
3. Confira o catálogo de benefícios e brindes.
4. A validade inicial é 365 dias. Campanhas podem substituir o prazo por duração própria ou data final.
5. A combinação desconto + cashback começa habilitada. O limite de cashback começa em 50%, calculado sobre produtos após desconto, sem frete. Pode ser reduzido pelo administrador.

A categoria continua manual. Não foi implementada uma classificação automática sem o regulamento completo.

## 4. Operação e regras

- Cashback de todas as origens soma no saldo em R$, sem saque ou transferência. O extrato mantém a origem de cada crédito.
- Solicitações reservam créditos; a confirmação debita apenas o valor realmente aplicado. O excedente reservado é liberado.
- Usam-se primeiro os créditos próximos do vencimento. A validade é calculada com a configuração **atual**, inclusive para benefícios e vouchers antigos. Ao expirar um crédito, só sua parcela restante deixa de compor o saldo.
- Descontos são utilizados integralmente, um por pedido. Um desconto fixo maior que o valor dos produtos exige outro pedido; não gera troco nem saldo.
- A combinação e o teto de cashback são verificados novamente no banco na confirmação. Uma mudança de regra pode bloquear uma solicitação anterior. Cancelar e emitir outra solicitação é possível, sem consumir saldo.
- Percentuais de descontos pendentes acompanham a regra atual quando mantida a mesma modalidade. Alterar o tipo de recompensa afeta novas concessões: não transforma silenciosamente um saldo contabilizado em outro tipo de benefício. A origem e os valores concedidos permanecem auditáveis.
- Vouchers não têm prazo adicional: os benefícios e créditos vinculados precisam estar válidos na confirmação. Um código não transfere a titularidade.
- A equipe aplica o desconto no Omni/loja e registra o número do pedido e a utilização no portal. Não há integração automática com o ERP nem pagamento no portal.
- Desconto da indicada no primeiro pedido exige confirmação explícita da equipe. Sua aplicação é registrada antes do cálculo da premiação da indicadora.
- Devoluções exigem justificativa e restauram somente os valores efetivamente utilizados. Devolver não renova a validade.
- Antes de cancelar/estornar um pedido, devolva suas utilizações. Recompensas por indicação de origem são revogadas quando ainda não consumidas; se já consumidas, regularize as utilizações primeiro.
- Quando houver premiações de campanhas para os participantes envolvidos, revise-as e revogue-as com justificativa antes do estorno. Depois, reconfira as metas e conceda novamente o que ainda for devido. O portal bloqueia o estorno enquanto essas recompensas não estiverem regularizadas.
- Campanhas contam produtos efetivamente pagos e indicações aprovadas no período, sem frete. Cada nova premiação exige outro múltiplo da meta e respeita disponibilidade total e limite por pessoa. Campanhas percentuais de cashback descontam o que já foi concedido para evitar pagar duas vezes pelas mesmas compras.
- Campanhas podem ser conferidas após seu término enquanto estiverem ativas e o prazo fixo de utilização não tiver encerrado; somente operações dentro do período contam.
- Placa e kit são concedidos pela equipe, marcando entrega única. Concessões manuais e revogações sempre registram a justificativa.

## 5. Desenvolvimento e validação

Neste checkout, `node_modules` é versionado. Instale as dependências fora dele, como na configuração de ambiente existente, mantendo os arquivos desse diretório intactos. O `package-lock.json` agora contém todas as dependências do manifesto, incluindo ferramentas de teste.

```bash
mkdir -p /workspace/dnaclub-environment
cp /workspace/DNAClub/package.json /workspace/dnaclub-environment/package.json
cp /workspace/DNAClub/package-lock.json /workspace/dnaclub-environment/package-lock.json
npm ci --prefix /workspace/dnaclub-environment --cache /workspace/.npm-cache
# /workspace/node_modules deve apontar para as dependências externas já configuradas.
export PATH=/workspace/dnaclub-environment/node_modules/.bin:$PATH
cd /workspace/DNAClub
npm test
npm run dev -- --config /workspace/dnaclub-environment/vite.config.mjs --host 0.0.0.0 --port 5173 --strictPort
```

Em outro terminal, com o servidor ativo:

```bash
npm run test:browser
npm run build -- --outDir /workspace/dnaclub-environment/dist
```

Os testes de banco executam a migração real e os RPCs em PostgreSQL embutido via PGlite, com usuários e pedidos sintéticos. Incluem RLS, autorização, reserva, vencimento, regra atual, uso parcial, limite sem frete, devolução, campanhas e indicação. Essa verificação não substitui a validação no Supabase remoto após instalação.

Os testes de navegador usam Chromium e interceptam as chamadas ao Supabase com dados sintéticos. Não acessam contas nem fazem gravações de produção. Configure `CHROMIUM_PATH` para outro executável de Chromium e `DNA_APP_URL` para outra porta, se necessário.

O lint antigo continua sem ESLint/configuração declarados. Ele não foi utilizado como evidência de validação.

## 6. Conferência após ativação

Com contas de teste nos três perfis, faça um pedido de R$ 200 em produtos mais frete, aplique desconto de 10% e cashback de R$ 90: o limite deve ser R$ 90, independentemente do frete. Gere outro voucher combinado, desative a combinação e confirme que o voucher antigo também é bloqueado. Teste devolução com justificativa, vencimento de campanha e tentativa de consultar dados de outra conta.

As migrações SQL foram aplicadas e validadas no projeto DNAClub. Esta etapa não publicou o frontend, não implantou a Edge Function de convites e não enviou convites reais.
