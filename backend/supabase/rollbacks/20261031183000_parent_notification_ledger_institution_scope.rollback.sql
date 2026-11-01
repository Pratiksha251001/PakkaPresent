-- Guarded rollback: the legacy claim RPC is incompatible with mandatory institution ownership.
begin;
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public'
    and table_name='parent_notification_attempts' and column_name='institution_id' and is_nullable='NO') then
    raise exception 'Rollback refused: institution_id is mandatory and the legacy RPC cannot create valid claims.';
  end if;
end $$;
-- After making institution_id nullable intentionally, restore the prior migration manually.
rollback;
