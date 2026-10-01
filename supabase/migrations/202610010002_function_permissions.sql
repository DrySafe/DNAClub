-- Supabase default privileges can grant anon/authenticated explicit EXECUTE rights.
-- Revoke those defaults as well as PUBLIC before granting only intended callers.
begin;
revoke all on function public.dna_action(text,jsonb),public.dna_role(),public.dna_expiry(public.dna_benefits),public.dna_discount_value(public.dna_benefits),public.dna_public_settings(),public.dna_referrer(text),public.dna_signup() from public, anon, authenticated;
grant execute on function public.dna_action(text,jsonb),public.dna_role(),public.dna_expiry(public.dna_benefits),public.dna_discount_value(public.dna_benefits) to authenticated;
grant execute on function public.dna_public_settings(),public.dna_referrer(text) to anon,authenticated;
commit;
