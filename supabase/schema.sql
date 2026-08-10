-- ============================================================================
-- NACLOS OPERATIONS & AUDIT PORTAL — DATABASE SCHEMA
-- Target: Supabase / PostgreSQL 15+
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- ENUM TYPES
-- ----------------------------------------------------------------------------
create type closure_status as enum ('draft', 'submitted', 'locked', 'admin_reopened');
create type stock_unit as enum ('kg', 'unit', 'pack', 'bag', 'can');

-- ----------------------------------------------------------------------------
-- STAFF (for advances / employee loans)
-- ----------------------------------------------------------------------------
create table staff_members (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  role text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- DAILY CLOSURES (one row per store per business day — the "master" record)
-- ----------------------------------------------------------------------------
create table daily_closures (
  id uuid primary key default uuid_generate_v4(),
  business_date date not null,
  store_id text not null default 'main',
  manager_name text not null,

  gross_revenue numeric(12,2) not null default 0,       -- Total Revenue collected in MAD
  total_expenses numeric(12,2) not null default 0,        -- auto-calculated from expenses table
  total_staff_advances numeric(12,2) not null default 0,  -- auto-calculated from staff_advances table
  net_cash numeric(12,2) not null default 0,               -- gross_revenue - total_expenses - total_staff_advances
  net_profit numeric(12,2) not null default 0,             -- gross_revenue - total_expenses

  status closure_status not null default 'draft',
  has_inventory_discrepancy boolean not null default false,
  discrepancy_summary text,

  submitted_at timestamptz,
  locked_at timestamptz,
  reopened_by text,
  reopened_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (business_date, store_id)
);

create index idx_daily_closures_date on daily_closures (business_date desc);
create index idx_daily_closures_status on daily_closures (status);

-- ----------------------------------------------------------------------------
-- STAFF ADVANCES (Avances en DH)
-- ----------------------------------------------------------------------------
create table staff_advances (
  id uuid primary key default uuid_generate_v4(),
  closure_id uuid not null references daily_closures(id) on delete cascade,
  staff_member_id uuid references staff_members(id),
  employee_name text not null,   -- denormalized snapshot, kept even if staff record is later edited/removed
  amount numeric(12,2) not null check (amount >= 0),
  note text,
  created_at timestamptz not null default now()
);

create index idx_staff_advances_closure on staff_advances (closure_id);

-- ----------------------------------------------------------------------------
-- EXPENSES (Périmètre des Dépenses)
-- ----------------------------------------------------------------------------
create table expense_categories (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,        -- e.g. 'fournisseur', 'salem', 'vh', 'chika', 'frite', 'gaz'
  label_fr text not null,
  sort_order int not null default 0
);

insert into expense_categories (code, label_fr, sort_order) values
  ('fournisseur', 'Fournisseur (Fournitures Générales)', 1),
  ('salem', 'Salem (Viande / Volaille)', 2),
  ('vh', 'VH (Viande Hachée)', 3),
  ('chika', 'Chika (Poulet Crispy)', 4),
  ('frite', 'Frite', 5),
  ('gaz', 'Gaz (Bonbonnes)', 6),
  ('legumes', 'Légumes / Khodra', 7),
  ('oni', 'Oni', 8),
  ('dej_staff', 'Déjeuner / Staff Food', 9),
  ('oils_sauces', 'Huiles / Sauces', 10),
  ('nettoyage', 'Nettoyage / Propreté', 11),
  ('maintenance', 'Maintenance (Plombier / Électricien)', 12),
  ('divers', 'Divers / Miscellaneous', 13);

create table expenses (
  id uuid primary key default uuid_generate_v4(),
  closure_id uuid not null references daily_closures(id) on delete cascade,
  category_id uuid references expense_categories(id),
  label text not null,           -- Nom (free text, e.g. "Sac de farine x2")
  amount numeric(12,2) not null check (amount >= 0),   -- Prix en DH
  created_at timestamptz not null default now()
);

create index idx_expenses_closure on expenses (closure_id);

-- ----------------------------------------------------------------------------
-- RAW MATERIALS CATALOG (the 15 tracked ingredients)
-- ----------------------------------------------------------------------------
create table raw_materials (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  label_fr text not null,
  unit stock_unit not null,
  sort_order int not null default 0
);

insert into raw_materials (code, label_fr, unit, sort_order) values
  ('dinde', 'Dinde (Turkey Breast)', 'kg', 1),
  ('vh', 'Viande Hachée (VH)', 'kg', 2),
  ('mozzarella', 'Mozzarella', 'kg', 3),
  ('crispy_chicken', 'Crispy Chicken', 'kg', 4),
  ('tortilla', 'Tortilla / Pain Tacos', 'pack', 5),
  ('chika', 'Chika', 'kg', 6),
  ('burger_buns', 'Burger Buns', 'unit', 7),
  ('frites', 'Frites', 'bag', 8),
  ('soda_cans', 'Soda Cans', 'can', 9),
  ('eau_petite', 'Eau Petite', 'unit', 10),
  ('eau_grande', 'Eau Grande', 'unit', 11),
  ('fromage', 'Fromage / Slices', 'pack', 12),
  ('fruits_de_mer', 'Fruits de Mer (FM)', 'kg', 13),
  ('thon', 'Thon', 'kg', 14),
  ('jambon', 'Jambon', 'kg', 15);

-- ----------------------------------------------------------------------------
-- INVENTORY LOGS (Suivi du Stock & Consommation) — one row per material/day
-- ----------------------------------------------------------------------------
create table inventory_logs (
  id uuid primary key default uuid_generate_v4(),
  closure_id uuid not null references daily_closures(id) on delete cascade,
  raw_material_id uuid not null references raw_materials(id),

  opening_stock numeric(12,3) not null default 0,     -- Stock Initial
  supply_purchased numeric(12,3) not null default 0,  -- Alimentation / Achats
  consumed_amount numeric(12,3) not null default 0,   -- Consommation / Utilisation (derived from sales, editable override)
  physical_closing_count numeric(12,3) not null default 0, -- manager's physical count at close

  -- generated column: what SHOULD remain, per formula
  calculated_remaining_stock numeric(12,3) generated always as
    (opening_stock + supply_purchased - consumed_amount) stored,

  -- generated column: variance between physical count and calculated expectation
  variance numeric(12,3) generated always as
    (physical_closing_count - (opening_stock + supply_purchased - consumed_amount)) stored,

  is_flagged boolean generated always as
    (abs(physical_closing_count - (opening_stock + supply_purchased - consumed_amount)) > 0.01) stored,

  created_at timestamptz not null default now(),

  unique (closure_id, raw_material_id)
);

create index idx_inventory_logs_closure on inventory_logs (closure_id);
create index idx_inventory_logs_flagged on inventory_logs (is_flagged) where is_flagged = true;

-- ----------------------------------------------------------------------------
-- MENU CATALOG (categories + items, mirrors section D of the spec)
-- ----------------------------------------------------------------------------
create table menu_categories (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,     -- 'tacos', 'burgers', 'pizza_p', 'pizza_m', 'gratins', 'italien', 'jus', 'boissons'
  label_fr text not null,
  sort_order int not null default 0
);

create table menu_items (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid not null references menu_categories(id),
  code text not null,
  label_fr text not null,
  unit_price numeric(10,2),      -- optional, used for revenue-reconciliation reporting
  sort_order int not null default 0,
  unique (category_id, code)
);

-- Seed categories
insert into menu_categories (code, label_fr, sort_order) values
  ('tacos', 'Tacos', 1),
  ('burgers', 'Burgers', 2),
  ('pizza_p', 'Pizza Petite', 3),
  ('pizza_m', 'Pizza Moyenne', 4),
  ('gratins', 'Gratins', 5),
  ('italien', 'Italien / Pâtes', 6),
  ('jus', 'Jus Naturels', 7),
  ('boissons', 'Boissons & Supports', 8);

-- Seed items (prices left null — fill in from real menu, used only for optional reconciliation)
insert into menu_items (category_id, code, label_fr, sort_order)
select id, v.code, v.label, v.sort_order from menu_categories, (values
  ('dinde','Dinde',1), ('fried_chicken','Poulet Frit',2), ('kefta','Kefta',3), ('mixte','Mixte',4)
) as v(code, label, sort_order) where menu_categories.code = 'tacos';

insert into menu_items (category_id, code, label_fr, sort_order)
select id, v.code, v.label, v.sort_order from menu_categories, (values
  ('hamburger','Hamburger',1), ('chicken_burger','Chicken Burger',2),
  ('cheese_burger','Cheese Burger',3), ('double_cheese_burger','Double Cheese Burger',4)
) as v(code, label, sort_order) where menu_categories.code = 'burgers';

insert into menu_items (category_id, code, label_fr, sort_order)
select id, v.code, v.label, v.sort_order from menu_categories, (values
  ('vh','Viande Hachée',1), ('margarita','Margarita',2), ('poulet','Poulet',3),
  ('thon','Thon',4), ('naclos','Naclos',5), ('fruit_de_mer','Fruit de Mer',6)
) as v(code, label, sort_order) where menu_categories.code = 'pizza_p';

insert into menu_items (category_id, code, label_fr, sort_order)
select id, v.code, v.label, v.sort_order from menu_categories, (values
  ('vh','Viande Hachée',1), ('margarita','Margarita',2), ('poulet','Poulet',3),
  ('thon','Thon',4), ('naclos','Naclos',5), ('fruit_de_mer','Fruit de Mer',6)
) as v(code, label, sort_order) where menu_categories.code = 'pizza_m';

insert into menu_items (category_id, code, label_fr, sort_order)
select id, v.code, v.label, v.sort_order from menu_categories, (values
  ('poulet','Poulet',1), ('jambon','Jambon',2), ('vh','Viande Hachée',3), ('mixte','Mixte',4)
) as v(code, label, sort_order) where menu_categories.code = 'gratins';

insert into menu_items (category_id, code, label_fr, sort_order)
select id, v.code, v.label, v.sort_order from menu_categories, (values
  ('dinde','Dinde',1), ('fried_chicken','Poulet Frit',2), ('kefta','Kefta',3), ('mixte','Mixte',4)
) as v(code, label, sort_order) where menu_categories.code = 'italien';

insert into menu_items (category_id, code, label_fr, sort_order)
select id, v.code, v.label, v.sort_order from menu_categories, (values
  ('orange','Orange',1), ('ananas','Ananas',2), ('mangue','Mangue',3),
  ('avocat','Avocat',4), ('panache','Panaché',5), ('tiramisu','Tiramisu',6)
) as v(code, label, sort_order) where menu_categories.code = 'jus';

insert into menu_items (category_id, code, label_fr, sort_order)
select id, v.code, v.label, v.sort_order from menu_categories, (values
  ('soda','Soda',1), ('eau_p','Eau P',2), ('eau_g','Eau G',3),
  ('frites_extra','Frites Extra',4), ('lben','Lben',5), ('sauces','Sauces',6)
) as v(code, label, sort_order) where menu_categories.code = 'boissons';

-- ----------------------------------------------------------------------------
-- MENU SALES (Ventes par Catégorie de Produits) — one row per item/day
-- ----------------------------------------------------------------------------
create table menu_sales (
  id uuid primary key default uuid_generate_v4(),
  closure_id uuid not null references daily_closures(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id),
  quantity_sold int not null default 0 check (quantity_sold >= 0),
  created_at timestamptz not null default now(),
  unique (closure_id, menu_item_id)
);

create index idx_menu_sales_closure on menu_sales (closure_id);

-- ----------------------------------------------------------------------------
-- AUDIT LOG (immutability / theft-prevention trail)
-- ----------------------------------------------------------------------------
create table audit_log (
  id uuid primary key default uuid_generate_v4(),
  closure_id uuid references daily_closures(id) on delete cascade,
  actor text not null,              -- manager name or admin identifier
  action text not null,             -- 'submit', 'lock', 'reopen', 'edit_after_lock', 'email_sent'
  detail jsonb,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- REPORT DELIVERY LOG (tracks nightly emails so cron never double-sends)
-- ----------------------------------------------------------------------------
create table report_deliveries (
  id uuid primary key default uuid_generate_v4(),
  closure_id uuid not null references daily_closures(id) on delete cascade,
  recipients text[] not null,
  pdf_url text,
  xlsx_url text,
  status text not null default 'sent',  -- 'sent' | 'failed'
  error_message text,
  sent_at timestamptz not null default now(),
  unique (closure_id)
);

-- ----------------------------------------------------------------------------
-- TRIGGERS: auto-recalculate totals on daily_closures whenever child rows change
-- ----------------------------------------------------------------------------
create or replace function recalc_closure_totals() returns trigger as $$
declare
  v_closure_id uuid;
  v_expenses numeric(12,2);
  v_advances numeric(12,2);
  v_revenue numeric(12,2);
  v_flagged boolean;
begin
  v_closure_id := coalesce(new.closure_id, old.closure_id);

  select coalesce(sum(amount), 0) into v_expenses from expenses where closure_id = v_closure_id;
  select coalesce(sum(amount), 0) into v_advances from staff_advances where closure_id = v_closure_id;
  select gross_revenue into v_revenue from daily_closures where id = v_closure_id;
  select exists(select 1 from inventory_logs where closure_id = v_closure_id and is_flagged) into v_flagged;

  update daily_closures
    set total_expenses = v_expenses,
        total_staff_advances = v_advances,
        net_cash = coalesce(v_revenue, 0) - v_expenses - v_advances,
        net_profit = coalesce(v_revenue, 0) - v_expenses,
        has_inventory_discrepancy = coalesce(v_flagged, false),
        updated_at = now()
    where id = v_closure_id;

  return null;
end;
$$ language plpgsql;

create trigger trg_recalc_on_expenses
  after insert or update or delete on expenses
  for each row execute function recalc_closure_totals();

create trigger trg_recalc_on_advances
  after insert or update or delete on staff_advances
  for each row execute function recalc_closure_totals();

create trigger trg_recalc_on_inventory
  after insert or update or delete on inventory_logs
  for each row execute function recalc_closure_totals();

-- Prevent edits to child tables once the parent closure is 'locked' (theft-prevention)
create or replace function block_edits_if_locked() returns trigger as $$
declare
  v_status closure_status;
  v_closure_id uuid;
begin
  v_closure_id := coalesce(new.closure_id, old.closure_id);
  select status into v_status from daily_closures where id = v_closure_id;
  if v_status = 'locked' then
    raise exception 'This daily closure is locked. Admin must reopen it before edits are allowed.';
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger trg_lock_expenses before insert or update or delete on expenses
  for each row execute function block_edits_if_locked();
create trigger trg_lock_advances before insert or update or delete on staff_advances
  for each row execute function block_edits_if_locked();
create trigger trg_lock_inventory before insert or update or delete on inventory_logs
  for each row execute function block_edits_if_locked();
create trigger trg_lock_sales before insert or update or delete on menu_sales
  for each row execute function block_edits_if_locked();

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (adjust roles/policies to match your Supabase auth setup)
-- ----------------------------------------------------------------------------
alter table daily_closures enable row level security;
alter table expenses enable row level security;
alter table staff_advances enable row level security;
alter table inventory_logs enable row level security;
alter table menu_sales enable row level security;
alter table audit_log enable row level security;
alter table report_deliveries enable row level security;

-- Authenticated managers can read/write their own store's data via API routes using
-- the service role key (server-side only). Client-side anon key is read-only on
-- non-locked rows for the current business day; adjust `store_id` claims as needed.
create policy "service role full access - closures" on daily_closures
  for all using (auth.role() = 'service_role');
create policy "service role full access - expenses" on expenses
  for all using (auth.role() = 'service_role');
create policy "service role full access - advances" on staff_advances
  for all using (auth.role() = 'service_role');
create policy "service role full access - inventory" on inventory_logs
  for all using (auth.role() = 'service_role');
create policy "service role full access - sales" on menu_sales
  for all using (auth.role() = 'service_role');
create policy "service role full access - audit" on audit_log
  for all using (auth.role() = 'service_role');
create policy "service role full access - deliveries" on report_deliveries
  for all using (auth.role() = 'service_role');
