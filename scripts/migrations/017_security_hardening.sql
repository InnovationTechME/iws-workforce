-- Tighten Supabase security advisor findings without changing the app's
-- existing authenticated-user workflow.

ALTER VIEW public.payroll_summary SET (security_invoker = true);
ALTER VIEW public.document_status_summary SET (security_invoker = true);
ALTER VIEW public.site_workforce SET (security_invoker = true);

ALTER FUNCTION public.set_timesheet_discrepancies_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_warning_expiry() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_payroll_retention() SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_payroll_batch(integer, integer, text) SET search_path = public, pg_temp;

ALTER FUNCTION public.generate_payroll_batch(integer, integer, text) SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.generate_payroll_batch(integer, integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.generate_payroll_batch(integer, integer, text) TO authenticated;
