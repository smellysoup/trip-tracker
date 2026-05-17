-- Fix: original trip_totals view LEFT JOINed expense_splits, which multiplied each
-- expense row by the number of its splits, double-counting total_aed for even/custom
-- expenses. Per-participant share sums were unaffected (they sum split rows directly).
-- The fix pre-aggregates expenses and splits in separate subqueries, then joins to trips.

drop view if exists public.trip_totals;

create view public.trip_totals
with (security_invoker = on) as
select
  t.id                                  as trip_id,
  t.name,
  t.start_date,
  t.end_date,
  t.native_currency,
  coalesce(e_agg.expense_count, 0)      as expense_count,
  coalesce(e_agg.total_aed, 0)          as total_aed,
  coalesce(s_agg.melly_share_aed, 0)    as melly_share_aed,
  coalesce(s_agg.ash_share_aed, 0)      as ash_share_aed
from public.trips t
left join (
  select trip_id, count(*) as expense_count, sum(aed_price) as total_aed
  from public.expenses
  group by trip_id
) e_agg on e_agg.trip_id = t.id
left join (
  select e.trip_id,
    sum(case when es.participant = 'Melly' then es.share_amount_aed else 0 end) as melly_share_aed,
    sum(case when es.participant = 'Ash'   then es.share_amount_aed else 0 end) as ash_share_aed
  from public.expense_splits es
  join public.expenses e on e.id = es.expense_id
  group by e.trip_id
) s_agg on s_agg.trip_id = t.id;
