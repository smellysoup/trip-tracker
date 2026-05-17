-- ============================================================
-- Trip Tracker — Initial Schema (v1.0.0)
-- Created: 2026-05-17
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

create type participant as enum ('Melly', 'Ash');

create type split_type as enum (
  'even',       -- equal split between all participants
  'custom',     -- unequal split, explicit amounts per participant
  'personal',   -- one person paid for themselves only
  'reference'   -- informational only, not split (e.g. flights paid separately)
);

create type payment_method as enum ('cash', 'card', 'mixed', 'unknown');

-- ============================================================
-- CATEGORIES (lookup)
-- ============================================================

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#6b7280',
  icon text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into categories (name, color, icon, display_order) values
  ('Hotel',          '#3b82f6', 'bed',           1),
  ('Transportation', '#f59e0b', 'car',           2),
  ('Food',           '#ef4444', 'utensils',      3),
  ('Entertainment',  '#8b5cf6', 'ticket',        4),
  ('Shopping',       '#10b981', 'shopping-bag', 5);

-- ============================================================
-- TRIPS
-- ============================================================

create table trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  destination text,
  start_date date,
  end_date date,
  native_currency text not null,           -- ISO code: 'EUR', 'NOK', 'SCR', 'TWD', etc.
  fx_rate_to_aed numeric(12, 6) not null,  -- default conversion rate for this trip
  participants participant[] not null default array['Melly', 'Ash']::participant[],
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trips_start_date_idx on trips (start_date desc);

-- ============================================================
-- EXPENSES
-- ============================================================

create table expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  line_no int not null,                    -- preserves source row order for "as-is" view
  item text not null,
  category text not null references categories(name),
  expense_date date,                       -- structured date for analysis
  expense_date_text text,                  -- free-form for display, e.g. 'May 9 - 12'
  native_currency text,                    -- null if paid in AED only
  native_price numeric(12, 2),             -- null if paid in AED only
  aed_price numeric(12, 2) not null,       -- authoritative amount
  fx_rate_used numeric(12, 6),             -- overrides trip default when set
  payment_method payment_method not null default 'unknown',
  paid_by participant,                     -- nullable; null = unknown
  split_type split_type not null default 'even',
  description text,
  receipt_url text,                        -- Supabase Storage path for future OCR feature
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, line_no)
);

create index expenses_trip_idx on expenses (trip_id);
create index expenses_category_idx on expenses (category);
create index expenses_date_idx on expenses (expense_date);

-- ============================================================
-- EXPENSE SPLITS
-- ============================================================
-- One row per participant who owes something for this expense.
-- For 'reference' expenses: no splits rows (informational only).
-- For 'personal' expenses: one row for the payer (100%).
-- For 'even'/'custom': rows for each participant.
-- Sum of share_amount_aed should equal expenses.aed_price (except 'reference').

create table expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  participant participant not null,
  share_amount_aed numeric(12, 2) not null default 0,
  share_percent numeric(5, 2),             -- optional, can be derived
  created_at timestamptz not null default now(),
  unique (expense_id, participant)
);

create index expense_splits_expense_idx on expense_splits (expense_id);
create index expense_splits_participant_idx on expense_splits (participant);

-- ============================================================
-- ITINERARY (optional, used for trips that have day-by-day planning)
-- ============================================================

create table itinerary_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  day_date date not null,
  location text,
  accommodation_name text,
  accom_price_aed numeric(12, 2),
  morning text,
  afternoon text,
  evening text,
  notes text,
  created_at timestamptz not null default now(),
  unique (trip_id, day_date)
);

create index itinerary_trip_idx on itinerary_days (trip_id);

-- ============================================================
-- ACCOMMODATION RESEARCH (shortlists)
-- ============================================================

create table accommodation_research (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  vendor text not null,
  link text,
  location text,
  check_in date,
  check_out date,
  nights int,
  price_per_night_aed numeric(12, 2),
  total_aed numeric(12, 2),
  ranking smallint check (ranking between 1 and 5),
  selected boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create index accom_trip_idx on accommodation_research (trip_id);

-- ============================================================
-- TRIGGERS — auto-update updated_at on mutations
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trips_set_updated_at
  before update on trips
  for each row execute function update_updated_at();

create trigger expenses_set_updated_at
  before update on expenses
  for each row execute function update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table trips                  enable row level security;
alter table expenses               enable row level security;
alter table expense_splits         enable row level security;
alter table itinerary_days         enable row level security;
alter table accommodation_research enable row level security;
alter table categories             enable row level security;

-- Allowlist function (single source of truth — easier to update later)
create or replace function is_allowlisted()
returns boolean as $$
  select auth.email() in (
    'amelnyk.digital@gmail.com',
    'ashee.edwards@gmail.com'
  );
$$ language sql stable security definer;

-- Apply to all tables
create policy "allowlisted full access" on trips
  for all using (is_allowlisted()) with check (is_allowlisted());

create policy "allowlisted full access" on expenses
  for all using (is_allowlisted()) with check (is_allowlisted());

create policy "allowlisted full access" on expense_splits
  for all using (is_allowlisted()) with check (is_allowlisted());

create policy "allowlisted full access" on itinerary_days
  for all using (is_allowlisted()) with check (is_allowlisted());

create policy "allowlisted full access" on accommodation_research
  for all using (is_allowlisted()) with check (is_allowlisted());

create policy "allowlisted read" on categories
  for select using (is_allowlisted());

-- ============================================================
-- VIEWS — for the dashboard later
-- ============================================================

create or replace view trip_totals as
select
  t.id                                       as trip_id,
  t.name,
  t.start_date,
  t.end_date,
  t.native_currency,
  count(distinct e.id)                       as expense_count,
  coalesce(sum(e.aed_price), 0)              as total_aed,
  coalesce(sum(case when es.participant = 'Melly'
              then es.share_amount_aed else 0 end), 0) as melly_share_aed,
  coalesce(sum(case when es.participant = 'Ash'
              then es.share_amount_aed else 0 end), 0) as ash_share_aed
from trips t
left join expenses e on e.trip_id = t.id
left join expense_splits es on es.expense_id = e.id
group by t.id, t.name, t.start_date, t.end_date, t.native_currency;

create or replace view category_totals as
select
  e.trip_id,
  e.category,
  count(*)                  as expense_count,
  sum(e.aed_price)          as total_aed
from expenses e
group by e.trip_id, e.category;
