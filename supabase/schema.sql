-- ============================================================
-- Yuge — Datenbank-Schema (CLAUDE.md §6)
-- Ausführen im Supabase-Dashboard: SQL Editor → New query → Run
-- ============================================================

create table if not exists orders (
  id          uuid primary key default gen_random_uuid(),
  session_id  text not null,
  status      text not null default 'aufgenommen'
              check (status in ('aufgenommen', 'in_zubereitung', 'fertig')),
  total       integer not null,
  paid        boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists order_items (
  id        uuid primary key default gen_random_uuid(),
  order_id  uuid not null references orders (id) on delete cascade,
  type      text not null check (type in ('bowl', 'drink', 'side')),
  name      text not null,
  price     integer not null,
  config    jsonb
);

-- Realtime für den Live-Status aktivieren (Kunden-Tablet abonniert orders)
alter publication supabase_realtime add table orders;

-- ------------------------------------------------------------
-- Row-Level-Security (öffentliches Tablet, anon-Key im Frontend!)
-- v1-Vorschlag: anon darf Bestellungen anlegen/lesen und den Status
-- bzw. paid ändern (Küchen-Ansicht läuft mit demselben Key).
-- Bewusst offen für die Demo — NICHT für einen echten Betrieb geeignet.
-- ------------------------------------------------------------
alter table orders enable row level security;
alter table order_items enable row level security;

create policy "anon kann Bestellungen anlegen"
  on orders for insert to anon with check (true);
create policy "anon kann Bestellungen lesen"
  on orders for select to anon using (true);
create policy "anon kann Status/paid aktualisieren"
  on orders for update to anon using (true) with check (true);

create policy "anon kann Positionen anlegen"
  on order_items for insert to anon with check (true);
create policy "anon kann Positionen lesen"
  on order_items for select to anon using (true);
