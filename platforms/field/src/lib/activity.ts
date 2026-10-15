import { supabase } from './supabase';

export type ActivityCategory =
  | 'ANIMAL' | 'MOVEMENT' | 'HEALTH' | 'PREMISES'
  | 'TAGGING' | 'VACCINATION' | 'CERTIFICATION' | 'QUARANTINE' | 'SLAUGHTER';

export type ActivityLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface LogActivityParams {
  category: ActivityCategory;
  level: ActivityLevel;
  title: string;
  detail?: string;
  actorName?: string;
  actorRole?: string;
  region?: string | null;
  district?: string | null;
  referenceCode?: string;
  userId?: string | null;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await supabase.from('activity_log').insert({
      portal:         'FIELD',
      category:       params.category,
      level:          params.level,
      title:          params.title,
      detail:         params.detail ?? null,
      actor_name:     params.actorName ?? null,
      actor_role:     params.actorRole ?? 'Field Officer',
      region:         params.region ?? null,
      district:       params.district ?? null,
      reference_code: params.referenceCode ?? null,
      user_id:        params.userId ?? null,
      farmer_id:      null,
    });
  } catch {
    // Fire-and-forget — never block the user action
  }
}
