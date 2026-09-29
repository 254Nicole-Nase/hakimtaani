CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.legal_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid REFERENCES public.legal_topics(id) ON DELETE SET NULL,
  title text NOT NULL,
  source_name text,
  source_url text,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  chunk_index integer NOT NULL DEFAULT 0,
  embedding vector(1536),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.legal_topics TO anon, authenticated;
GRANT SELECT ON public.documents TO anon, authenticated;
GRANT SELECT ON public.chunks TO anon, authenticated;
GRANT ALL ON public.legal_topics TO service_role;
GRANT ALL ON public.documents TO service_role;
GRANT ALL ON public.chunks TO service_role;

ALTER TABLE public.legal_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read legal topics" ON public.legal_topics FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read documents" ON public.documents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read chunks" ON public.chunks FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.legal_topics (name, description) VALUES
  ('tenancy', 'Rights and responsibilities of landlords and tenants in Kenya.'),
  ('employment', 'Kenyan worker rights, contracts, payslips, and termination.'),
  ('consumer', 'Consumer protection, refunds, and defective goods/services.');

WITH tenancy_doc AS (
  INSERT INTO public.documents (topic_id, title, source_name, source_url, content)
  SELECT id, 'Rent and Tenancy Basics in Kenya', 'Kituo cha Sheria / Kenya Law', 'https://kenyalaw.org', 'A landlord must give written notice before increasing rent and cannot forcibly evict a tenant without a court order. Tenants are entitled to habitable premises and landlords are generally responsible for structural repairs.'
  FROM public.legal_topics WHERE name = 'tenancy'
  RETURNING id
)
INSERT INTO public.chunks (document_id, chunk_index, content)
SELECT id, 0, 'A landlord must give the tenant written notice before increasing rent. The notice period depends on the tenancy agreement but is commonly one month for monthly tenancies.' FROM tenancy_doc
UNION ALL
SELECT id, 1, 'A landlord cannot forcibly evict a tenant without a court order. Self-help eviction, such as changing locks or removing doors, is illegal under Kenyan law.' FROM tenancy_doc
UNION ALL
SELECT id, 2, 'A tenant is entitled to a habitable premises with working basic utilities. The landlord is generally responsible for structural repairs unless the tenant caused the damage.' FROM tenancy_doc;

WITH employment_doc AS (
  INSERT INTO public.documents (topic_id, title, source_name, source_url, content)
  SELECT id, 'Employment Rights in Kenya', 'Kenya Law / Employment Act 2007', 'https://kenyalaw.org', 'Employees in Kenya have rights to written contracts, fair termination, payslips, and benefits. Casual workers who work continuously for more than three months may gain temporary-term protections.'
  FROM public.legal_topics WHERE name = 'employment'
  RETURNING id
)
INSERT INTO public.chunks (document_id, chunk_index, content)
SELECT id, 0, 'An employee is entitled to a written employment contract if employed for more than three consecutive months. The contract should state wages, duties, and termination terms.' FROM employment_doc
UNION ALL
SELECT id, 1, 'Casual employees who work for the same employer for more than three months continuously may be deemed to be on temporary terms and entitled to similar benefits as other employees.' FROM employment_doc
UNION ALL
SELECT id, 2, 'An employer must provide a payslip showing gross pay, statutory deductions, and net pay for each pay period.' FROM employment_doc;

WITH consumer_doc AS (
  INSERT INTO public.documents (topic_id, title, source_name, source_url, content)
  SELECT id, 'Consumer Protection in Kenya', 'Consumer Protection Act 2012', 'https://kenyalaw.org', 'Consumers in Kenya have the right to fair prices, clear information, safe goods, and redress for defective products or services. They can request repair, replacement, or refund within a reasonable time.'
  FROM public.legal_topics WHERE name = 'consumer'
  RETURNING id
)
INSERT INTO public.chunks (document_id, chunk_index, content)
SELECT id, 0, 'Consumers have the right to return defective goods within a reasonable time and request a repair, replacement, or refund.' FROM consumer_doc
UNION ALL
SELECT id, 1, 'Service providers must give clear information about prices, terms, and conditions before a consumer pays for a service.' FROM consumer_doc
UNION ALL
SELECT id, 2, 'Unfair contract terms that significantly disadvantage the consumer may be challenged under Kenyan consumer protection law.' FROM consumer_doc;