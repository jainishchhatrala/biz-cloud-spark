ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions jsonb;
CREATE OR REPLACE FUNCTION public.has_perm(_module text, _action text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select case
    when public.my_role() is null then false
    when public.my_role() = 'Admin' then true
    when (select p.permissions ? _module from public.profiles p where p.id = auth.uid()) then
      coalesce((select (p.permissions -> _module ->> (case when _action = 'view' then 'view' else 'edit' end))::boolean from public.profiles p where p.id = auth.uid()), false)
    else coalesce((select (rp.modules -> _module ->> _action)::boolean from public.role_permissions rp where rp.role = public.my_role()), false)
  end
$function$;
REVOKE EXECUTE ON FUNCTION public.has_perm(text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_perm(text, text) TO authenticated;