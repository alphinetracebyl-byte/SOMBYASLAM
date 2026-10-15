import { supabase } from '@/lib/supabase';

const BUCKET = 'farmer-photos';

/* ── helpers ── */

function phoneToAuthEmail(phone: string): string {
  // Synthetic stable email for phone-only farmers so Supabase Auth can store them.
  // Email confirmation must be DISABLED in the Supabase project settings.
  return `${phone.replace(/\D/g, '')}@farmer.qxlits.gov.so`;
}

export async function uploadFarmerFile(file: File, folder: string): Promise<string> {
  const ext  = file.name.split('.').pop() ?? 'jpg';
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/* ── Registration ── */

export interface FarmerRegistrationData {
  accountType:    string;
  companyName?:   string;
  licenseNumber?: string;
  companyAddress?:string;
  licenseUrl?:    string;
  addrProofUrl?:  string;
  fullName:       string;
  dateOfBirth:    string;
  gender:         string;
  phoneE164:      string;
  altPhone?:      string;
  email?:         string;
  nationalId:     string;
  idType:         string;
  region:         string;
  village?:       string;
  gpsLat?:        string;
  gpsLng?:        string;
  photoUrl?:      string;
  idFrontUrl?:    string;
  idBackUrl?:     string;
  password:       string;
}

export interface RegisterResult {
  farmerId:    string;
  farmerCode:  string;
  phoneLast4:  string;
}

async function isAutoApprovalEnabled(): Promise<boolean> {
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

export async function registerFarmer(data: FarmerRegistrationData): Promise<RegisterResult> {
  // Use the farmer's real email as their Supabase Auth identity so they log in with email.
  // Synthetic phone email is the fallback only if no email is provided.
  const authEmail = data.email?.trim()
    ? data.email.trim().toLowerCase()
    : phoneToAuthEmail(data.phoneE164);

  // 1. Create the Supabase Auth account.
  //    Email confirmation must be OFF in Supabase → Auth → Email settings.
  let userId: string;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: authEmail,
    password: data.password,
    options: { data: { full_name: data.fullName } },
  });

  if (authError) {
    if (authError.message.toLowerCase().includes('already registered')) {
      // A previous partial registration may have created the auth user but failed
      // before inserting the farmers row. Sign in to recover.
      const { data: signIn, error: signInErr } = await supabase.auth.signInWithPassword({
        email: authEmail, password: data.password,
      });
      if (signInErr || !signIn.user) {
        throw new Error('This email is already registered. Please sign in instead.');
      }
      const { count } = await supabase
        .from('farmers')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', signIn.user.id);
      if ((count ?? 0) > 0) {
        throw new Error('This email is already registered. Please sign in instead.');
      }
      userId = signIn.user.id;
    } else {
      throw new Error(`Account creation failed: ${authError.message}`);
    }
  } else {
    if (!authData.user) throw new Error('Account creation failed. Please try again.');
    userId = authData.user.id;
  }

  const autoApprove = await isAutoApprovalEnabled();
  const now = new Date().toISOString();

  // 2. Insert the farmer profile row, linking to the auth user.
  const { data: row, error } = await supabase
    .from('farmers')
    .insert({
      user_id:         userId,
      account_type:    data.accountType,
      company_name:    data.companyName    || null,
      license_number:  data.licenseNumber  || null,
      company_address: data.companyAddress || null,
      license_url:     data.licenseUrl     || null,
      addr_proof_url:  data.addrProofUrl   || null,
      full_name:       data.fullName,
      date_of_birth: data.dateOfBirth || null,
      gender:        data.gender,
      phone_e164:    data.phoneE164,
      alt_phone:     data.altPhone   || null,
      email:         data.email      || null,
      national_id:   data.nationalId,
      id_type:       data.idType,
      region:        data.region,
      village:       data.village    || null,
      gps_lat:       data.gpsLat ? parseFloat(data.gpsLat) : null,
      gps_lng:       data.gpsLng ? parseFloat(data.gpsLng) : null,
      photo_url:     data.photoUrl    || null,
      id_front_url:  data.idFrontUrl  || null,
      id_back_url:   data.idBackUrl   || null,
      status:        autoApprove ? 'APPROVED' : 'PENDING',
      approved_at:   autoApprove ? now : null,
      approved_by:   autoApprove ? 'SYSTEM' : null,
    })
    .select('id, farmer_code, phone_e164')
    .single();

  if (error) {
    if (error.code === '23505') {
      if (error.message.includes('phone_e164')) {
        // Farmers row already exists from a previous partial attempt — fetch and return it.
        const { data: existing } = await supabase
          .from('farmers')
          .select('id, farmer_code, phone_e164')
          .eq('phone_e164', data.phoneE164)
          .single();
        if (existing) {
          return { farmerId: existing.id, farmerCode: existing.farmer_code, phoneLast4: existing.phone_e164.slice(-4) };
        }
        throw new Error('This phone number is already registered. Please sign in instead.');
      }
      if (error.message.includes('national_id')) throw new Error('This National ID is already registered.');
    }
    throw new Error(error.message);
  }

  return {
    farmerId:   row.id,
    farmerCode: row.farmer_code,
    phoneLast4: row.phone_e164.slice(-4),
  };
}

