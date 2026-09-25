-- 023_seed_family_resident_link.sql
-- Links the demo family login (family_member123@aethon.local) to the same
-- resident as the demo resident login (the first row in residents), so the
-- family screen can show that resident's family-visible goals.
-- Run 020 first (adds user_profiles.resident_id). Additive only. Do not
-- edit this file after it has been run anywhere — later changes go in a
-- new numbered file.

update public.user_profiles
set resident_id = (select id from public.residents order by created_at limit 1)
where id = (select id from auth.users where email = 'family_member123@aethon.local');
