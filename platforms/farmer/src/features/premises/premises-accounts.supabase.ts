import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export interface PremisesAccount {
  id:                 string;
  premisesId:         string;
  premisesCode:       string;
  farmerId:           string;
  userId:             string | null;
  representativeName: string;
  email:              string;
  status:             'ACTIVE' | 'INACTIVE';
  createdAt:          string;
}

function mapRow(r: Record<string, unknown>): PremisesAccount {
  return {
    id:                 r.id as string,
    premisesId:         r.premises_id as string,
    premisesCode:       r.premises_code as string,
    farmerId:           r.farmer_id as string,
    userId:             r.user_id as string | null,
    representativeName: r.representative_name as string,
    email:              r.email as string,
    status:             r.status as 'ACTIVE' | 'INACTIVE',
    createdAt:          r.created_at as string,
  };
}

export async function fetchPremisesAccounts(farmerId: string): Promise<PremisesAccount[]> {
  const { data, error } = await supabase
    .from('premises_accounts')
    .select('*')
    .eq('farmer_id', farmerId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => mapRow(r as Record<string, unknown>));
}

export async function createPremisesAccount(params: {
  premisesId:         string;
  premisesCode:       string;
  farmerId:           string;
  representativeName: string;
  email:              string;
  password:           string;
}): Promise<PremisesAccount> {
  // Use a separate client instance so we don't disturb the farmer's active session.
  const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let userId: string;

  const { data: authData, error: authError } = await tempClient.auth.signUp({
    email: params.email.toLowerCase(),
    password: params.password,
    options: { data: { full_name: params.representativeName } },
  });

  if (authError) {
    if (authError.message.toLowerCase().includes('already registered')) {
      // Auth user exists from a prior failed attempt (orphan). Try to recover by
      // signing in — if the password matches, we can reuse the existing user ID.
      const { data: signIn, error: signInErr } = await tempClient.auth.signInWithPassword({
        email: params.email.toLowerCase(),
        password: params.password,
      });
      if (signInErr || !signIn.user) {
        throw new Error('This email is already registered with a different password.');
      }
      // Make sure it isn't already linked to another premises account.
      const { count } = await supabase
        .from('premises_accounts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', signIn.user.id);
      if ((count ?? 0) > 0) {
        throw new Error('A representative account already exists for this email.');
      }
      userId = signIn.user.id;
    } else {
      throw new Error(`Account creation failed: ${authError.message}`);
    }
  } else {
    if (!authData.user) throw new Error('Account creation failed. Please try again.');
    userId = authData.user.id;
  }

  // Use a SECURITY DEFINER RPC to bypass RLS — the function enforces its own
  // ownership check (caller must own p_farmer_id).
  const { error: rpcError } = await supabase.rpc('create_premises_account_for_farmer', {
    p_premises_id:         params.premisesId,
    p_premises_code:       params.premisesCode,
    p_farmer_id:           params.farmerId,
    p_user_id:             userId,
    p_representative_name: params.representativeName,
    p_email:               params.email.toLowerCase(),
  });

  if (rpcError) {
    if (rpcError.message.includes('unique') || rpcError.code === '23505')
      throw new Error('A representative account already exists for this premises.');
    throw new Error(rpcError.message);
  }

  // Fetch the newly created row to return it.
  const { data, error: fetchError } = await supabase
    .from('premises_accounts')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  return mapRow(data as Record<string, unknown>);
}

export async function updatePremisesAccount(id: string, patch: {
  representativeName?: string;
  status?:             'ACTIVE' | 'INACTIVE';
}): Promise<void> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.representativeName !== undefined) update.representative_name = patch.representativeName;
  if (patch.status !== undefined) update.status = patch.status;

  const { error } = await supabase.from('premises_accounts').update(update).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deletePremisesAccount(id: string): Promise<void> {
  const { error } = await supabase.from('premises_accounts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
