-- Run in: Supabase Dashboard → SQL Editor

CREATE POLICY "field_officers_update_movement_status"
ON public.farmer_movement_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_registrations
    WHERE email = (auth.jwt() ->> 'email')
      AND role IN ('FIELD_INSPECTOR','VETERINARY_OFFICER','CHECKPOINT_OFFICER','QUARANTINE_OFFICER')
  )
);
