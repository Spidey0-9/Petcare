select tablename, policyname
from pg_policies
where schemaname = 'public'
  and policyname like '%super_admin_all'
order by tablename;