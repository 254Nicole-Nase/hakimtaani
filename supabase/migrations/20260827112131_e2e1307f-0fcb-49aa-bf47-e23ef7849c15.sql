CREATE TABLE public.usage_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('question','contract_analysis','referral')),
  topic text,
  risk_score int,
  flagged_clauses int,
  referral_target text,
  language text,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT ON public.usage_events TO anon;
GRANT SELECT, INSERT ON public.usage_events TO authenticated;
GRANT ALL ON public.usage_events TO service_role;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can log anonymous usage" ON public.usage_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anyone can read anonymous usage" ON public.usage_events FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX usage_events_created_at_idx ON public.usage_events (created_at DESC);