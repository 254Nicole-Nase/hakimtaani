CREATE TABLE public.feedback_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  rating integer check (rating between 1 and 5),
  metadata jsonb,
  created_at timestamptz default now()
);

GRANT SELECT, INSERT ON public.feedback_events TO anon;
GRANT SELECT, INSERT ON public.feedback_events TO authenticated;
GRANT ALL ON public.feedback_events TO service_role;

ALTER TABLE public.feedback_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public feedback inserts"
  ON public.feedback_events
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public feedback selects"
  ON public.feedback_events
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow authenticated feedback inserts"
  ON public.feedback_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated feedback selects"
  ON public.feedback_events
  FOR SELECT
  TO authenticated
  USING (true);