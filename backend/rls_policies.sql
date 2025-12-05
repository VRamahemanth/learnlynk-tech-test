-- LearnLynk Tech Test - Task 2: RLS Policies on leads

-- Enable RLS
alter table public.leads enable row level security;

-- Extract JWT helper:
-- current_setting('request.jwt.claims', true)::jsonb

--------------------------------------------------------
-- SELECT POLICY
--------------------------------------------------------

drop policy if exists "leads_select_policy" on public.leads;

create policy "leads_select_policy"
on public.leads
for select
using (

  -- Admins: can read all leads inside their tenant
  (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'admin'
    AND tenant_id = (
      current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id'
    )::uuid
  )

  OR

  -- Counselors: can read their own leads
  (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'counselor'
    AND owner_id = (
      current_setting('request.jwt.claims', true)::jsonb ->> 'user_id'
    )::uuid
  )

  OR

  -- Counselors: can also read leads assigned to someone in their team
  (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'counselor'
    AND EXISTS (
      SELECT 1
      FROM public.user_teams ut_c
      JOIN public.user_teams ut_o
        ON ut_c.team_id = ut_o.team_id
      WHERE ut_c.user_id = (
        current_setting('request.jwt.claims', true)::jsonb ->> 'user_id'
      )::uuid
      AND ut_o.user_id = public.leads.owner_id
    )
  )
);

--------------------------------------------------------
-- INSERT POLICY
--------------------------------------------------------

drop policy if exists "leads_insert_policy" on public.leads;

create policy "leads_insert_policy"
on public.leads
for insert
with check (

  -- Allow only: admin OR counselor
  (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
    IN ('admin', 'counselor')
  )

  AND

  -- Ensure inserted lead belongs to user's tenant
  tenant_id = (
    current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id'
  )::uuid
);
