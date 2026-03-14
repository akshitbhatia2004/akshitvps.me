create table if not exists public.products (
  id text primary key,
  type text not null,
  name text not null,
  ram text not null,
  cpu text not null,
  storage text not null,
  price numeric not null,
  description text not null
);

create table if not exists public.orders (
  id text primary key,
  product_id text not null references public.products(id) on delete restrict,
  product_name text not null,
  customer_name text not null,
  email text not null,
  phone text not null,
  telegram_id text,
  note text,
  payment_status text not null,
  order_status text not null,
  created_at text not null,
  created_at_label text not null,
  delivery_method text,
  credentials jsonb,
  cashfree_order_id text,
  cashfree_order_status text,
  payment_session_id text,
  order_received_email_sent boolean not null default false,
  payment_success_email_sent boolean not null default false,
  delivery_email_sent boolean not null default false
);

alter table public.orders add column if not exists order_received_email_sent boolean not null default false;
alter table public.orders add column if not exists payment_success_email_sent boolean not null default false;
alter table public.orders add column if not exists delivery_email_sent boolean not null default false;
