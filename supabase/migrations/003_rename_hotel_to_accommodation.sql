-- Rename the 'Hotel' category to 'Accommodation' (correct dictionary spelling).
-- The categories.name FK on expenses.category was created without ON UPDATE CASCADE,
-- so a direct UPDATE of categories.name would fail the FK check. Instead we:
--   1. Insert a new 'Accommodation' row with the existing color/icon/order
--   2. Repoint every expense that uses 'Hotel'
--   3. Delete the 'Hotel' row
-- Wrapped in a transaction so no expense ever points at a missing category.

begin;

insert into public.categories (name, color, icon, display_order)
select 'Accommodation', color, icon, display_order
from public.categories
where name = 'Hotel';

update public.expenses
set category = 'Accommodation'
where category = 'Hotel';

delete from public.categories where name = 'Hotel';

commit;
