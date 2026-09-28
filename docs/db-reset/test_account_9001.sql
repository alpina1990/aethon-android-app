-- Test carer account for Flynn (ID 9001). The account itself is created in
-- Supabase > Authentication > Users (email staff_9001@aethon.local, password
-- "PIN-" + 4 digits, auto-confirmed). This gives it a role; change 'caregiver'
-- to 'family' or 'resident' to test those screens, then reopen the app.
insert into public.user_profiles (id, role, full_name, facility_id, nurse_id, resident_id)
select u.id,
       'caregiver',
       'Test Carer (Flynn)',
       '00000000-0000-0000-0000-000000000001',
       '9001',
       (select id from public.residents order by created_at limit 1)
from auth.users u
where u.email = 'staff_9001@aethon.local'
on conflict (id) do update
  set role = excluded.role,
      full_name = excluded.full_name,
      facility_id = excluded.facility_id,
      nurse_id = excluded.nurse_id,
      resident_id = excluded.resident_id
returning id, role, full_name, nurse_id, resident_id;