export async function checkPhoneExists(phone: string): Promise<boolean> {
  const { count } = await supabase
    .from('farmers')
    .select('id', { count: 'exact', head: true })
    .eq('phone_e164', phone);
  return (count ?? 0) > 0;
}

/* ── Login ── */

export interface FarmerSession {
  userId:       string;
  accessToken:  string;
  refreshToken: string;
  farmerId:     string;
  farmerCode:   string;
  farmerName:   string;
  farmerStatus: string;
  region:       string;
  accountRole:  'FARMER' | 'PREMISES_REP';
  premisesCode?: string;
  premisesId?:  string;
}

export async function loginFarmer(identifier: string, password: string): Promise<FarmerSession> {
  const id  = identifier.trim();
  const pwd = password.trim();
  if (!id)  throw new Error('Enter your phone number or email address.');
  if (!pwd) throw new Error('Enter your password.');

  // Resolve the Supabase Auth email for this identifier.
  // New farmers: Supabase Auth email = their real email.
  // Old farmers (pre-email): Supabase Auth email = synthetic phone email.
  // When a phone number is entered, we try the synthetic email first; if that fails
  // we look up their stored email from the farmers table via a public RPC.
  let authEmail: string;
  if (id.includes('@')) {
    authEmail = id.toLowerCase();
  } else if (id.startsWith('+') || /^\d/.test(id)) {
    authEmail = phoneToAuthEmail(id);
  } else {
    throw new Error('Enter a valid email address or phone number.');
  }

  let signInData = await supabase.auth.signInWithPassword({ email: authEmail, password: pwd });

  // If synthetic-email login failed and identifier was a phone, try looking up
  // the farmer's real email and retry.
  if (signInData.error && !id.includes('@') && (id.startsWith('+') || /^\d/.test(id))) {
    const { data: lookup } = await supabase
      .from('farmers')
      .select('email')
      .eq('phone_e164', id)
      .maybeSingle();
    if (lookup?.email) {
      signInData = await supabase.auth.signInWithPassword({ email: lookup.email, password: pwd });
    }
  }

  const { data, error } = signInData;
  if (error) {
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      throw new Error('Incorrect email/phone or password. Please try again.');
    }
    throw new Error(error.message);
  }
  if (!data.user || !data.session) throw new Error('Login failed. Please try again.');

  // 1. Try main farmer profile.
  const { data: farmer } = await supabase
    .from('farmers')
    .select('id, farmer_code, full_name, status, region')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (farmer) {
    const f = farmer as Record<string, string>;
    if (f.status === 'PENDING')
      throw new Error('Your registration is pending ministry approval. You will be notified by SMS when approved.');
    if (f.status === 'SUSPENDED')
      throw new Error('Your account has been suspended. Contact your regional or ministry livestock office.');
    if (f.status === 'REJECTED')
      throw new Error('Your application was not approved. Contact your regional or ministry livestock office.');

    return {
      userId:       data.user.id,
      accessToken:  data.session.access_token,
      refreshToken: data.session.refresh_token,
      farmerId:     f.id,
      farmerCode:   f.farmer_code,
      farmerName:   f.full_name,
      farmerStatus: f.status,
      region:       f.region,
      accountRole:  'FARMER',
    };
  }

  // 2. Try premises representative account.
  const { data: rep } = await supabase
    .from('premises_accounts')
    .select('id, premises_id, premises_code, farmer_id, representative_name, status')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (rep) {
    const r = rep as Record<string, string>;
    if (r.status === 'INACTIVE')
      throw new Error('Your representative account is inactive. Contact the main account holder.');

    // Fetch parent farmer details for region context.
    const { data: parentFarmer } = await supabase
      .from('farmers')
      .select('farmer_code, region')
      .eq('id', r.farmer_id)
      .maybeSingle();
    const pf = (parentFarmer ?? {}) as Record<string, string>;

    return {
      userId:       data.user.id,
      accessToken:  data.session.access_token,
      refreshToken: data.session.refresh_token,
      farmerId:     r.farmer_id,
      farmerCode:   pf.farmer_code ?? '',
      farmerName:   r.representative_name,
      farmerStatus: 'ACTIVE',
      region:       pf.region ?? '',
      accountRole:  'PREMISES_REP',
      premisesCode: r.premises_code,
      premisesId:   r.premises_id,
    };
  }

  throw new Error('Account not found. Contact your regional or ministry livestock office.');
}

export async function signOutFarmer(): Promise<void> {
  await supabase.auth.signOut();
}
