REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (name, email, login_id, phone, active, updated_at) ON public.profiles TO authenticated;