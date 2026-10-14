-- Secure checkout RPC: server/database calculates totals from current prices.
-- This migration has already been applied to the connected Bein Store Supabase project.
create or replace function public.create_public_order(p_customer jsonb, p_items jsonb)
returns table(order_number bigint, total_egp numeric)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid; v_order_number bigint; v_subtotal numeric(12,2) := 0; v_total numeric(12,2) := 0;
  v_item record; v_product record; v_stock integer;
  v_customer_name text; v_customer_phone text; v_customer_email text; v_shipping_address text; v_city text; v_notes text;
begin
  if jsonb_typeof(p_customer) <> 'object' or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then raise exception 'INVALID_ORDER'; end if;
  v_customer_name := left(trim(coalesce(p_customer->>'customer_name','')),120);
  v_customer_phone := left(trim(coalesce(p_customer->>'customer_phone','')),24);
  v_customer_email := nullif(left(trim(coalesce(p_customer->>'customer_email','')),180),'');
  v_shipping_address := left(trim(coalesce(p_customer->>'shipping_address','')),500);
  v_city := left(trim(coalesce(p_customer->>'city','')),100);
  v_notes := nullif(left(trim(coalesce(p_customer->>'notes','')),1000),'');
  if length(v_customer_name) < 2 or length(regexp_replace(v_customer_phone,'\D','','g')) < 8 or v_shipping_address = '' or v_city = '' then raise exception 'INVALID_CUSTOMER'; end if;
  for v_item in select product_id, sum(quantity)::integer as quantity from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer) group by product_id loop
    if v_item.product_id is null or v_item.quantity < 1 or v_item.quantity > 99 then raise exception 'INVALID_ITEM'; end if;
    select p.id,p.name_ar,p.sku,p.price_egp into v_product from public.products p where p.id=v_item.product_id and p.is_active=true and p.price_egp is not null for share;
    if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;
    select i.quantity_on_hand into v_stock from public.inventory i where i.product_id=v_item.product_id for update;
    if found then if v_stock < v_item.quantity then raise exception 'INSUFFICIENT_STOCK'; end if; update public.inventory set quantity_on_hand=quantity_on_hand-v_item.quantity,updated_at=now() where product_id=v_item.product_id; end if;
    v_subtotal := v_subtotal + (v_product.price_egp * v_item.quantity);
  end loop;
  v_total := v_subtotal;
  insert into public.orders(customer_name,customer_phone,customer_email,shipping_address,city,notes,language,status,currency,subtotal_egp,shipping_fee_egp,total_egp) values(v_customer_name,v_customer_phone,v_customer_email,v_shipping_address,v_city,v_notes,'ar','new','EGP',v_subtotal,0,v_total) returning id,orders.order_number into v_order_id,v_order_number;
  for v_item in select product_id,sum(quantity)::integer as quantity from jsonb_to_recordset(p_items) as x(product_id uuid,quantity integer) group by product_id loop
    select p.id,p.name_ar,p.sku,p.price_egp into v_product from public.products p where p.id=v_item.product_id;
    insert into public.order_items(order_id,product_id,product_name_snapshot,sku_snapshot,quantity,unit_price_egp,line_total_egp) values(v_order_id,v_product.id,v_product.name_ar,v_product.sku,v_item.quantity,v_product.price_egp,v_product.price_egp*v_item.quantity);
    if exists(select 1 from public.inventory i where i.product_id=v_item.product_id) then insert into public.inventory_movements(product_id,quantity_delta,reason,reference,created_by) values(v_item.product_id,-v_item.quantity,'بيع عبر المتجر','Order #'||v_order_number,auth.uid()); end if;
  end loop;
  return query select v_order_number,v_total;
end;
$$;
revoke all on function public.create_public_order(jsonb,jsonb) from public;
grant execute on function public.create_public_order(jsonb,jsonb) to anon,authenticated;
