-- Apply as the Supabase database owner. Existing legacy tables are preserved.
begin;
create table if not exists public.dna_members (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '', email text not null default '', phone text not null default '', cpf_cnpj text not null default '',
 role text not null default 'cliente' check(role in ('cliente','revendedor','financeiro','admin')),
 level text check(level in ('DNA Profissional','DNA Referência','DNA Master','DNA MOR')),
 referral_code text unique not null default ('DNA-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
 created_at timestamptz not null default now(), check(role<>'revendedor' or level is not null)
);
create table if not exists public.dna_settings (
 id boolean primary key default true check(id), value jsonb not null, updated_at timestamptz not null default now()
);
insert into public.dna_settings(id,value) values(true,'{
 "company_whatsapp":"", "classification_description":"Classificação e reavaliação realizadas manualmente pela equipe Depilamor.",
 "gift_catalog":["Placa DNA MOR","Kit DNA MOR"],
 "level_benefits":{
 "DNA Profissional":["Selo digital DNA Profissional","Prioridade de repost e compartilhamento de conteúdo","Prioridade de atendimento no WhatsApp"],
 "DNA Referência":["Selo digital DNA Referência","Acesso antecipado a lançamentos","Prioridade de repost e compartilhamento de conteúdo","Prioridade de atendimento no WhatsApp"],
 "DNA Master":["Selo digital DNA Master","Acesso antecipado a lançamentos","Prioridade de repost e atendimento","Conteúdo exclusivo com videomaker até R$ 200","Convites para eventos conforme disponibilidade"],
 "DNA MOR":["Selo digital DNA MOR","Acesso antecipado a lançamentos","Prioridade de repost e atendimento","Conteúdo exclusivo com videomaker até R$ 200","Placa e kit de boas-vindas entregues uma única vez","Pesquisas de desenvolvimento de produtos","Palestras e campanhas conforme oportunidades"]
 }, "allow_combination":true, "cashback_limit":50, "validity_days":365,
 "referral_start":"2026-09-15", "referral_end":"2026-12-31",
 "referral_rules":{
 "DNA Profissional":{"kind":"discount","mode":"percent","value":3,"base":"next_order","client_kind":"discount","client_value":1,"client_first_order":true},
 "DNA Referência":{"kind":"discount","mode":"percent","value":4,"base":"next_order","client_kind":"discount","client_value":1,"client_first_order":true},
 "DNA Master":{"kind":"cashback","mode":"percent","value":6,"base":"paid_order","client_kind":"discount","client_value":2,"client_first_order":false},
 "DNA MOR":{"kind":"cashback","mode":"percent","value":8,"base":"paid_order","client_kind":"discount","client_value":2,"client_first_order":false}
 }}') on conflict(id) do nothing;
create table if not exists public.dna_campaigns (
 id uuid primary key default gen_random_uuid(), name text not null, description text not null default '',
 starts_on date not null, ends_on date not null, audience text not null default 'all' check(audience in ('all','cliente','revendedor')),
 levels text[] not null default '{}', state text not null default 'draft' check(state in ('draft','active','paused','ended')),
 conditions jsonb not null default '{"purchase_min":0,"referrals_min":0,"match":"all"}',
 reward jsonb not null default '{"kind":"discount","mode":"percent","value":0}',
 expiry jsonb not null default '{"mode":"days","days":365}',
 max_awards integer not null default 1 check(max_awards>=1), stock integer check(stock>=0),
 created_at timestamptz not null default now(), check(ends_on>=starts_on)
);
create table if not exists public.dna_orders (
 id uuid primary key default gen_random_uuid(), member_id uuid not null references public.dna_members(id),
 omni_number text not null unique, products numeric(14,2) not null check(products>0 and products<1000000000000), freight numeric(14,2) not null default 0 check(freight>=0 and freight<1000000000000),
 weight_kg numeric(14,3) not null default 0 check(weight_kg>=0 and weight_kg<100000000000), ordered_on date not null,
 paid_on date, state text not null default 'pending' check(state in ('pending','paid','cancelled','refunded')),
 discount_applied numeric(14,2) not null default 0, cashback_applied numeric(14,2) not null default 0,
 note text not null default '', created_at timestamptz not null default now(), check(state<>'paid' or paid_on is not null)
);
create table if not exists public.dna_referrals (
 id uuid primary key default gen_random_uuid(), referrer_id uuid not null references public.dna_members(id),
 referred_id uuid not null unique references public.dna_members(id), level_at_creation text not null, referred_name text not null default '', referrer_name text not null default '',
 order_id uuid unique references public.dna_orders(id), state text not null default 'pending' check(state in ('pending','approved','rejected')),
 reason text, created_at timestamptz not null default now(), check(referrer_id<>referred_id)
);
create table if not exists public.dna_benefits (
 id uuid primary key default gen_random_uuid(), member_id uuid not null references public.dna_members(id),
 kind text not null check(kind in ('discount','cashback','gift')), title text not null,
 mode text not null default 'fixed' check(mode in ('fixed','percent')), value numeric(14,2) not null check(value>=0 and value<1000000000000),
 remaining numeric(14,2) not null default 0 check(remaining>=0 and remaining<1000000000000), source text not null,
 source_key text not null unique, campaign_id uuid references public.dna_campaigns(id), referral_id uuid references public.dna_referrals(id),
 order_id uuid references public.dna_orders(id), state text not null default 'available' check(state in ('available','used','revoked')),
 granted_at timestamptz not null default now(), note text not null default ''
);
create table if not exists public.dna_vouchers (
 id uuid primary key default gen_random_uuid(), code text not null unique default ('DNA-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
 member_id uuid not null references public.dna_members(id), benefit_id uuid references public.dna_benefits(id),
 cashback_requested numeric(14,2) not null default 0 check(cashback_requested>=0 and cashback_requested<1000000000000),
 state text not null default 'requested' check(state in ('requested','handling','used','cancelled','returned')),
 order_id uuid references public.dna_orders(id), used_discount numeric(14,2) not null default 0,
 used_cashback numeric(14,2) not null default 0, handled_by uuid references public.dna_members(id), reason text,
 created_at timestamptz not null default now(), used_at timestamptz,
 check(benefit_id is not null or cashback_requested>0)
);
create unique index if not exists dna_one_active_benefit on public.dna_vouchers(benefit_id) where state in ('requested','handling');
create table if not exists public.dna_allocations (
 voucher_id uuid not null references public.dna_vouchers(id), benefit_id uuid not null references public.dna_benefits(id),
 amount numeric(14,2) not null check(amount>0 and amount<1000000000000), primary key(voucher_id,benefit_id)
);
create table if not exists public.dna_reseller_requests (
 id uuid primary key default gen_random_uuid(), member_id uuid not null references public.dna_members(id),
 message text not null default '', state text not null default 'pending' check(state in ('pending','approved','rejected')),
 reason text, created_at timestamptz not null default now()
);
create unique index if not exists dna_one_reseller_request on public.dna_reseller_requests(member_id) where state='pending';
create table if not exists public.dna_audit (
 id bigint generated always as identity primary key, actor_id uuid references public.dna_members(id),
 action text not null, target_id text, details jsonb not null default '{}', created_at timestamptz not null default now()
);
-- Copy legacy member identities, without replacing legacy data or trusting signup metadata for roles.
do $$ begin
 if to_regclass('public.profiles') is not null then
  insert into public.dna_members(id,full_name,email,phone,cpf_cnpj,role,level,referral_code)
  select u.id,coalesce(p.j->>'full_name',''),u.email,coalesce(p.j->>'phone',''),coalesce(p.j->>'cpf_cnpj',''),
   case when p.j->>'role' in ('admin','financeiro','revendedor') then p.j->>'role' else 'cliente' end,
   case when p.j->>'role'='revendedor' then case when p.j->>'level' in ('DNA Profissional','DNA Referência','DNA Master','DNA MOR') then p.j->>'level' else 'DNA Profissional' end end,
   coalesce(nullif(upper(p.j->>'referral_code'),''),'DNA-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)))
  from auth.users u join (select to_jsonb(p) j from public.profiles p) p on p.j->>'id'=u.id::text
  on conflict(id) do nothing;
 end if;
 insert into public.dna_members(id,email,full_name) select id,coalesce(email,''),coalesce(raw_user_meta_data->>'full_name','') from auth.users on conflict(id) do nothing;
end $$;
-- Only unambiguous legacy orders are copied. Legacy approval is not proof of payment.
do $$ begin
 if to_regclass('public.sales') is not null then
  insert into dna_orders(id,member_id,omni_number,products,weight_kg,ordered_on,state,note,created_at)
  select (j->>'id')::uuid,m.id,j->>'order_number',(j->>'revenue_brl')::numeric,
   case when coalesce(j->>'volume_kg','') ~ '^[0-9]+([.][0-9]+)?$' then (j->>'volume_kg')::numeric else 0 end,
   (j->>'created_at')::timestamptz::date,'pending','Importado do app anterior. Situação original: '||coalesce(j->>'status','não informada')||'. Reconfirmar pagamento no Omni.',(j->>'created_at')::timestamptz
  from (select to_jsonb(s) j from public.sales s) old
  join dna_members m on m.id::text=coalesce(nullif(j->>'cliente_id',''),nullif(j->>'revendedor_id',''))
  where not (nullif(j->>'cliente_id','') is not null and nullif(j->>'revendedor_id','') is not null)
   and j->>'id' ~ '^[0-9a-fA-F-]{36}$' and nullif(j->>'order_number','') is not null
   and coalesce(j->>'revenue_brl','') ~ '^[0-9]+([.][0-9]+)?$' and (j->>'revenue_brl')::numeric>0
   and nullif(j->>'created_at','') is not null
  on conflict do nothing;
 end if;
 if to_regclass('public.referrals') is not null then
  insert into dna_referrals(id,referrer_id,referred_id,level_at_creation,referred_name,referrer_name,created_at)
  select (j->>'id')::uuid,r.id,m.id,coalesce(nullif(j->>'referrer_level_at_creation',''),r.level),m.full_name,r.full_name,(j->>'created_at')::timestamptz
  from (select to_jsonb(rr) j from public.referrals rr) old
  join dna_members r on r.id::text=j->>'referrer_id' and r.role='revendedor' and r.level is not null
  join dna_members m on m.id::text=j->>'referred_id'
  where r.id<>m.id and j->>'id' ~ '^[0-9a-fA-F-]{36}$' and nullif(j->>'created_at','') is not null
  on conflict do nothing;
 end if;
end $$;
create index if not exists dna_orders_member on dna_orders(member_id,state,paid_on);
create index if not exists dna_benefits_member on dna_benefits(member_id,kind,state);
create index if not exists dna_benefits_origin on dna_benefits(order_id,campaign_id);
create index if not exists dna_vouchers_member on dna_vouchers(member_id,state);
create index if not exists dna_allocations_credit on dna_allocations(benefit_id);
create index if not exists dna_referrals_referrer on dna_referrals(referrer_id,state);
create or replace function public.dna_role() returns text language sql stable security definer set search_path=public as $$select role from dna_members where id=auth.uid()$$;
create or replace function public.dna_expiry(b public.dna_benefits) returns timestamptz language sql stable security definer set search_path=public as $$
 select case when c.expiry->>'mode'='date' then ((c.expiry->>'date')::date + 1)::timestamp at time zone 'America/Sao_Paulo'
 else b.granted_at + make_interval(days=>coalesce((c.expiry->>'days')::int,(s.value->>'validity_days')::int,365)) end
 from dna_settings s left join dna_campaigns c on c.id=b.campaign_id where s.id=true
$$;
create or replace function public.dna_discount_value(b public.dna_benefits) returns numeric language plpgsql stable security definer set search_path=public as $$
declare r jsonb; l text;
begin
 if b.referral_id is not null and b.source='Indicação' then
  select level_at_creation into l from dna_referrals where id=b.referral_id;
  select value->'referral_rules'->l into r from dna_settings where id=true;
 elsif b.campaign_id is not null then select reward into r from dna_campaigns where id=b.campaign_id;
 end if;
 -- Do not convert previously granted credits into a different accounting type.
 if r->>'kind'='discount' and r->>'mode'=b.mode then return (r->>'value')::numeric; end if;
 return b.value;
end $$;
create or replace function public.dna_public_settings() returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('company_whatsapp',value->'company_whatsapp','referral_start',value->'referral_start','referral_end',value->'referral_end') from dna_settings where id=true
$$;
create or replace function public.dna_referrer(code text) returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('name',full_name,'code',referral_code) from dna_members where referral_code=upper(code) and role='revendedor'
$$;
create or replace function public.dna_signup() returns trigger language plpgsql security definer set search_path=public as $$
declare r dna_members; config jsonb;
begin
 insert into dna_members(id,email,full_name,phone,cpf_cnpj) values(new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data->>'full_name',''),coalesce(new.raw_user_meta_data->>'phone',''),coalesce(new.raw_user_meta_data->>'cpf_cnpj','')) on conflict(id) do nothing;
 select * into r from dna_members where referral_code=upper(new.raw_user_meta_data->>'referral_code') and role='revendedor';
 select value into config from dna_settings where id=true;
 if r.id is not null and r.level is not null and (now() at time zone 'America/Sao_Paulo')::date between (config->>'referral_start')::date and (config->>'referral_end')::date then
  insert into dna_referrals(referrer_id,referred_id,level_at_creation,referred_name,referrer_name) values(r.id,new.id,r.level,coalesce(new.raw_user_meta_data->>'full_name',''),r.full_name) on conflict(referred_id) do nothing;
 end if;
 return new;
end $$;
drop trigger if exists dna_after_signup on auth.users;
create trigger dna_after_signup after insert on auth.users for each row execute function dna_signup();
-- Every write below is authorized inside a transactional RPC; clients cannot edit balances, roles or approvals.
create or replace function public.dna_action(action text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); role_name text; mid uuid; target uuid; config jsonb; old_config jsonb;
 m dna_members; o dna_orders; r dna_referrals; b dna_benefits; v dna_vouchers; c dna_campaigns;
 rule jsonb; reward jsonb; row_credit record; requested numeric; available numeric; left_amount numeric; take_amount numeric;
 disc numeric:=0; cb numeric:=0; valid_date date:=(now() at time zone 'America/Sao_Paulo')::date;
 spent numeric; referrals_count integer; granted_count integer; eligible boolean; result jsonb:='{}'; v_reason text;
begin
 if actor is null then raise exception 'Entre na sua conta para continuar.'; end if;
 select role into role_name from dna_members where id=actor;
 if role_name is null then raise exception 'Perfil não encontrado.'; end if;
 select value into config from dna_settings where id=true;
 target:=nullif(payload->>'id','')::uuid;
 v_reason:=nullif(trim(payload->>'reason'),'');
 if action in ('settings_save','campaign_save','member_update','campaign_delete') and role_name<>'admin' then raise exception 'Apenas administradores podem executar esta ação.'; end if;
 if action in ('benefit_revoke','order_save','order_state','referral_decide','voucher_handle','voucher_redeem','voucher_return','reseller_decide','benefit_grant','campaign_award') and role_name not in ('admin','financeiro') then raise exception 'Ação exclusiva da equipe interna.'; end if;
 if action='profile_save' then
  if length(trim(payload->>'full_name'))<3 or nullif(trim(payload->>'full_name'),'') is null then raise exception 'Informe seu nome completo.'; end if;
  update dna_members set full_name=trim(payload->>'full_name'),phone=coalesce(payload->>'phone',''),cpf_cnpj=coalesce(payload->>'cpf_cnpj','') where id=actor;
 elsif action='settings_save' then
  reward:=payload->'value';
  if not coalesce(reward ?& array['allow_combination','cashback_limit','validity_days','referral_start','referral_end','referral_rules','company_whatsapp'],false) or not coalesce(reward->'referral_rules' ?& array['DNA Profissional','DNA Referência','DNA Master','DNA MOR'],false) then raise exception 'Configuração incompleta.'; end if;
  if jsonb_typeof(reward->'cashback_limit')<>'number' or jsonb_typeof(reward->'validity_days')<>'number' or jsonb_typeof(reward->'allow_combination')<>'boolean' or (reward->>'cashback_limit')::numeric not between 0 and 50 or (reward->>'validity_days')::int not between 1 and 3650 then raise exception 'Informe validade positiva e limite de cashback entre 0 e 50%%.'; end if;
  if (reward->>'referral_end')::date<(reward->>'referral_start')::date then raise exception 'Período de indicação inválido.'; end if;
  for rule in select value from jsonb_each(reward->'referral_rules') loop
   if not coalesce(rule ?& array['kind','mode','value','base','client_kind','client_value','client_first_order'],false) or rule->>'base' not in ('paid_order','next_order') then raise exception 'Regra incompleta.'; end if;
   if jsonb_typeof(rule->'value')<>'number' or jsonb_typeof(rule->'client_value')<>'number' or jsonb_typeof(rule->'client_first_order')<>'boolean' or rule->>'kind' not in ('discount','cashback') or rule->>'mode' not in ('percent','fixed') or (rule->>'value')::numeric<0 or (rule->>'client_value')::numeric not between 0 and 100 or rule->>'client_kind' not in ('discount','cashback') or (rule->>'mode'='percent' and (rule->>'value')::numeric>100) or (rule->>'kind'='cashback' and rule->>'base'<>'paid_order') then raise exception 'Regra de indicação inválida.'; end if;
  end loop;
  old_config:=config;
  update dna_settings set value=reward,updated_at=now() where id=true;
  result:=jsonb_build_object('previous',old_config,'current',reward);
 elsif action='member_update' then
  if v_reason is null then raise exception 'Informe o motivo da alteração.'; end if;
  select * into m from dna_members where id=target;
  if m.id is null then raise exception 'Participante não encontrado.'; end if;
  result:=jsonb_build_object('previous_role',m.role,'previous_level',m.level,'current',payload);
  if target=actor and payload->>'role'<>'admin' then raise exception 'Você não pode remover seu próprio acesso administrativo.'; end if;
  if payload->>'role'='revendedor' and nullif(payload->>'level','') is null then raise exception 'Selecione a categoria inicial.'; end if;
  update dna_members set role=payload->>'role',level=case when payload->>'role'='revendedor' then payload->>'level' else null end where id=target;
 elsif action='order_save' then
  mid:=(payload->>'member_id')::uuid;
  perform 1 from dna_members where id=mid for update;
  insert into dna_orders(member_id,omni_number,products,freight,weight_kg,ordered_on,paid_on,state)
  values(mid,trim(payload->>'omni_number'),(payload->>'products')::numeric,coalesce((payload->>'freight')::numeric,0),coalesce((payload->>'weight_kg')::numeric,0),(payload->>'ordered_on')::date,
  case when payload->>'state'='paid' then (payload->>'paid_on')::date end,coalesce(payload->>'state','pending')) returning id into target;
  if payload->>'state' not in ('pending','paid') or (payload->>'state'='paid' and nullif(payload->>'paid_on','') is null) then raise exception 'Informe a situação e a data de pagamento.'; end if;
 elsif action='order_state' then
  select * into o from dna_orders where id=target for update;
  if o.id is null then raise exception 'Pedido não encontrado.'; end if;
  if o.state in ('cancelled','refunded') then raise exception 'Pedido já encerrado.'; end if;
  if payload->>'state' not in ('paid','cancelled','refunded') then raise exception 'Situação inválida.'; end if;
  if payload->>'state' in ('cancelled','refunded') then
   if v_reason is null then raise exception 'Informe a justificativa.'; end if;
   if exists(select 1 from dna_benefits bb where bb.campaign_id is not null and bb.state<>'revoked' and (bb.member_id=o.member_id or bb.member_id in(select referrer_id from dna_referrals where order_id=o.id))) then raise exception 'Revise e revogue as recompensas de campanha dos participantes envolvidos antes de estornar. Após o estorno, reconfira as metas para nova concessão.'; end if;
   if exists(select 1 from dna_vouchers where order_id=o.id and state='used') then raise exception 'Devolva os benefícios utilizados antes de cancelar este pedido.'; end if;
   perform 1 from dna_members where id in(select member_id from dna_benefits where order_id=o.id) order by id for update;
   if exists(select 1 from dna_benefits where order_id=o.id and ((state='used' and source<>'Indicação recebida') or (kind='cashback' and remaining<value))) then raise exception 'Há recompensa desta compra já utilizada. Regularize as utilizações antes do estorno.'; end if;
   update dna_vouchers set state='cancelled',reason='Pedido de origem cancelado' where state in ('requested','handling') and (benefit_id in(select id from dna_benefits where order_id=o.id) or id in(select voucher_id from dna_allocations where benefit_id in(select id from dna_benefits where order_id=o.id)));
   update dna_benefits set state='revoked',remaining=0 where order_id=o.id;
   update dna_referrals set state='rejected',reason=v_reason where order_id=o.id;
  end if;
  update dna_orders set state=payload->>'state',paid_on=case when payload->>'state'='paid' then (payload->>'paid_on')::date else paid_on end where id=target;
 elsif action='referral_register' then
  if role_name not in ('admin','financeiro') then raise exception 'Ação exclusiva da equipe.'; end if;
  select * into m from dna_members where id=(payload->>'referrer_id')::uuid and role='revendedor';
  mid:=(payload->>'referred_id')::uuid;
  if m.id is null or m.level is null or valid_date not between (config->>'referral_start')::date and (config->>'referral_end')::date then raise exception 'Indicadora ou período inválido.'; end if;
  perform 1 from dna_members where id=mid for update;
  if exists(select 1 from dna_orders where member_id=mid) then raise exception 'Registre a indicação antes do primeiro pedido.'; end if;
  insert into dna_referrals(referrer_id,referred_id,level_at_creation,referred_name,referrer_name) values(m.id,mid,m.level,(select full_name from dna_members where id=mid),m.full_name) returning id into target;
 elsif action='referral_decide' then
  select * into r from dna_referrals where id=target for update;
  if r.id is null or r.state<>'pending' then raise exception 'Indicação não está pendente.'; end if;
  if payload->>'decision'='reject' then
   if v_reason is null then raise exception 'Informe o motivo da recusa.'; end if;
   update dna_referrals set state='rejected',reason=v_reason where id=target;
  else
   if coalesce((payload->>'confirmed_new_client')::boolean,false)=false or coalesce((payload->>'confirmed_before_order')::boolean,false)=false then raise exception 'Confirme cliente novo e indicação informada antes da conclusão do primeiro pedido.'; end if;
   select * into o from dna_orders where id=(payload->>'order_id')::uuid for update;
   if o.id is null or o.member_id<>r.referred_id or o.state<>'paid' then raise exception 'Selecione o primeiro pedido pago da pessoa indicada.'; end if;
   if exists(select 1 from dna_orders where member_id=r.referred_id and id<>o.id and state not in ('cancelled','refunded') and (ordered_on<o.ordered_on or (ordered_on=o.ordered_on and created_at<o.created_at))) then raise exception 'Existe pedido anterior para esta pessoa.'; end if;
   if (r.created_at at time zone 'America/Sao_Paulo')::date not between (config->>'referral_start')::date and (config->>'referral_end')::date or (r.created_at at time zone 'America/Sao_Paulo')::date>o.ordered_on then raise exception 'Indicação fora do período ou posterior ao pedido.'; end if;
   select * into m from dna_members where id=r.referrer_id and role='revendedor';
   if m.id is null then raise exception 'Indicadora não está mais enquadrada como revendedora.'; end if;
   perform 1 from dna_members where id in(r.referrer_id,r.referred_id) order by id for update;
   rule:=config->'referral_rules'->r.level_at_creation;
   if rule is null then raise exception 'Configure a regra da categoria registrada.'; end if;
   if coalesce((rule->>'client_first_order')::boolean,false) and rule->>'client_kind'='discount' then
    if not coalesce((payload->>'confirmed_client_discount')::boolean,false) then raise exception 'Confirme o desconto de boas-vindas aplicado no primeiro pedido.'; end if;
    disc:=round(o.products*(rule->>'client_value')::numeric/100,2);
    if o.discount_applied>0 and o.discount_applied<>disc then raise exception 'O primeiro pedido já possui outro desconto. Confira a regra de boas-vindas.'; end if;
    if o.cashback_applied>0 and (not (config->>'allow_combination')::boolean or o.cashback_applied>round((o.products-disc)*(config->>'cashback_limit')::numeric/100,2)) then raise exception 'Ajuste o cashback antes de aplicar o desconto de boas-vindas.'; end if;
    update dna_orders set discount_applied=disc where id=o.id returning * into o;
   end if;
   if rule->>'kind'='cashback' then
    requested:=case when rule->>'mode'='fixed' then (rule->>'value')::numeric else round((o.products-o.discount_applied-o.cashback_applied)*(rule->>'value')::numeric/100,2) end;
   elsif rule->>'base'='paid_order' and rule->>'mode'='percent' then requested:=round((o.products-o.discount_applied-o.cashback_applied)*(rule->>'value')::numeric/100,2);
   else requested:=(rule->>'value')::numeric; end if;
   insert into dna_benefits(member_id,kind,title,mode,value,remaining,source,source_key,referral_id,order_id)
   values(r.referrer_id,rule->>'kind','Premiação por indicação',case when rule->>'kind'='cashback' or rule->>'base'='paid_order' then 'fixed' else rule->>'mode' end,requested,case when rule->>'kind'='cashback' then requested else 0 end,'Indicação','referral:'||r.id,r.id,o.id);
   requested:=case when rule->>'client_kind'='cashback' then round((o.products-o.discount_applied-o.cashback_applied)*(rule->>'client_value')::numeric/100,2) else (rule->>'client_value')::numeric end;
   insert into dna_benefits(member_id,kind,title,mode,value,remaining,source,source_key,referral_id,order_id,state,note)
   values(r.referred_id,rule->>'client_kind','Benefício de boas-vindas',case when rule->>'client_kind'='cashback' then 'fixed' else 'percent' end,requested,case when rule->>'client_kind'='cashback' then requested else 0 end,'Indicação recebida','referred:'||r.id,r.id,o.id,
   case when coalesce((rule->>'client_first_order')::boolean,false) and rule->>'client_kind'='discount' then 'used' else 'available' end,
   case when coalesce((rule->>'client_first_order')::boolean,false) and rule->>'client_kind'='discount' then 'Equipe confirmou aplicação no primeiro pedido' else '' end);
   if coalesce((rule->>'client_first_order')::boolean,false) and rule->>'client_kind'='discount' and coalesce((payload->>'confirmed_client_discount')::boolean,false)=false then raise exception 'Confirme o desconto de boas-vindas aplicado no primeiro pedido.'; end if;
   update dna_referrals set state='approved',order_id=o.id where id=target;
  end if;
 elsif action='voucher_request' then
  perform 1 from dna_members where id=actor for update;
  requested:=coalesce((payload->>'cashback')::numeric,0);
  target:=nullif(payload->>'benefit_id','')::uuid;
  if target is not null then
   select * into b from dna_benefits where id=target and member_id=actor for update;
   if b.id is null or b.kind='cashback' or b.state<>'available' or dna_expiry(b)<=now() then raise exception 'Benefício indisponível ou vencido.'; end if;
   select * into v from dna_vouchers where benefit_id=target and state in ('requested','handling');
   if v.id is not null then return to_jsonb(v); end if;
  end if;
  if requested<0 or (requested=0 and target is null) then raise exception 'Selecione um benefício ou informe um valor de cashback.'; end if;
  if requested>0 and target is not null and (b.kind='gift' or not (config->>'allow_combination')::boolean) then raise exception 'A regra atual não permite esta combinação.'; end if;
  insert into dna_vouchers(member_id,benefit_id,cashback_requested) values(actor,target,requested) returning * into v;
  left_amount:=requested;
  for row_credit in
   select cr.*, cr.remaining-coalesce((select sum(a.amount) from dna_allocations a join dna_vouchers vv on vv.id=a.voucher_id where a.benefit_id=cr.id and vv.state in ('requested','handling')),0) free
   from dna_benefits cr where cr.member_id=actor and cr.kind='cashback' and cr.state='available' and dna_expiry(cr)>now()
   order by dna_expiry(cr),cr.granted_at,cr.id for update
  loop
   take_amount:=least(left_amount,greatest(0,row_credit.free));
   if take_amount>0 then insert into dna_allocations values(v.id,row_credit.id,take_amount); left_amount:=left_amount-take_amount; end if;
   exit when left_amount=0;
  end loop;
  if left_amount>0 then raise exception 'Cashback disponível insuficiente; confira valores reservados e vencimentos.'; end if;
  result:=to_jsonb(v); target:=v.id;
 elsif action in ('voucher_cancel','voucher_handle','voucher_redeem','voucher_return') then
  select * into v from dna_vouchers where id=target;
  if v.id is null or (role_name not in ('admin','financeiro') and v.member_id<>actor) then raise exception 'Solicitação não encontrada.'; end if;
  perform 1 from dna_members where id=v.member_id for update;
  select * into v from dna_vouchers where id=target for update;
  if action='voucher_cancel' then
   if v.state not in ('requested','handling') then raise exception 'Solicitação já encerrada.'; end if;
   update dna_vouchers set state='cancelled',reason=coalesce(v_reason,'Cancelada pelo participante') where id=target;
  elsif action='voucher_handle' then
   if v.state<>'requested' then raise exception 'Solicitação não está aguardando atendimento.'; end if;
   update dna_vouchers set state='handling',handled_by=actor where id=target;
  elsif action='voucher_return' then
   if v.state<>'used' or v_reason is null then raise exception 'Selecione uma utilização e informe a justificativa da devolução.'; end if;
   update dna_benefits cr set remaining=cr.remaining+a.amount from dna_allocations a where a.voucher_id=v.id and a.benefit_id=cr.id;
   update dna_benefits set state='available' where id=v.benefit_id and state='used';
   update dna_orders set discount_applied=greatest(0,discount_applied-v.used_discount),cashback_applied=greatest(0,cashback_applied-v.used_cashback) where id=v.order_id;
   update dna_vouchers set state='returned',reason=v_reason,handled_by=actor where id=target;
  else
   if v.state not in ('requested','handling') then raise exception 'Solicitação já encerrada.'; end if;
   select * into b from dna_benefits where id=v.benefit_id for update;
   if b.id is not null and (b.state<>'available' or dna_expiry(b)<=now()) then raise exception 'Benefício indisponível ou vencido pela regra atual.'; end if;
   if b.kind='gift' then
    if v_reason is null then raise exception 'Informe os detalhes da entrega ou retirada.'; end if;
    update dna_benefits set state='used' where id=b.id;
    update dna_vouchers set state='used',used_at=now(),handled_by=actor,reason=v_reason where id=target;
   else
    select * into o from dna_orders where id=(payload->>'order_id')::uuid for update;
    if o.id is null or o.member_id<>v.member_id or o.state not in ('pending','paid') then raise exception 'Selecione um pedido válido do titular.'; end if;
    if b.id is not null and o.discount_applied>0 then raise exception 'Este pedido já tem desconto; descontos não acumulam.'; end if;
    disc:=case when b.id is null then 0 when b.mode='percent' then round(o.products*dna_discount_value(b)/100,2) else dna_discount_value(b) end;
    if disc>o.products then raise exception 'O desconto deve ser usado integralmente; selecione um pedido com valor suficiente.'; end if;
    cb:=coalesce((payload->>'cashback_used')::numeric,v.cashback_requested);
    if cb<0 or cb>v.cashback_requested then raise exception 'Cashback aplicado supera o valor solicitado.'; end if;
    if disc=0 and cb=0 then raise exception 'Informe um valor de benefício para aplicar.'; end if;
    if disc+o.discount_applied>0 and cb+o.cashback_applied>0 and not (config->>'allow_combination')::boolean then raise exception 'A configuração atual proíbe combinar desconto e cashback, inclusive vouchers antigos.'; end if;
    if cb+o.cashback_applied>round((o.products-disc-o.discount_applied)*(config->>'cashback_limit')::numeric/100,2) then raise exception 'Cashback supera o limite atual sobre produtos após desconto, sem frete.'; end if;
    left_amount:=cb;
    for row_credit in select a.*,cr.remaining,dna_expiry(cr) expiry,cr.state from dna_allocations a join dna_benefits cr on cr.id=a.benefit_id where a.voucher_id=v.id order by dna_expiry(cr),cr.granted_at for update of cr loop
     take_amount:=least(left_amount,row_credit.amount);
     if take_amount>0 and (row_credit.expiry<=now() or row_credit.state<>'available' or row_credit.remaining<take_amount) then raise exception 'Crédito reservado expirou ou está indisponível; cancele e solicite novamente.'; end if;
     if take_amount>0 then update dna_benefits set remaining=remaining-take_amount where id=row_credit.benefit_id; update dna_allocations set amount=take_amount where voucher_id=v.id and benefit_id=row_credit.benefit_id;
     else delete from dna_allocations where voucher_id=v.id and benefit_id=row_credit.benefit_id; end if;
     left_amount:=left_amount-take_amount;
    end loop;
    if left_amount>0 then raise exception 'Reserva de cashback insuficiente.'; end if;
    update dna_benefits set state='used' where id=b.id;
    update dna_orders set discount_applied=discount_applied+disc,cashback_applied=cashback_applied+cb where id=o.id;
    update dna_vouchers set state='used',order_id=o.id,used_discount=disc,used_cashback=cb,used_at=now(),handled_by=actor where id=target;
   end if;
  end if;
 elsif action='reseller_request' then
  if role_name<>'cliente' then raise exception 'Solicitação exclusiva para clientes.'; end if;
  insert into dna_reseller_requests(member_id,message) values(actor,coalesce(payload->>'message','')) returning id into target;
 elsif action='reseller_decide' then
  select member_id into mid from dna_reseller_requests where id=target and state='pending' for update;
  if mid is null then raise exception 'Solicitação não está pendente.'; end if;
  if v_reason is null then raise exception 'Informe a justificativa da decisão.'; end if;
  if payload->>'decision'='approve' then
   update dna_members set role='revendedor',level=payload->>'level' where id=mid;
   update dna_reseller_requests set state='approved',reason=v_reason where id=target;
  else update dna_reseller_requests set state='rejected',reason=v_reason where id=target; end if;
 elsif action='campaign_save' then
  reward:=payload->'reward'; rule:=payload->'conditions';
  if reward->>'kind' not in ('cashback','discount','gift') or reward->>'mode' not in ('fixed','percent') or (reward->>'value')::numeric<0 or (reward->>'mode'='percent' and (reward->>'value')::numeric>100) or (rule->>'purchase_min')::numeric<0 or (rule->>'referrals_min')::int<0 or rule->>'match' not in ('all','any') then raise exception 'Condições ou recompensa inválidas.'; end if;
  if (rule->>'purchase_min')::numeric=0 and (rule->>'referrals_min')::int=0 then raise exception 'Defina pelo menos uma meta.'; end if;
  if jsonb_array_length(coalesce(payload->'levels','[]'))>0 and payload->>'audience'<>'revendedor' then raise exception 'Categorias são exclusivas para revendedoras.'; end if;
  if payload->>'audience' in ('all','cliente') and (rule->>'referrals_min')::int>0 then raise exception 'Metas de indicação são exclusivas para revendedoras.'; end if;
  if not coalesce(payload->'expiry'->>'mode' in ('days','date'),false) then raise exception 'Defina o prazo de utilização.'; end if;
  if payload->'expiry'->>'mode'='days' and (payload->'expiry'->>'days')::int not between 1 and 3650 then raise exception 'Prazo de uso inválido.'; end if;
  if payload->'expiry'->>'mode'='date' and (payload->'expiry'->>'date')::date < (payload->>'ends_on')::date then raise exception 'Prazo de uso deve alcançar o encerramento da campanha.'; end if;
  if reward->>'kind'='gift' and nullif(trim(reward->>'gift'),'') is null then raise exception 'Informe o brinde.'; end if;
  if target is null then target:=gen_random_uuid(); end if;
  insert into dna_campaigns(id,name,description,starts_on,ends_on,audience,levels,state,conditions,reward,expiry,max_awards,stock)
  values(target,trim(payload->>'name'),coalesce(payload->>'description',''),(payload->>'starts_on')::date,(payload->>'ends_on')::date,payload->>'audience',array(select jsonb_array_elements_text(coalesce(payload->'levels','[]'))),payload->>'state',rule,reward,payload->'expiry',(payload->>'max_awards')::int,nullif(payload->>'stock','')::int)
  on conflict(id) do update set name=excluded.name,description=excluded.description,starts_on=excluded.starts_on,ends_on=excluded.ends_on,audience=excluded.audience,levels=excluded.levels,state=excluded.state,conditions=excluded.conditions,reward=excluded.reward,expiry=excluded.expiry,max_awards=excluded.max_awards,stock=excluded.stock;
 elsif action='campaign_award' then
  select * into c from dna_campaigns where id=target for update;
  select * into m from dna_members where id=(payload->>'member_id')::uuid for update;
  if c.id is null or m.id is null or c.state<>'active' or valid_date<c.starts_on then raise exception 'Campanha não está ativa no período.'; end if;
  if m.role not in ('cliente','revendedor') or (c.audience<>'all' and c.audience<>m.role) or (cardinality(c.levels)>0 and not coalesce(m.level=any(c.levels),false)) then raise exception 'Participante fora do público da campanha.'; end if;
  select coalesce(sum(products-discount_applied-cashback_applied),0) into spent from dna_orders where member_id=m.id and state='paid' and paid_on between c.starts_on and c.ends_on;
  select count(*) into referrals_count from dna_referrals rr join dna_orders oo on oo.id=rr.order_id where rr.referrer_id=m.id and rr.state='approved' and oo.state='paid' and oo.paid_on between c.starts_on and c.ends_on and (rr.created_at at time zone 'America/Sao_Paulo')::date between c.starts_on and c.ends_on;
  select count(*) into granted_count from dna_benefits where member_id=m.id and campaign_id=c.id and state<>'revoked';
  if granted_count>=c.max_awards then raise exception 'Limite de premiações atingido.'; end if;
  rule:=c.conditions;
  if rule->>'match'='any' then eligible:=((rule->>'purchase_min')::numeric>0 and spent>=(rule->>'purchase_min')::numeric*(granted_count+1)) or ((rule->>'referrals_min')::int>0 and referrals_count>=(rule->>'referrals_min')::int*(granted_count+1));
  else eligible:=spent>=(rule->>'purchase_min')::numeric*(granted_count+1) and referrals_count>=(rule->>'referrals_min')::int*(granted_count+1); end if;
  if not eligible then raise exception 'Metas confirmadas ainda não atingidas.'; end if;
  if c.stock is not null and (select count(*) from dna_benefits where campaign_id=c.id and state<>'revoked')>=c.stock then raise exception 'Disponibilidade da recompensa esgotada.'; end if;
  if c.expiry->>'mode'='date' and (c.expiry->>'date')::date<valid_date then raise exception 'Prazo de utilização da campanha encerrado.'; end if;
  reward:=c.reward;
  requested:=case when reward->>'kind'='gift' then 0 when reward->>'kind'='cashback' and reward->>'mode'='percent' then greatest(0,round(spent*(reward->>'value')::numeric/100,2)-coalesce((select sum(value) from dna_benefits where campaign_id=c.id and member_id=m.id and kind='cashback' and state<>'revoked'),0)) else (reward->>'value')::numeric end;
  if reward->>'kind'='cashback' and requested<=0 then raise exception 'Não há novo valor de cashback a conceder.'; end if;
  insert into dna_benefits(member_id,kind,title,mode,value,remaining,source,source_key,campaign_id)
  values(m.id,reward->>'kind',case when reward->>'kind'='gift' then reward->>'gift' else c.name end,case when reward->>'kind'='cashback' then 'fixed' else reward->>'mode' end,requested,case when reward->>'kind'='cashback' then requested else 0 end,c.name,'campaign:'||c.id||':'||m.id||':'||gen_random_uuid(),c.id);
 elsif action='benefit_revoke' then
  select * into b from dna_benefits where id=target;
  if b.id is null then raise exception 'Benefício não encontrado.'; end if;
  perform 1 from dna_members where id=b.member_id for update;
  select * into b from dna_benefits where id=target for update;
  if v_reason is null then raise exception 'Informe a justificativa da revogação.'; end if;
  if b.state<>'available' or (b.kind='cashback' and b.remaining<b.value) then raise exception 'Devolva as utilizações antes de revogar o benefício.'; end if;
  update dna_vouchers set state='cancelled',reason=v_reason where state in ('requested','handling') and (benefit_id=b.id or id in(select voucher_id from dna_allocations where benefit_id=b.id));
  update dna_benefits set state='revoked',remaining=0 where id=b.id;
 elsif action='benefit_grant' then
  if v_reason is null then raise exception 'Informe a origem e justificativa da concessão.'; end if;
  mid:=(payload->>'member_id')::uuid;
  perform 1 from dna_members where id=mid for update;
  if coalesce((payload->>'once')::boolean,false) and exists(select 1 from dna_benefits where member_id=mid and title=payload->>'title' and state<>'revoked') then raise exception 'Benefício de entrega única já concedido.'; end if;
  if payload->>'mode'='percent' and (payload->>'value')::numeric>100 then raise exception 'Percentual inválido.'; end if;
  insert into dna_benefits(member_id,kind,title,mode,value,remaining,source,source_key,note)
  values(mid,payload->>'kind',payload->>'title',case when payload->>'kind'='cashback' then 'fixed' else payload->>'mode' end,(payload->>'value')::numeric,case when payload->>'kind'='cashback' then (payload->>'value')::numeric else 0 end,'Concessão da equipe','manual:'||gen_random_uuid(),v_reason) returning id into target;
 else raise exception 'Ação não reconhecida.';
 end if;
 insert into dna_audit(actor_id,action,target_id,details) values(actor,action,target::text,case when action in ('settings_save','member_update') then result else payload end);
 return case when result='{}' then jsonb_build_object('id',target,'ok',true) else result end;
end $$;
-- RLS also protects direct REST requests, independent of the React route guard.
do $$ declare t text; begin
 foreach t in array array['dna_members','dna_settings','dna_campaigns','dna_orders','dna_referrals','dna_benefits','dna_vouchers','dna_allocations','dna_reseller_requests','dna_audit'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;
create policy dna_members_read on dna_members for select to authenticated using(id=auth.uid() or dna_role() in ('admin','financeiro'));
create policy dna_settings_read on dna_settings for select to authenticated using(true);
create policy dna_campaigns_read on dna_campaigns for select to authenticated using(dna_role() in ('admin','financeiro') or exists(select 1 from dna_benefits b where b.campaign_id=dna_campaigns.id and b.member_id=auth.uid()) or (state<>'draft' and (audience='all' or audience=dna_role()) and (cardinality(levels)=0 or (select level from dna_members where id=auth.uid())=any(levels))));
create policy dna_orders_read on dna_orders for select to authenticated using(member_id=auth.uid() or dna_role() in ('admin','financeiro'));
create policy dna_referrals_read on dna_referrals for select to authenticated using(referrer_id=auth.uid() or referred_id=auth.uid() or dna_role() in ('admin','financeiro'));
create policy dna_benefits_read on dna_benefits for select to authenticated using(member_id=auth.uid() or dna_role() in ('admin','financeiro'));
create policy dna_vouchers_read on dna_vouchers for select to authenticated using(member_id=auth.uid() or dna_role() in ('admin','financeiro'));
create policy dna_allocations_read on dna_allocations for select to authenticated using(exists(select 1 from dna_vouchers v where v.id=voucher_id and (v.member_id=auth.uid() or dna_role() in ('admin','financeiro'))));
create policy dna_reseller_read on dna_reseller_requests for select to authenticated using(member_id=auth.uid() or dna_role() in ('admin','financeiro'));
create policy dna_audit_read on dna_audit for select to authenticated using(dna_role() in ('admin','financeiro'));
-- Public RPCs expose only referral identity and the support number, never private member fields.
revoke all on function dna_action(text,jsonb),dna_role(),dna_expiry(dna_benefits),dna_discount_value(dna_benefits),dna_public_settings(),dna_referrer(text),dna_signup() from public, anon, authenticated;
grant execute on function dna_action(text,jsonb),dna_role(),dna_expiry(dna_benefits),dna_discount_value(dna_benefits) to authenticated;
grant execute on function dna_public_settings(),dna_referrer(text) to anon,authenticated;
commit;
