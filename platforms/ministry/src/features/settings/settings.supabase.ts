import { supabase } from '@/lib/supabase';

/* ── Delivery company settings (localStorage) ─────────────────── */
const DELIVERY_KEY = 'qxlits_delivery_settings';
export interface DeliverySettings { name: string; email: string; phone: string; }

export function getDeliverySettings(): DeliverySettings {
  try { return { name: '', email: '', phone: '', ...JSON.parse(localStorage.getItem(DELIVERY_KEY) ?? '{}') }; }
  catch { return { name: '', email: '', phone: '' }; }
}
export function saveDeliverySettings(s: DeliverySettings): void {
  localStorage.setItem(DELIVERY_KEY, JSON.stringify(s));
}

export async function getAutoApproval(): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'auto_approval_enabled')
      .single();
    return data?.value !== 'false';
  } catch {
    return true;
  }
}

export async function setAutoApproval(enabled: boolean): Promise<void> {
  const { error } = await supabase.from('app_settings').upsert({
    key:        'auto_approval_enabled',
    value:      String(enabled),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export type MovementTaskMode = 'FIELD_INSPECTOR' | 'VETERINARY_OFFICER' | 'BOTH';

export async function getMovementTaskMode(): Promise<MovementTaskMode> {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'movement_task_mode')
      .single();
    const v = data?.value as MovementTaskMode;
    return v === 'FIELD_INSPECTOR' || v === 'VETERINARY_OFFICER' ? v : 'BOTH';
  } catch {
    return 'BOTH';
  }
}

export async function setMovementTaskMode(mode: MovementTaskMode): Promise<void> {
  const { error } = await supabase.from('app_settings').upsert({
    key:        'movement_task_mode',
    value:      mode,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/* ── Inspection escalation threshold ──────────────────────────── */
export async function getEscalationDays(): Promise<number> {
  try {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'inspection_escalation_days').single();
    return parseInt(data?.value ?? '2', 10);
  } catch { return 2; }
}

export async function setEscalationDays(days: number): Promise<void> {
  const { error } = await supabase.from('app_settings').upsert({
    key:        'inspection_escalation_days',
    value:      String(days),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/* ── Tag replacement approval mode ────────────────────────────── */
export async function getTagReplacementApproval(): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'tag_replacement_requires_approval')
      .single();
    return data?.value !== 'false';
  } catch {
    return true;
  }
}

export async function setTagReplacementApproval(required: boolean): Promise<void> {
  const { error } = await supabase.from('app_settings').upsert({
    key:        'tag_replacement_requires_approval',
    value:      String(required),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

