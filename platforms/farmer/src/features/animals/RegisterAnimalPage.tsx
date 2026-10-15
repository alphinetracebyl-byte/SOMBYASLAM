import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader, Camera, X, Baby, ShoppingBag, Globe, Users, Plus, Building2, MapPin, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import {
  submitRegistration, requestPhotoUploadUrl,
  uploadPhotoToBlob, confirmPhotoUpload,
} from './animals.api';
import type { RegistrationFormData, Species } from './animals.types';
import { BREEDS, BREED_LABELS } from './animals.types';
import s from './register-animal-page.module.css';

// ── Domain config ──────────────────────────────────────────────────────────────

const SPECIES_CONFIG: Record<Species, { emoji: string; name: string; sub: string; bg: string }> = {
  CATTLE: { emoji: '🐄', name: 'Cattle',  sub: 'Zebu, Boran, Somali breeds',          bg: '#fff7ed' },
  CAMEL:  { emoji: '🐪', name: 'Camel',   sub: 'Dromedary (one hump)',                bg: '#fefce8' },
  GOAT:   { emoji: '🐐', name: 'Goat',    sub: 'Somali, Galla, Benadir',              bg: '#f0fdf4' },
  SHEEP:  { emoji: '🐑', name: 'Sheep',   sub: 'Blackhead, Ogaden, Benadir',          bg: '#f5f3ff' },
};

const COAT_COLORS = [
  { label: 'Black',      hex: '#1a1a1a' },
  { label: 'Dark Brown', hex: '#3d1c02' },
  { label: 'Brown',      hex: '#7c4a2c' },
  { label: 'Red-Brown',  hex: '#8b3a1a' },
  { label: 'Lt Brown',   hex: '#b87b55' },
  { label: 'Tan',        hex: '#c8a47a' },
  { label: 'Cream',      hex: '#f5dcb0' },
  { label: 'White',      hex: '#efefef' },
  { label: 'Grey',       hex: '#808080' },
  { label: 'Roan',       hex: '#b05030' },
  { label: 'Dun',        hex: '#c5a256' },
  { label: 'Piebald',    hex: '' },
];

const BCS = [
  { score: '1', label: 'Emaciated', desc: 'Bones visible' },
  { score: '2', label: 'Thin',      desc: 'Bones felt'    },
  { score: '3', label: 'Moderate',  desc: 'Normal'        },
  { score: '4', label: 'Good',      desc: 'Well-covered'  },
  { score: '5', label: 'Fat',       desc: 'Heavy fat'     },
];

const VACCINE_TYPES = [
  'FMD', 'Brucellosis', 'Anthrax', 'PPR',
  'Blackleg', 'CBPP', 'Lumpy Skin', 'Rift Valley Fever',
];

const TAG_COLORS = [
  { label: 'Yellow', hex: '#facc15' },
  { label: 'Orange', hex: '#f97316' },
  { label: 'Red',    hex: '#ef4444' },
  { label: 'Green',  hex: '#22c55e' },
  { label: 'Blue',   hex: '#3b82f6' },
  { label: 'White',  hex: '#f1f5f9' },
  { label: 'Black',  hex: '#1a1a1a' },
];

const SOMALIA_PORTS = ['Mogadishu', 'Berbera', 'Kismayo', 'Bosaso', 'Marka'];

// ── Batch data (same mock set as AnimalsPage until API is wired) ───────────────

interface BatchOption {
  id: string;
  batchCode: string;
  batchName: string;
  species: string;
  count: number;
  status: string;
}

const BATCH_EMOJI: Record<string, string> = {
  Cattle: '🐄', Camel: '🐪', Goat: '🐐', Sheep: '🐑',
};

// ── Initial form state ─────────────────────────────────────────────────────────

const INITIAL: RegistrationFormData = {
  submissionType: '',
  species: '',
  breed: '',
  sex: '',
  dob: '',
  dobPrecision: 'EXACT',
  coatColor: '',
  distinguishingMarks: '',
  tagSerial: '',
  premisesId: '',
  photoFile: null,
  photoCaption: '',

  ageMonths: '',
  weightKg: '',
  bodyConditionScore: '',
  coatPattern: '',
  hornStatus: '',

  damTagSerial: '',
  sireTagSerial: '',

  sourceOwnerName: '',
  sourcePremisesId: '',
  purchaseDate: '',
  purchasePrice: '',

  countryOfOrigin: '',
  importPermitNumber: '',
  portOfEntry: '',
  importDate: '',

  batchCode: '',
  batchId: '',

  tagType: 'RFID',
  tagColor: 'Yellow',
  tagPlacement: '',
  secondaryTagSerial: '',

  healthStatus: '',
  vaccinationStatus: '',
  lastVaccinationDate: '',
  vaccinationTypes: [],
  dewormingStatus: '',
  veterinaryNotes: '',

  rightSidePhoto: null,
  frontPhoto: null,
  tagCloseupPhoto: null,
};

// ── Field help ────────────────────────────────────────────────────────────────

const FIELD_HELP: Record<string, { title: string; body: string; tip?: string; visuals?: Array<{ icon: string; label: string; desc: string }> }> = {
  submissionType: {
    title: 'Registration Type',
    body: 'Choose how you acquired this animal. Birth — born on your farm. Purchase — bought from another owner. Import — brought from another country.',
    tip: 'The registration type determines which origin details you will need to provide in Section 4.',
  },
  species: {
    title: 'Species',
    body: 'Select the livestock species. Each species has its own breed list and specific requirements under Somali livestock regulations.',
    tip: 'Only Cattle, Camel, Goat and Sheep are covered. Select the one that best describes your animal.',
  },
  breed: {
    title: 'Breed',
    body: 'Select the breed that most closely matches your animal. Breeds are filtered based on the species you selected above.',
    tip: 'If the exact breed is not listed, choose the closest match and describe distinctive features in the Distinguishing Marks field.',
  },
  sex: {
    title: 'Sex',
    body: 'Record the biological sex of the animal at the time of registration. Use Unknown only when sex genuinely cannot be determined.',
  },
  dob: {
    title: 'Date of Birth',
    body: 'Enter the exact or approximate date the animal was born. If you do not know the birth date, leave this blank and enter an estimated age in months instead.',
    tip: 'Use the DOB Precision field that appears alongside to indicate whether this date is exact or estimated.',
  },
  dobPrecision: {
    title: 'DOB Precision',
    body: 'Indicates how reliable the Date of Birth is. Exact — confirmed from records or direct knowledge. Estimated — approximate, based on size or memory.',
    tip: 'Authorities use DOB precision to assess the quality of traceability data.',
  },
  ageMonths: {
    title: 'Estimated Age (months)',
    body: "If you do not know the birth date, enter the animal's approximate age in months. A young calf is typically 0–6 months; a yearling 12–24 months.",
    tip: 'Leave this blank if you have entered a Date of Birth. Example: enter 18 for a year-and-a-half-old animal.',
  },
  weightKg: {
    title: 'Live Weight (kg)',
    body: "Enter the animal's live body weight in kilograms at time of registration. Use a scale if available.",
    tip: 'Typical ranges: Cattle 150–600 kg · Camel 300–700 kg · Goat 20–60 kg · Sheep 20–80 kg. Example: 180 for a young cow.',
  },
  bodyConditionScore: {
    title: 'Body Condition Score (BCS)',
    body: "A 1–5 scale describing the animal's body fat and muscle cover. 1 = severely thin, 3 = normal, 5 = very fat.",
    tip: 'Feel the backbone and ribs. If bones protrude sharply: 1–2. If covered but felt: 3. Hard to feel: 4–5.',
  },
  coatColor: {
    title: 'Coat Color',
    body: 'Select the swatch that best matches the dominant coat color. Choose Piebald if the animal has large patches of two or more distinct colors.',
    tip: 'For mixed-color animals, select the color that covers the largest area of the body.',
  },
  coatPattern: {
    title: 'Coat Pattern',
    body: 'The distribution of color across the animal\'s coat. Select the pattern that best describes the overall appearance.',
    tip: 'Coat pattern combined with color is one of the most reliable visual identifiers during field verification. Be as accurate as possible.',
    visuals: [
      { icon: '🟫', label: 'Solid',    desc: 'One uniform color covering the entire body — no patches or markings.' },
      { icon: '🔵', label: 'Spotted',  desc: 'Small distinct spots or blotches of one color on a different base coat.' },
      { icon: '⬛', label: 'Piebald',  desc: 'Large irregular patches of two contrasting colors — commonly black and white or brown and white.' },
      { icon: '🟦', label: 'Striped',  desc: 'Visible bands or stripes running along the body — more common in some goat breeds.' },
    ],
  },
  hornStatus: {
    title: 'Horn Status',
    body: 'Record whether this animal has horns, was born without them, or had them removed. This is a key physical identifier used by field officers during on-site verification.',
    tip: 'Check carefully — polled animals are naturally hornless from birth, while dehorned animals will show a flat or scarred area where the horn base was.',
    visuals: [
      { icon: '🦌', label: 'Horned',   desc: 'Natural horns are present. Record this even if horns are short, broken, or growing asymmetrically.' },
      { icon: '🐄', label: 'Polled',   desc: 'The animal was born without horns — a natural genetic trait in some breeds such as Boran cattle.' },
      { icon: '✂️', label: 'Dehorned', desc: 'Horns were physically removed, typically at a young age. A flat or scarred horn base will be visible.' },
      { icon: '➖', label: 'N/A',      desc: 'Horn status does not apply — for example, most sheep breeds or very young animals where horn growth has not started.' },
    ],
  },
  distinguishingMarks: {
    title: 'Distinguishing Marks',
    body: 'Describe any unique features that help identify this specific animal: scars, brands, notches, unusual coat patches, or physical abnormalities.',
    tip: 'Be specific about location — e.g. "V-notch on right ear", "fire brand on left flank", "scar above left knee".',
  },
  damTagSerial: {
    title: 'Dam Tag Serial (Mother)',
    body: "If the mother is already registered in QXLITS, enter her official tag serial number. This links the calf to its dam and builds the herd's genealogy record.",
    tip: 'Enter the serial exactly as printed on the dam\'s tag. Optional — leave blank if the dam is not registered.',
  },
  sireTagSerial: {
    title: 'Sire Tag Serial (Father)',
    body: 'If the sire is registered in QXLITS, enter his official tag serial number. This establishes the paternal lineage for breeding records.',
    tip: 'For community bulls or unknown sires, leave this blank. Optional field.',
  },
  sourceOwnerName: {
    title: 'Source Owner Name',
    body: 'Full name of the previous owner who sold or transferred this animal to you. This becomes part of the ownership transfer record.',
    tip: 'This should match the name on the transfer receipt or sales document. Required for purchased animals.',
  },
  purchaseDate: {
    title: 'Purchase Date',
    body: 'The date you acquired the animal from the previous owner. This date becomes the official ownership transfer date in the system.',
    tip: 'Cannot be a future date. Must match your sales receipt or transfer document if one exists.',
  },
  purchasePrice: {
    title: 'Purchase Price (SOS)',
    body: 'The amount paid in Somali Shillings. This is recorded for provenance and market analysis purposes.',
    tip: 'Enter the total as a number without commas — e.g. 500000 for 500,000 SOS.',
  },
  sourcePremisesId: {
    title: 'Source Premises ID',
    body: "The registered premises ID of the holding or farm where the animal came from — the seller's registered location.",
    tip: 'Ask the seller for their QXLITS premises ID. It follows the format PRM-SOM-XXXX.',
  },
  countryOfOrigin: {
    title: 'Country of Origin',
    body: 'The country where the animal was located before being imported into Somalia. Must match your official import permit.',
    tip: 'Common origins include Ethiopia, Kenya, and Djibouti.',
  },
  importPermitNumber: {
    title: 'Import Permit Number',
    body: 'The official permit number issued by Somali authorities authorising the import of this specific animal.',
    tip: 'Required for all imported animals. Copy the number exactly as it appears on your import documentation.',
  },
  portOfEntry: {
    title: 'Port of Entry',
    body: 'The official border crossing or seaport through which the animal entered Somalia. Must match your import permit.',
    tip: 'Select the port listed on your import permit. Common ports: Mogadishu, Berbera, Kismayo, Bosaso.',
  },
  importDate: {
    title: 'Import Date',
    body: 'The date the animal officially crossed into Somalia. Must match the entry date on your import permit.',
    tip: 'Cannot be a future date. Check the customs stamp on your permit for the exact date.',
  },
  tagSerial: {
    title: 'Tag Serial Number',
    body: 'The unique serial number printed on the official ear tag or RFID transponder assigned by the livestock authority.',
    tip: 'Enter or scan exactly as printed on the tag. Do not add spaces or change the format.',
  },
  tagType: {
    title: 'Tag Type',
    body: 'Ear Tag — physical plastic or metal tag in the ear. RFID — electronic transponder for digital scanning. Both — animal carries a visual tag and an RFID chip.',
    tip: 'RFID tags enable electronic identification at checkpoints and markets.',
  },
  secondaryTagSerial: {
    title: 'RFID Serial Number',
    body: "If the animal also carries an RFID chip, enter its transponder number here. This field appears when Tag Type is set to 'Both'.",
    tip: 'RFID numbers are typically longer than visual tag serials and may start with a country code or manufacturer prefix.',
  },
  tagColor: {
    title: 'Tag Color',
    body: "Select the swatch that matches the color of the physical ear tag on the animal's ear.",
    tip: 'Color coding may indicate year of registration or herd group depending on local authority practice.',
  },
  tagPlacement: {
    title: 'Tag Placement',
    body: 'Which ear the tag is placed in. Left Ear — left ear only. Right Ear — right ear only. Both Ears — tags in both ears.',
    tip: 'Match the physical placement exactly. Incorrect placement makes field verification harder.',
  },
  premisesId: {
    title: 'Premises ID',
    body: 'Your official registered farm, holding or range ID issued by the Ministry of Livestock. Links the animal to your registered location.',
    tip: 'Contact your local livestock office if you do not have a premises ID. Registration cannot be completed without one.',
  },
  batchCode: {
    title: 'Batch Code (Optional)',
    body: 'If this animal is being registered as part of a group field session, enter the batch code here. The batch must already be opened at this premises by an inspector or vet.\n\nLeave blank if registering a single animal outside of a batch.',
    tip: 'Batch codes follow the format BAT-{PREMISES_CODE}-{YEAR}-{SEQUENCE} — e.g. BAT-SOM001-2026-0001.',
  },
  healthStatus: {
    title: 'Health Status at Registration',
    body: 'Record the general health of the animal at the time of this registration.',
    tip: 'Healthy — no signs of disease. Sick — currently ill or injured. Unknown — health state not confirmed.',
  },
  vaccinationStatus: {
    title: 'Vaccination Status',
    body: 'Indicate whether this animal has received any vaccinations. If vaccinated, a date and vaccine type section will appear.',
    tip: 'Keep vaccination records accurate — they are critical for disease traceability and export certification.',
  },
  lastVaccinationDate: {
    title: 'Last Vaccination Date',
    body: 'The most recent date that any vaccine was administered to this animal.',
    tip: 'Use the date on the vaccination certificate or record book. Cannot be a future date.',
  },
  vaccinationTypes: {
    title: 'Vaccines Administered',
    body: 'Select all vaccines that have been given to this animal. You can select multiple vaccines.',
    tip: 'FMD and PPR are priority vaccines in Somalia. Tick all that apply based on your vaccination records.',
  },
  dewormingStatus: {
    title: 'Deworming Status',
    body: 'Indicates whether the animal has been treated for internal parasites (worms).',
    tip: 'Deworming is especially important for young animals and those kept on shared pastures.',
  },
  veterinaryNotes: {
    title: 'Veterinary Notes',
    body: 'Any additional health observations, past illnesses, treatments, or conditions relevant to this animal.',
    tip: 'Include treatment name and date if known — e.g. "Treated for respiratory infection, March 2024".',
  },
  photos: {
    title: 'Animal Photos',
    body: 'Upload clear photos to help field officers identify the animal during verification. Photos are optional but strongly recommended.',
    tip: 'Take photos in natural daylight. Ensure the ear tag serial number is readable in the Ear Tag photo.',
  },
};

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  onBack?: () => void;
  onSuccess?: () => void;
  initialPremisesCode?: string;
  isModal?: boolean;
}

interface FarmerPremise {
  id: string;
  premisesCode: string;
  premisesName: string;
  premisesType: string;
  status: string;
  regionCode: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function RegisterAnimalPage({ onBack, onSuccess, initialPremisesCode, isModal }: Props): JSX.Element {
  const navigate = useNavigate();
  const handleBack    = onBack    ?? (() => navigate('/animals'));
  const handleSuccess = onSuccess ?? (() => navigate('/animals'));
  const { userId } = useAuthStore();

  const [form, setForm] = useState<RegistrationFormData>({ ...INITIAL, premisesId: initialPremisesCode ?? '' });
  const [userPremises, setUserPremises] = useState<FarmerPremise[]>([]);
  const [premisesLoaded, setPremisesLoaded] = useState(false);
  const [showNoPremisesWarning, setShowNoPremisesWarning] = useState(false);
  const [availableTagCount, setAvailableTagCount] = useState<number | null>(null);
  const [showNoTagsWarning, setShowNoTagsWarning] = useState(false);
  const [tagRanges, setTagRanges] = useState<{ start: number; end: number }[]>([]);
  const [tagRangesLoaded, setTagRangesLoaded] = useState(false);
  const [tagSerialStatus, setTagSerialStatus] = useState<'idle' | 'checking' | 'valid' | 'not-yours' | 'already-used'>('idle');
  const [tagSerialError, setTagSerialError] = useState<string | null>(null);

  // Photo previews
  const [primaryPreview, setPrimaryPreview] = useState<string | null>(null);
  const [rightPreview,   setRightPreview]   = useState<string | null>(null);
  const [frontPreview,   setFrontPreview]   = useState<string | null>(null);
  const [tagPreview,     setTagPreview]     = useState<string | null>(null);

  const [loading, setLoading]       = useState(false);
  const [error,   setError]         = useState<string | null>(null);
  const [done, setDone]             = useState<{ animalCode: string } | null>(null);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Batch management — loaded from Supabase per selected premises
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [showNewBatch, setShowNewBatch] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchCode, setNewBatchCode] = useState('');

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('farmer_premises')
      .select('id, premises_code, premises_name, premises_type, status, region_code')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        const list = (data ?? []).map((r: Record<string, string>) => ({
          id: r.id, premisesCode: r.premises_code, premisesName: r.premises_name,
          premisesType: r.premises_type, status: r.status, regionCode: r.region_code,
        }));
        setUserPremises(list);
        setPremisesLoaded(true);
        if (list.length === 0) { setShowNoPremisesWarning(true); return; }

        const premisesIds = list.map(p => p.id);
        const { data: inv } = await supabase
          .from('farmer_tag_inventory')
          .select('available')
          .in('premises_id', premisesIds);
        const total = (inv ?? []).reduce((sum, r) => sum + ((r.available as number) ?? 0), 0);
        setAvailableTagCount(total);
        if (total === 0) setShowNoTagsWarning(true);

        const { data: reqData } = await supabase
          .from('farmer_tag_requests')
          .select('quantity, notes')
          .in('status', ['WITH_FARMER', 'DELIVERED']);
        const TAGS_PER_BOX = 50;
        const ranges: { start: number; end: number }[] = [];
        for (const req of (reqData ?? []) as { quantity: number; notes?: string }[]) {
          const match = req.notes?.match(/TAG_SERIALS:([\d|]+)/);
          if (!match) continue;
          const numBoxes = Math.ceil(req.quantity / TAGS_PER_BOX);
          const firsts = match[1].split('|');
          for (let i = 0; i < numBoxes; i++) {
            const n = parseInt(firsts[i] ?? '');
            if (!n || n <= 0) break;
            const boxQty = i === numBoxes - 1 ? req.quantity - i * TAGS_PER_BOX : TAGS_PER_BOX;
            ranges.push({ start: n, end: n + boxQty - 1 });
          }
        }
        setTagRanges(ranges);
        setTagRangesLoaded(true);
      });
  }, [userId]);

  useEffect(() => {
    if (!form.premisesId) { setBatches([]); return; }
    setBatchesLoading(true);
    supabase
      .from('batches')
      .select('id, batch_code, batch_name, species, count, status')
      .eq('premises_code', form.premisesId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setBatches((data ?? []).map((r: Record<string, unknown>) => ({
          id:        String(r.id),
          batchCode: String(r.batch_code),
          batchName: String(r.batch_name),
          species:   String(r.species),
          count:     Number(r.count),
          status:    String(r.status),
        })));
        setBatchesLoading(false);
      });
  }, [form.premisesId]);

  const [batchCreating, setBatchCreating] = useState(false);

  async function createNewBatch() {
    if (!userId) return;
    setBatchCreating(true);

    const selectedPremise = userPremises.find(p => p.premisesCode === form.premisesId);
    const region = selectedPremise?.regionCode ?? 'NAT';

    const { data: generatedCode, error: idErr } = await supabase
      .rpc('generate_batch_id', { p_region_code: region });
    if (idErr || !generatedCode) {
      setBatchCreating(false);
      console.error('Batch ID generation failed:', idErr?.message);
      return;
    }
    const batchCode = generatedCode as string;

    const { data, error: bErr } = await supabase
      .from('batches')
      .insert({
        batch_code:    batchCode,
        batch_name:    newBatchName || batchCode,
        species:       form.species || 'CATTLE',
        breed:         form.breed || '',
        count:         0,
        status:        'DRAFT',
        premises_code: form.premisesId,
        owner_id:      userId,
        region,
      })
      .select('id, batch_code, batch_name, species, count, status')
      .single();

    setBatchCreating(false);

    if (bErr || !data) {
      console.error('Batch insert failed:', bErr?.message);
      return;
    }

    const nb: BatchOption = {
      id:        String(data.id),
      batchCode: String(data.batch_code),
      batchName: String(data.batch_name),
      species:   String(data.species),
      count:     0,
      status:    'DRAFT',
    };
    setBatches(prev => [...prev, nb]);
    set('batchId', nb.id);
    set('batchCode', nb.batchCode);
    setShowNewBatch(false);
    setNewBatchName('');
    setNewBatchCode('');
  }
  const focus = (field: string) => () => setFocusedField(field);
  const [showValidation, setShowValidation] = useState(false);
  const [navError, setNavError] = useState<string | null>(null);

  async function validateTagSerial(serial: string) {
    const trimmed = serial.trim();
    if (!trimmed) { setTagSerialStatus('idle'); setTagSerialError(null); return; }
    const numMatch = trimmed.match(/(\d+)$/);
    const n = numMatch ? parseInt(numMatch[1], 10) : NaN;

    if (tagRangesLoaded) {
      if (tagRanges.length === 0) {
        setTagSerialStatus('not-yours');
        setTagSerialError('You have no allocated tags. Request tags before registering animals.');
        return;
      }
      const inRange = tagRanges.some(r => n >= r.start && n <= r.end);
      if (!inRange) {
        setTagSerialStatus('not-yours');
        setTagSerialError('This serial is not in your allocated tags. Check your tag inventory.');
        return;
      }
    }

    setTagSerialStatus('checking');
    setTagSerialError(null);
    const { data } = await supabase
      .from('animals')
      .select('id')
      .eq('tag_serial', trimmed)
      .maybeSingle();
    if (data) {
      setTagSerialStatus('already-used');
      setTagSerialError('This serial is already assigned to another animal.');
    } else {
      setTagSerialStatus('valid');
      setTagSerialError(null);
    }
  }

  // Hidden file input refs
  const primaryInputRef = useRef<HTMLInputElement>(null);
  const rightInputRef   = useRef<HTMLInputElement>(null);
  const frontInputRef   = useRef<HTMLInputElement>(null);
  const tagInputRef     = useRef<HTMLInputElement>(null);

  // Section refs for scroll-to
  const sec1Ref = useRef<HTMLDivElement>(null);
  const sec2Ref = useRef<HTMLDivElement>(null);
  const sec3Ref = useRef<HTMLDivElement>(null);
  const sec5Ref = useRef<HTMLDivElement>(null);
  const sec7Ref = useRef<HTMLDivElement>(null);
  const sec8Ref = useRef<HTMLDivElement>(null);

  const secRefs = [sec1Ref, sec2Ref, sec3Ref, sec5Ref, sec7Ref, sec8Ref];

  const scrollTo = (i: number) => {
    secRefs[i]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ── Form helpers ─────────────────────────────────────────────────────────────

  const set = <K extends keyof RegistrationFormData>(k: K, v: RegistrationFormData[K]) =>
    setForm(f => ({ ...f, [k]: v, ...(k === 'species' ? { breed: '' } : {}) }));

  const toggleVaccineType = (type: string) =>
    setForm(f => ({
      ...f,
      vaccinationTypes: f.vaccinationTypes.includes(type)
        ? f.vaccinationTypes.filter(t => t !== type)
        : [...f.vaccinationTypes, type],
    }));

  // ── Photo helpers ─────────────────────────────────────────────────────────────

  const makePhotoReader = useCallback(
    (
      field: 'photoFile' | 'rightSidePhoto' | 'frontPhoto' | 'tagCloseupPhoto',
      setPreview: (url: string) => void,
    ) =>
      (file: File) => {
        setForm(f => ({ ...f, [field]: file }));
        const reader = new FileReader();
        reader.onload = e => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      },
    [],
  );

  const handlePrimaryPhoto = useCallback(
    makePhotoReader('photoFile', setPrimaryPreview),
    [makePhotoReader],
  );
  const handleRightPhoto = useCallback(
    makePhotoReader('rightSidePhoto', setRightPreview),
    [makePhotoReader],
  );
  const handleFrontPhoto = useCallback(
    makePhotoReader('frontPhoto', setFrontPreview),
    [makePhotoReader],
  );
  const handleTagPhoto = useCallback(
    makePhotoReader('tagCloseupPhoto', setTagPreview),
    [makePhotoReader],
  );

  const clearPhoto = (
    field: 'photoFile' | 'rightSidePhoto' | 'frontPhoto' | 'tagCloseupPhoto',
    setPreview: (url: string | null) => void,
    inputRef: React.RefObject<HTMLInputElement>,
  ) => {
    setForm(f => ({ ...f, [field]: null }));
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  // ── Submit ────────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    // Validate required fields first
    if (!form.submissionType || !form.species || !form.breed || !form.sex || !form.tagSerial || !form.premisesId) {
      setShowValidation(true);
      if (!form.submissionType)           { scrollTo(0); return; }
      if (!form.species || !form.breed)   { scrollTo(1); return; }
      if (!form.sex)                      { scrollTo(2); return; }
      if (!form.tagSerial || !form.premisesId) { scrollTo(3); return; }
      return;
    }
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      // ── Hard tag serial check before any DB write ──────────────────────────
      const serial = form.tagSerial.trim();
      const numMatch = serial.match(/(\d+)$/);
      const serialNum = numMatch ? parseInt(numMatch[1], 10) : NaN;

      const { data: reqRows } = await supabase
        .from('farmer_tag_requests')
        .select('quantity, notes')
        .in('status', ['WITH_FARMER', 'DELIVERED']);
      const TAGS_PER_BOX = 50;
      const allRanges: { start: number; end: number }[] = [];
      for (const req of (reqRows ?? []) as { quantity: number; notes?: string }[]) {
        const match = req.notes?.match(/TAG_SERIALS:([\d|]+)/);
        if (!match) continue;
        const numBoxes = Math.ceil(req.quantity / TAGS_PER_BOX);
        const firsts = match[1].split('|');
        for (let i = 0; i < numBoxes; i++) {
          const n = parseInt(firsts[i] ?? '');
          if (!n || n <= 0) break;
          const boxQty = i === numBoxes - 1 ? req.quantity - i * TAGS_PER_BOX : TAGS_PER_BOX;
          allRanges.push({ start: n, end: n + boxQty - 1 });
        }
      }

      if (allRanges.length === 0 || !allRanges.some(r => serialNum >= r.start && serialNum <= r.end)) {
        setTagSerialStatus('not-yours');
        setTagSerialError(
          allRanges.length === 0
            ? 'You have no allocated tags. Request tags before registering animals.'
            : 'This serial is not in your allocated tags. Check your tag inventory.',
        );
        scrollTo(3);
        setLoading(false);
        return;
      }

      const { data: existingAnimal } = await supabase
        .from('animals')
        .select('id')
        .eq('tag_serial', serial)
        .maybeSingle();
      if (existingAnimal) {
        setTagSerialStatus('already-used');
        setTagSerialError('This serial is already assigned to another animal.');
        scrollTo(3);
        setLoading(false);
        return;
      }
      // ── Tag verified — proceed to registration ─────────────────────────────

      const result = await submitRegistration(form, userId);
      const { animalId } = result;

      const photoUploads: Array<{ file: File; caption: string }> = [];
      if (form.photoFile)       photoUploads.push({ file: form.photoFile,       caption: 'Left side'  });
      if (form.rightSidePhoto)  photoUploads.push({ file: form.rightSidePhoto,  caption: 'Right side' });
      if (form.frontPhoto)      photoUploads.push({ file: form.frontPhoto,       caption: 'Front face' });
      if (form.tagCloseupPhoto) photoUploads.push({ file: form.tagCloseupPhoto, caption: 'Ear tag'    });

      for (const { file, caption } of photoUploads) {
        try {
          const urlRes = await requestPhotoUploadUrl(animalId, file);
          await uploadPhotoToBlob(urlRes.uploadUrl, file);
          await confirmPhotoUpload(animalId, urlRes.photoId, file, caption);
        } catch {
          // Photo upload failure is non-blocking — registration succeeded
        }
      }

      setDone({ animalCode: result.animalCode });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Sidebar completion checks ─────────────────────────────────────────────────

  const sec1Done = !!form.submissionType;
  const sec2Done = !!form.species && !!form.breed;
  const sec3Done = !!form.sex;
  const sec4Optional = !form.submissionType || form.submissionType === 'BIRTH';
  const sec4Done = form.submissionType === 'IMPORT'
    ? !!form.countryOfOrigin && !!form.importPermitNumber
    : form.submissionType === 'PURCHASE'
    ? !!form.sourceOwnerName
    : false;
  const sec5Done = !!form.tagSerial && !!form.premisesId;

  const submitDisabled = !termsAgreed || loading;

  // Section lock logic — each section requires the previous to be complete
  const sec2Locked = !sec1Done;
  const sec3Locked = !sec2Done;
  const sec5Locked = !sec3Done;

  const navTo = (idx: number, locked: boolean, msg: string) => {
    if (locked) { setNavError(msg); return; }
    setNavError(null);
    scrollTo(idx);
  };

  // ── Done screen ───────────────────────────────────────────────────────────────

  if (done) {
    return (
      <div className={s.formPage}>
        <div className={s.doneWrap}>
          <CheckCircle size={64} strokeWidth={1.25} color="#16a34a" />
          <div className={s.doneTitle}>Registration Submitted!</div>
          <div className={s.doneSub}>
            Your animal has been submitted for verification by a field officer.
          </div>
          <div className={s.codePills}>
            <div className={s.codePill}>
              <span className={s.codeLabel}>Animal Code</span>
              <span className={s.codeVal}>{done.animalCode}</span>
            </div>
          </div>
          <button className={s.doneBtn} onClick={handleSuccess}>
            View My Animals
          </button>
        </div>
      </div>
    );
  }

  // ── Derived display values ────────────────────────────────────────────────────

  const speciesCfg = form.species ? SPECIES_CONFIG[form.species] : null;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className={s.formPage} style={isModal ? { padding: '8px 0 0' } : undefined}>

      {/* ── No-tags warning modal ── */}
      {availableTagCount === 0 && showNoTagsWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,26,60,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, padding: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,.3)', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: '0.75rem' }}>🏷️</div>
            <div style={{ fontWeight: 700, fontSize: '1.0625rem', color: '#0f172a', marginBottom: '0.5rem' }}>No Tags Available</div>
            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
              You have no available ear tags or RFID tags to assign. Request tags from the livestock authority before registering animals.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowNoTagsWarning(false)}
                style={{ padding: '0.625rem 1.25rem', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', color: '#64748b' }}
              >
                Continue Anyway
              </button>
              <button
                type="button"
                onClick={() => navigate('/tags')}
                style={{ padding: '0.625rem 1.5rem', borderRadius: 8, border: 'none', background: '#0f2170', color: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Request Tags →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── No-farms warning modal ── */}
      {premisesLoaded && showNoPremisesWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,26,60,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, padding: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,.3)', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: '0.75rem' }}>🏡</div>
            <div style={{ fontWeight: 700, fontSize: '1.0625rem', color: '#0f172a', marginBottom: '0.5rem' }}>No Farm Registered Yet</div>
            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
              You need to register a farm (premises) before you can register animals or create batches. Your animals must be linked to a farm location.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowNoPremisesWarning(false)}
                style={{ padding: '0.625rem 1.25rem', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', color: '#64748b' }}
              >
                Continue Anyway
              </button>
              <button
                type="button"
                onClick={() => navigate('/premises')}
                style={{ padding: '0.625rem 1.5rem', borderRadius: 8, border: 'none', background: '#0f2170', color: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Register a Farm →
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={s.formLayout} style={isModal ? { gridTemplateColumns: '1fr', gap: 0 } : undefined}>

        {/* ── Sidebar ── */}
        <aside className={s.sidebar} style={isModal ? { display: 'none' } : undefined}>
          <div className={s.sideInner}>

            {/* Brand */}
            <div className={s.sideBrand}>
              <div className={s.sideMark}>SL</div>
              <div>
                <div className={s.sideName}>QXLITS</div>
                <div className={s.sideSub}>Animal Registration</div>
              </div>
            </div>

            {/* Section navigation */}
            <div className={s.sideBlock}>
              <div className={s.sideBlockTitle}>Sections</div>
              <nav className={s.sideNav}>

                {/* 1 — always accessible */}
                <button
                  type="button"
                  className={`${s.sideNavBtn}${sec1Done ? ' ' + s.sideNavBtnDone : ''}`}
                  onClick={() => scrollTo(0)}
                >
                  <div className={sec1Done ? s.sideNavNumDone : s.sideNavNum}>
                    {sec1Done ? '✓' : '1'}
                  </div>
                  Registration Type
                  {sec1Done && <span className={s.sideNavCheck}>✓</span>}
                </button>

                {/* 2 — locked until sec1Done */}
                <button
                  type="button"
                  className={`${s.sideNavBtn}${sec2Locked ? ' ' + s.sideNavBtnLocked : sec2Done ? ' ' + s.sideNavBtnDone : ''}`}
                  onClick={() => navTo(1, sec2Locked, 'Select a Registration Type in Section 1 first')}
                >
                  <div className={sec2Locked ? s.sideNavNumLocked : sec2Done ? s.sideNavNumDone : s.sideNavNum}>
                    {sec2Done ? '✓' : '2'}
                  </div>
                  Species &amp; Breed
                  {sec2Locked
                    ? <span className={s.sideNavLock}>🔒</span>
                    : sec2Done && <span className={s.sideNavCheck}>✓</span>}
                </button>

                {/* 3 — locked until sec2Done */}
                <button
                  type="button"
                  className={`${s.sideNavBtn}${sec3Locked ? ' ' + s.sideNavBtnLocked : sec3Done ? ' ' + s.sideNavBtnDone : ''}`}
                  onClick={() => navTo(2, sec3Locked, 'Select Species & Breed in Section 2 first')}
                >
                  <div className={sec3Locked ? s.sideNavNumLocked : sec3Done ? s.sideNavNumDone : s.sideNavNum}>
                    {sec3Done ? '✓' : '3'}
                  </div>
                  Physical Details
                  {sec3Locked
                    ? <span className={s.sideNavLock}>🔒</span>
                    : sec3Done && <span className={s.sideNavCheck}>✓</span>}
                </button>

                {/* 4 — locked until sec3Done */}
                <button
                  type="button"
                  className={`${s.sideNavBtn}${sec5Locked ? ' ' + s.sideNavBtnLocked : sec5Done ? ' ' + s.sideNavBtnDone : ''}`}
                  onClick={() => navTo(3, sec5Locked, 'Fill in Physical Details (Sex) in Section 3 first')}
                >
                  <div className={sec5Locked ? s.sideNavNumLocked : sec5Done ? s.sideNavNumDone : s.sideNavNum}>
                    {sec5Done ? '✓' : '4'}
                  </div>
                  Tag &amp; Location
                  {sec5Locked
                    ? <span className={s.sideNavLock}>🔒</span>
                    : sec5Done && <span className={s.sideNavCheck}>✓</span>}
                </button>

                {/* 5 — always accessible, always Optional */}
                <button
                  type="button"
                  className={s.sideNavBtn}
                  onClick={() => scrollTo(4)}
                >
                  <div className={s.sideNavNum}>5</div>
                  Photos
                  <span className={s.sideNavOptional}>Optional</span>
                </button>

                {/* 6 — always accessible */}
                <button
                  type="button"
                  className={s.sideNavBtn}
                  onClick={() => scrollTo(5)}
                >
                  <div className={s.sideNavNum}>6</div>
                  Review &amp; Submit
                </button>

              </nav>

              {navError && (
                <div className={s.navError}>{navError}</div>
              )}

            </div>

            {/* What happens next */}
            <div className={s.sideBlock}>
              <div className={s.sideBlockTitle}>What Happens Next</div>
              <ul className={s.stepsList}>
                <li>
                  <div className={s.stepsNum}>1</div>
                  <div>
                    <strong>Submit Application</strong>
                    <span>Your registration is sent to the livestock authority.</span>
                  </div>
                </li>
                <li>
                  <div className={s.stepsNum}>2</div>
                  <div>
                    <strong>Field Verification</strong>
                    <span>A field officer visits to verify the animal and tag.</span>
                  </div>
                </li>
                <li>
                  <div className={s.stepsNum}>3</div>
                  <div>
                    <strong>Official Code Issued</strong>
                    <span>Your animal receives an official national code.</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Help note */}
            <div className={s.sideHelp}>
              <span className={s.sideHelpIcon}>ℹ️</span>
              <span>
                All registered animals are subject to field verification. Ensure
                tag serial matches the physical ear tag.
              </span>
            </div>

            {/* Actions */}
            <div className={s.sideActions}>
              <button type="button" className={s.backBtn} onClick={handleBack}>
                ← Back to Animals
              </button>
            </div>

          </div>
        </aside>

        {/* ── Main content ── */}
        <main className={s.formMain}>

          {/* ── Section 1: Registration Type ── */}
          <div ref={sec1Ref} className={s.sec}>
            <div className={s.secHead}>
              <div className={s.secBadge}>01</div>
              <div className={s.secTitle}>Registration Type</div>
            </div>
            <p className={s.secSub}>Select how you acquired this animal.</p>

            {showValidation && !sec1Done && (
              <div className={s.validationBanner}>
                <span>⚠️</span>
                <span>Please select a Registration Type to continue.</span>
              </div>
            )}

            <div className={s.typeGrid}>
              <TypeCard
                active={form.submissionType === 'BIRTH'}
                icon={<Baby size={22} strokeWidth={1.5} />}
                name="Birth Registration"
                desc="Animal was born on your farm or holding"
                onClick={() => { set('submissionType', 'BIRTH'); setFocusedField('submissionType'); }}
              />
              <TypeCard
                active={form.submissionType === 'PURCHASE'}
                icon={<ShoppingBag size={22} strokeWidth={1.5} />}
                name="Purchased Animal"
                desc="Bought from another owner or market"
                onClick={() => { set('submissionType', 'PURCHASE'); setFocusedField('submissionType'); }}
              />
              <TypeCard
                active={form.submissionType === 'IMPORT'}
                icon={<Globe size={22} strokeWidth={1.5} />}
                name="Imported Animal"
                desc="Brought from another country with official permits"
                onClick={() => { set('submissionType', 'IMPORT'); setFocusedField('submissionType'); }}
              />
            </div>
          </div>

          {/* ── Section 2: Species & Breed ── */}
          <div ref={sec2Ref} className={s.sec}>
            <div className={s.secHead}>
              <div className={s.secBadge}>02</div>
              <div className={s.secTitle}>Species &amp; Breed</div>
            </div>
            <p className={s.secSub}>Select the species, then choose the specific breed.</p>

            {showValidation && !sec2Done && (
              <div className={s.validationBanner}>
                <span>⚠️</span>
                <span>{!form.species ? 'Please select a species.' : 'Please select a breed.'}</span>
              </div>
            )}

            <div className={s.speciesGrid}>
              {(Object.keys(SPECIES_CONFIG) as Species[]).map(sp => {
                const cfg = SPECIES_CONFIG[sp];
                return (
                  <button
                    key={sp}
                    type="button"
                    className={`${s.speciesCard}${form.species === sp ? ' ' + s.speciesCardActive : ''}`}
                    style={{ background: form.species === sp ? '#eff6ff' : '#fff' }}
                    onClick={() => { set('species', sp); setFocusedField('species'); }}
                  >
                    <span className={s.speciesEmoji}>{cfg.emoji}</span>
                    <span className={s.speciesName}>{cfg.name}</span>
                    <span className={s.speciesSub}>{cfg.sub}</span>
                  </button>
                );
              })}
            </div>

            {form.species && (
              <>
                <div className={s.lbl} style={{ marginBottom: 8 }}>Select breed</div>
                <div className={s.breedGrid}>
                  {(BREEDS[form.species] ?? []).map(b => (
                    <button
                      key={b}
                      type="button"
                      className={`${s.breedChip}${form.breed === b ? ' ' + s.breedChipActive : ''}`}
                      onClick={() => { set('breed', b); setFocusedField('breed'); }}
                    >
                      {BREED_LABELS[b] ?? b}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── Section 3: Physical Details ── */}
          <div ref={sec3Ref} className={s.sec}>
            <div className={s.secHead}>
              <div className={s.secBadge}>03</div>
              <div className={s.secTitle}>Physical Details</div>
            </div>
            <p className={s.secSub}>Enter the animal's physical characteristics.</p>

            {/* Info hint */}
            <div className={s.infoBox}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>📋</span>
              <div>
                <strong style={{ display: 'block', marginBottom: 6 }}>How to fill in this section</strong>
                <span>Select or enter each characteristic. Skip what you do not know.</span>
                <ul style={{ margin: '8px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li><strong>Sex</strong> — tap Male, Female or Unknown</li>
                  <li><strong>Date of Birth</strong> — pick exact date, or enter age in months (e.g. 18 months)</li>
                  <li><strong>Weight</strong> — live weight in kg (e.g. 180 kg young cow, 350 kg adult cattle)</li>
                  <li><strong>Body Condition Score</strong> — 1 = very thin, 3 = normal, 5 = fat</li>
                  <li><strong>Coat Color</strong> — tap the circle that best matches the main colour</li>
                  <li><strong>Distinguishing Marks</strong> — scars, brands, notches, or unusual features</li>
                </ul>
              </div>
            </div>

            {showValidation && !form.sex && (
              <div className={s.validationBanner}>
                <span>⚠️</span>
                <span>Please select the animal's sex to continue.</span>
              </div>
            )}

            {/* Sex */}
            <div className={s.f}>
              <label className={s.lbl}>Sex <span className={s.req}>*</span></label>
              <div className={s.sexRow}>
                {(['MALE', 'FEMALE', 'UNKNOWN'] as const).map(sx => (
                  <button
                    key={sx}
                    type="button"
                    className={`${s.sexBtn}${form.sex === sx ? ' ' + s.sexBtnActive : ''}`}
                    onClick={() => { set('sex', sx); setFocusedField('sex'); }}
                  >
                    {sx === 'MALE' ? '♂ Male' : sx === 'FEMALE' ? '♀ Female' : '? Unknown'}
                  </button>
                ))}
              </div>
            </div>

            {/* DOB row */}
            <div className={s.grid2}>
              <div className={s.f}>
                <label className={s.lbl}>Date of Birth</label>
                <input
                  className={s.inp}
                  type="date"
                  value={form.dob}
                  max={new Date().toISOString().slice(0, 10)}
                  onFocus={focus('dob')}
                  onChange={e => set('dob', e.target.value)}
                />
              </div>
              <div className={s.f}>
                {form.dob ? (
                  <>
                    <label className={s.lbl}>DOB Precision</label>
                    <select
                      className={s.sel}
                      value={form.dobPrecision}
                      onFocus={focus('dobPrecision')}
                      onChange={e => set('dobPrecision', e.target.value as 'EXACT' | 'ESTIMATED' | 'UNKNOWN')}
                    >
                      <option value="EXACT">Exact date</option>
                      <option value="ESTIMATED">Estimated</option>
                      <option value="UNKNOWN">Unknown</option>
                    </select>
                  </>
                ) : (
                  <>
                    <label className={s.lbl}>Estimated Age (months)</label>
                    <input
                      className={s.inp}
                      type="number"
                      min="0"
                      value={form.ageMonths}
                      onFocus={focus('ageMonths')}
                      onChange={e => set('ageMonths', e.target.value)}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Weight + BCS */}
            <div className={s.grid2}>
              <div className={s.f}>
                <label className={s.lbl}>Live Weight (kg)</label>
                <input
                  className={s.inp}
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.weightKg}
                  onFocus={focus('weightKg')}
                  onChange={e => set('weightKg', e.target.value)}
                />
              </div>
              <div className={s.f}>
                <label className={s.lbl}>Body Condition Score</label>
                <div className={s.bcsRow}>
                  {BCS.map(b => (
                    <button
                      key={b.score}
                      type="button"
                      className={`${s.bcsBtn}${form.bodyConditionScore === b.score ? ' ' + s.bcsBtnActive : ''}`}
                      title={`${b.label} — ${b.desc}`}
                      onClick={() => { set('bodyConditionScore', b.score); setFocusedField('bodyConditionScore'); }}
                    >
                      {b.score}
                      <span className={s.bcsLabel}>{b.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Coat color */}
            <div className={s.f}>
              <label className={s.lbl}>Coat Color</label>
              <div className={s.colorGrid}>
                {COAT_COLORS.map(c => (
                  <div key={c.label} className={s.colorItem}>
                    <button
                      type="button"
                      className={`${s.colorSwatch}${form.coatColor === c.label ? ' ' + s.colorSwatchActive : ''}`}
                      style={
                        c.label === 'Piebald'
                          ? { background: 'linear-gradient(135deg, #1a1a1a 50%, #efefef 50%)', border: '3px solid transparent' }
                          : { background: c.hex, border: '3px solid transparent' }
                      }
                      title={c.label}
                      onClick={() => { set('coatColor', c.label); setFocusedField('coatColor'); }}
                    />
                    <span className={s.colorLabel}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Coat pattern */}
            <div className={s.f}>
              <label className={s.lbl}>Coat Pattern</label>
              <div className={s.hornRow}>
                {['SOLID', 'SPOTTED', 'PIEBALD', 'STRIPED'].map(p => (
                  <button
                    key={p}
                    type="button"
                    className={`${s.hornBtn}${form.coatPattern === p ? ' ' + s.hornBtnActive : ''}`}
                    onClick={() => { set('coatPattern', p); setFocusedField('coatPattern'); }}
                  >
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Horn status */}
            <div className={s.f}>
              <label className={s.lbl}>Horn Status</label>
              <div className={s.hornRow}>
                {[
                  { val: 'HORNED',   label: '🦌 Horned'   },
                  { val: 'POLLED',   label: 'Polled'       },
                  { val: 'DEHORNED', label: 'Dehorned'     },
                  { val: 'NA',       label: 'N/A'          },
                ].map(h => (
                  <button
                    key={h.val}
                    type="button"
                    className={`${s.hornBtn}${form.hornStatus === h.val ? ' ' + s.hornBtnActive : ''}`}
                    onClick={() => { set('hornStatus', h.val); setFocusedField('hornStatus'); }}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Distinguishing marks */}
            <div className={s.f}>
              <label className={s.lbl}>Distinguishing Marks</label>
              <span className={s.hint}>Any scar, brand, notch, or unusual feature that helps identify this specific animal</span>
              <textarea
                className={s.textarea}
                value={form.distinguishingMarks}
                onFocus={focus('distinguishingMarks')}
                onChange={e => set('distinguishingMarks', e.target.value)}
              />
            </div>
          </div>

          {/* ── Section 4: Tag & Location ── */}
          <div ref={sec5Ref} className={s.sec}>
            <div className={s.secHead}>
              <div className={s.secBadge}>04</div>
              <div className={s.secTitle}>Tag &amp; Location</div>
            </div>
            <p className={s.secSub}>Enter the official ear tag or RFID details and your premises.</p>

            <div className={s.infoBox}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>🏷️</span>
              <span>The tag serial must match the officially issued ear tag or RFID transponder assigned by the livestock authority.</span>
            </div>

            {showValidation && (!form.tagSerial || !form.premisesId) && (
              <div className={s.validationBanner}>
                <span>⚠️</span>
                <span>
                  {!form.tagSerial && !form.premisesId
                    ? 'Tag Serial Number and Premises ID are both required.'
                    : !form.tagSerial
                    ? 'Tag Serial Number is required.'
                    : 'Premises ID is required.'}
                </span>
              </div>
            )}

            {/* Tag serial */}
            <div className={s.f}>
              <label className={s.lbl}>Tag Serial Number <span className={s.req}>*</span></label>
              <input
                className={`${s.inp} ${s.mono}`}
                style={tagSerialStatus === 'valid' ? { borderColor: '#16a34a' } : tagSerialError ? { borderColor: '#ef4444' } : undefined}
                value={form.tagSerial}
                onFocus={focus('tagSerial')}
                onChange={e => { set('tagSerial', e.target.value); setTagSerialStatus('idle'); setTagSerialError(null); }}
                onBlur={e => void validateTagSerial(e.target.value)}
              />
              {tagSerialStatus === 'checking' && (
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> Checking…
                </div>
              )}
              {tagSerialStatus === 'valid' && (
                <div style={{ fontSize: '0.78rem', color: '#16a34a', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={12} /> Tag confirmed — available in your inventory.
                </div>
              )}
              {tagSerialError && (
                <div style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={12} /> {tagSerialError}
                </div>
              )}
            </div>

            {/* Tag type — locked to RFID */}
            <div className={s.f}>
              <label className={s.lbl}>Tag Type</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, width: 'fit-content' }}>
                <span style={{ fontSize: 18 }}>📡</span>
                <span style={{ fontWeight: 700, color: '#1d4ed8', fontSize: '0.9rem' }}>RFID</span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 4 }}>Official tag type</span>
              </div>
            </div>

            {/* Tag color */}
            <div className={s.f}>
              <label className={s.lbl}>Tag Color</label>
              <div className={s.tagColorRow}>
                {TAG_COLORS.map(c => (
                  <button
                    key={c.label}
                    type="button"
                    title={c.label}
                    className={`${s.colorSwatch}${form.tagColor === c.label ? ' ' + s.colorSwatchActive : ''}`}
                    style={{ background: c.hex, border: '3px solid transparent', width: 32, height: 32 }}
                    onClick={() => { set('tagColor', c.label); setFocusedField('tagColor'); }}
                  />
                ))}
              </div>
            </div>

            {/* Premises — card selector */}
            <div className={s.f} onClick={() => setFocusedField('premisesId')}>
              <label className={s.lbl}>Premises <span className={s.req}>*</span></label>
              {userPremises.length === 0 ? (
                <div style={{ padding: '12px 16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 10, fontSize: 13, color: '#64748b' }}>
                  No approved premises found. <button type="button" style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }} onClick={() => navigate('/premises')}>Register a farm first →</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {userPremises.map(p => {
                    const selected = form.premisesId === p.premisesCode;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { set('premisesId', p.premisesCode); setFocusedField('premisesId'); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                          border: selected ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                          background: selected ? '#eff6ff' : '#fff',
                          transition: 'all 0.15s',
                          fontFamily: 'inherit', fontSize: 'inherit',
                        }}
                      >
                        <div style={{ width: 38, height: 38, borderRadius: 9, background: selected ? '#dbeafe' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Building2 size={20} color={selected ? '#2563eb' : '#64748b'} strokeWidth={1.5} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: selected ? '#1d4ed8' : '#0f172a' }}>{p.premisesName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2, display: 'flex', gap: 8 }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: selected ? '#2563eb' : '#475569' }}>{p.premisesCode}</span>
                            <span>·</span>
                            <span>{p.premisesType.replace(/_/g, ' ')}</span>
                            <span>·</span>
                            <MapPin size={11} style={{ alignSelf: 'center' }} />
                            <span>{p.regionCode}</span>
                          </div>
                        </div>
                        {selected && <ChevronRight size={16} color="#2563eb" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Batch selector */}
            <div className={s.f} onFocus={focus('batchCode')}>
              <label className={s.lbl}>
                Batch <span className={s.opt}>(optional)</span>
              </label>
              <div className={s.batchSelector}>

                {/* Real batches for selected premises */}
                {batchesLoading && (
                  <div style={{ padding: '10px 14px', fontSize: 13, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Loader size={14} strokeWidth={2} className={s.spin} /> Loading batches…
                  </div>
                )}
                {!batchesLoading && batches.filter(b => ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED'].includes(b.status)).map((b, idx) => (
                  <button
                    key={b.id}
                    type="button"
                    className={`${s.batchOption}${form.batchId === b.id ? ' ' + s.batchOptionSelected : ''}`}
                    onClick={() => { set('batchId', b.id); set('batchCode', b.batchCode); setShowNewBatch(false); }}
                  >
                    <div className={s.batchOptionEmoji}>{BATCH_EMOJI[b.species] ?? '🐾'}</div>
                    <div className={s.batchOptionBody}>
                      <div className={s.batchOptionSerial}>BATCH {idx + 1}</div>
                      <div className={s.batchOptionName}>{b.batchName}</div>
                      <div className={s.batchOptionSub}>{b.species} · {b.count} animal{b.count !== 1 ? 's' : ''} · <span style={{ fontFamily: 'monospace' }}>{b.batchCode}</span></div>
                    </div>
                  </button>
                ))}

                {/* Create new batch toggle — only available when a premises exists */}
                {userPremises.length > 0 && <button
                  type="button"
                  className={`${s.batchOption} ${s.batchOptionNew}${showNewBatch ? ' ' + s.batchOptionSelected : ''}`}
                  onClick={() => { setShowNewBatch(v => !v); set('batchId', ''); set('batchCode', ''); }}
                >
                  <div className={s.batchOptionEmoji} style={{ color: '#0f2170' }}>
                    <Plus size={22} strokeWidth={2} />
                  </div>
                  <div className={s.batchOptionBody}>
                    <div className={s.batchOptionName} style={{ color: '#0f2170' }}>Create New Batch</div>
                    <div className={s.batchOptionSub}>Start a new group — auto-generate batch number</div>
                  </div>
                </button>}

                {/* Inline new-batch form */}
                {showNewBatch && (
                  <div className={s.newBatchForm}>
                    <div className={s.newBatchRow}>
                      <div className={s.f} style={{ flex: 1 }}>
                        <label className={s.lbl}>Batch Name</label>
                        <input
                          className={s.inp}
                          value={newBatchName}
                          onChange={e => setNewBatchName(e.target.value)}
                          placeholder="Optional — leave blank to use the generated ID"
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button
                        type="button"
                        className={s.createBatchBtn}
                        disabled={batchCreating}
                        onClick={() => { void createNewBatch(); }}
                      >
                        <Plus size={14} strokeWidth={2} /> {batchCreating ? 'Creating…' : 'Create & Select Batch'}
                      </button>
                      <button
                        type="button"
                        className={s.cancelBatchBtn}
                        onClick={() => { setShowNewBatch(false); setNewBatchName(''); setNewBatchCode(''); }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

              </div>
              {form.batchCode && (
                <span className={s.hint} style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  Selected batch: <strong>{form.batchCode}</strong>
                </span>
              )}
            </div>
          </div>

          {/* ── Section 5: Photos ── */}
          <div ref={sec7Ref} className={s.sec}>
            <div className={s.secHead}>
              <div className={s.secBadge}>05</div>
              <div className={s.secTitle}>Photos</div>
              <span className={s.secDoneLabel} style={{ color: '#9ca3af', background: '#f3f4f6' }}>
                Optional
              </span>
            </div>
            <p className={s.secSub}>Upload photos to help with animal identification during field verification.</p>

            <div className={s.infoBox}>
              <Camera size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>Photos are optional but strongly recommended. Clear photos help with identification and speed up verification.</span>
            </div>

            <div className={s.photoGrid} onClick={() => setFocusedField('photos')}>
              <PhotoSlot
                label="Left Side"
                preview={primaryPreview}
                required
                inputRef={primaryInputRef}
                onFile={handlePrimaryPhoto}
                onRemove={() => clearPhoto('photoFile', setPrimaryPreview, primaryInputRef)}
              />
              <PhotoSlot
                label="Right Side"
                preview={rightPreview}
                inputRef={rightInputRef}
                onFile={handleRightPhoto}
                onRemove={() => clearPhoto('rightSidePhoto', setRightPreview, rightInputRef)}
              />
              <PhotoSlot
                label="Front Face"
                preview={frontPreview}
                inputRef={frontInputRef}
                onFile={handleFrontPhoto}
                onRemove={() => clearPhoto('frontPhoto', setFrontPreview, frontInputRef)}
              />
              <PhotoSlot
                label="Ear Tag"
                preview={tagPreview}
                inputRef={tagInputRef}
                onFile={handleTagPhoto}
                onRemove={() => clearPhoto('tagCloseupPhoto', setTagPreview, tagInputRef)}
              />
            </div>

            <div className={s.photoTips}>
              <div className={s.photoTipsTitle}>Photo tips</div>
              <ul className={s.photoTipsList}>
                <li>Use natural daylight when possible — avoid harsh flash</li>
                <li>Left Side: capture the full body in frame</li>
                <li>Ear Tag: ensure the serial number is readable</li>
                <li>Keep the animal calm and standing naturally</li>
              </ul>
            </div>
          </div>

          {/* ── Section 6: Review & Submit ── */}
          <div ref={sec8Ref} className={s.sec}>
            <div className={s.secHead}>
              <div className={s.secBadge} style={{ background: '#0b5ed7' }}>06</div>
              <div className={s.secTitle}>Review &amp; Submit</div>
            </div>
            <p className={s.secSub}>
              Check all details before submitting. You cannot edit the registration after submission.
            </p>

            <div className={s.reviewCard}>

              {/* Animal header */}
              <div className={s.reviewAnimalHeader}>
                {speciesCfg && (
                  <div className={s.reviewAnimalEmoji} style={{ background: speciesCfg.bg }}>
                    {speciesCfg.emoji}
                  </div>
                )}
                <div>
                  <div className={s.reviewAnimalName}>
                    {speciesCfg?.name ?? '—'} — {(BREED_LABELS[form.breed] ?? form.breed) || '—'}
                  </div>
                  <div className={s.reviewAnimalSub}>
                    {form.sex || 'Unknown sex'}
                    {form.dob ? ` · Born ${form.dob}` : form.ageMonths ? ` · ~${form.ageMonths} months` : ''}
                  </div>
                </div>
              </div>

              {/* Registration */}
              <div className={s.reviewSection}>
                <div className={s.reviewSectionTitle}>Registration</div>
                <div className={s.reviewRow}>
                  <span className={s.reviewLabel}>Type</span>
                  <span className={s.reviewValue}>{form.submissionType}</span>
                </div>
                <div className={s.reviewRow}>
                  <span className={s.reviewLabel}>Date</span>
                  <span className={s.reviewValue}>{new Date().toLocaleDateString()}</span>
                </div>
              </div>

              {/* Physical */}
              <div className={s.reviewSection}>
                <div className={s.reviewSectionTitle}>Physical</div>
                <div className={s.reviewGrid}>
                  <div className={s.reviewRow}>
                    <span className={s.reviewLabel}>Weight</span>
                    <span className={s.reviewValue}>{form.weightKg ? `${form.weightKg} kg` : '—'}</span>
                  </div>
                  <div className={s.reviewRow}>
                    <span className={s.reviewLabel}>BCS</span>
                    <span className={s.reviewValue}>{form.bodyConditionScore || '—'}</span>
                  </div>
                  <div className={s.reviewRow}>
                    <span className={s.reviewLabel}>Coat Color</span>
                    <span className={s.reviewValue}>{form.coatColor || '—'}</span>
                  </div>
                  <div className={s.reviewRow}>
                    <span className={s.reviewLabel}>Pattern</span>
                    <span className={s.reviewValue}>{form.coatPattern || '—'}</span>
                  </div>
                  <div className={s.reviewRow}>
                    <span className={s.reviewLabel}>Horns</span>
                    <span className={s.reviewValue}>{form.hornStatus || '—'}</span>
                  </div>
                  <div className={s.reviewRow}>
                    <span className={s.reviewLabel}>Marks</span>
                    <span className={s.reviewValue}>{form.distinguishingMarks || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Tag & Location */}
              <div className={s.reviewSection}>
                <div className={s.reviewSectionTitle}>Tag &amp; Location</div>
                <div className={s.reviewGrid}>
                  <div className={s.reviewRow}>
                    <span className={s.reviewLabel}>Tag Serial</span>
                    <span className={s.reviewValue}>{form.tagSerial || '—'}</span>
                  </div>
                  <div className={s.reviewRow}>
                    <span className={s.reviewLabel}>Tag Type</span>
                    <span className={s.reviewValue}>📡 RFID</span>
                  </div>
                  <div className={s.reviewRow}>
                    <span className={s.reviewLabel}>Tag Color</span>
                    <span className={s.reviewValue}>{form.tagColor || '—'}</span>
                  </div>
                  <div className={s.reviewRow}>
                    <span className={s.reviewLabel}>Premises ID</span>
                    <span className={s.reviewValue}>{form.premisesId || '—'}</span>
                  </div>
                  {form.batchCode && (
                    <div className={s.reviewRow}>
                      <span className={s.reviewLabel}>Batch Code</span>
                      <span className={s.reviewValue}>{form.batchCode}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Photos */}
              <div className={s.reviewSection}>
                <div className={s.reviewSectionTitle}>Photos</div>
                <div className={s.reviewPhotos}>
                  {primaryPreview && (
                    <div>
                      <img src={primaryPreview} alt="Left side" className={s.reviewPhotoThumb} />
                      <div className={s.reviewPhotoLabel}>Left Side</div>
                    </div>
                  )}
                  {rightPreview && (
                    <div>
                      <img src={rightPreview} alt="Right side" className={s.reviewPhotoThumb} />
                      <div className={s.reviewPhotoLabel}>Right Side</div>
                    </div>
                  )}
                  {frontPreview && (
                    <div>
                      <img src={frontPreview} alt="Front face" className={s.reviewPhotoThumb} />
                      <div className={s.reviewPhotoLabel}>Front Face</div>
                    </div>
                  )}
                  {tagPreview && (
                    <div>
                      <img src={tagPreview} alt="Ear tag" className={s.reviewPhotoThumb} />
                      <div className={s.reviewPhotoLabel}>Ear Tag</div>
                    </div>
                  )}
                  {!primaryPreview && !rightPreview && !frontPreview && !tagPreview && (
                    <span style={{ fontSize: 13, color: '#9ca3af' }}>No photos uploaded</span>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className={s.errorBox}>
                <AlertCircle size={16} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            <label className={s.termsRow}>
              <input
                type="checkbox"
                className={s.termsCheck}
                checked={termsAgreed}
                onChange={e => setTermsAgreed(e.target.checked)}
              />
              <span className={s.termsText}>
                I confirm that all information provided is accurate and I agree to the{' '}
                <span className={s.termsLink}>QXLITS livestock registration terms and conditions</span>.
              </span>
            </label>

            <div className={s.submitRow}>
              <button
                type="button"
                className={s.submitBtn}
                disabled={submitDisabled}
                onClick={handleSubmit}
              >
                {loading && <Loader size={15} strokeWidth={2} className={s.spin} />}
                {loading ? 'Submitting…' : 'Submit Registration'}
              </button>
              <button type="button" className={s.backBtn} onClick={handleBack}>
                ← Back to Animals
              </button>
            </div>
          </div>

        </main>

        {/* ── Help panel ── */}
        <aside className={s.helpPanel} style={isModal ? { display: 'none' } : undefined}>
          <div className={s.helpInner}>
            {focusedField && FIELD_HELP[focusedField] ? (() => {
              const h = FIELD_HELP[focusedField]!;
              return (
                <>
                  <div className={s.helpHeader}>
                    <span className={s.helpTitle}>{h.title}</span>
                  </div>
                  <p className={s.helpBody}>{h.body}</p>
                  {h.visuals && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '0 0 14px' }}>
                      {h.visuals.map(v => (
                        <div key={v.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 11px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{v.icon}</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0f172a', marginBottom: 2 }}>{v.label}</div>
                            <div style={{ fontSize: '0.775rem', color: '#475569', lineHeight: 1.5 }}>{v.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {h.tip && (
                    <div className={s.helpTip}>
                      <span className={s.helpTipLabel}>Tip</span>
                      <span className={s.helpTipText}>{h.tip}</span>
                    </div>
                  )}
                </>
              );
            })() : (
              <div className={s.helpIdle}>
                <div className={s.helpIdleIcon}>?</div>
                <div className={s.helpIdleTitle}>Field Help</div>
                <div className={s.helpIdleSub}>Click any field or selector in the form to see guidance here.</div>
              </div>
            )}
          </div>
        </aside>

      </div>
    </div>
  );
}

export default RegisterAnimalPage;

// ── Sub-components ─────────────────────────────────────────────────────────────

interface TypeCardProps {
  active: boolean;
  icon: React.ReactNode;
  name: string;
  desc: string;
  onClick: () => void;
}

function TypeCard({ active, icon, name, desc, onClick }: TypeCardProps): JSX.Element {
  return (
    <button
      type="button"
      className={`${s.typeCard}${active ? ' ' + s.typeCardActive : ''}`}
      onClick={onClick}
    >
      <div className={s.typeIcon}>{icon}</div>
      <div className={s.typeName}>{name}</div>
      <div className={s.typeDesc}>{desc}</div>
    </button>
  );
}

interface PhotoSlotProps {
  label: string;
  preview: string | null;
  required?: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onFile: (file: File) => void;
  onRemove: () => void;
}

function PhotoSlot({ label, preview, required, inputRef, onFile, onRemove }: PhotoSlotProps): JSX.Element {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div className={`${s.photoSlot}${preview ? ' ' + s.photoSlotFilled : ''}`}>
      <label style={{ display: 'contents', cursor: 'pointer' }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleChange}
        />
        {preview ? (
          <img src={preview} alt={label} className={s.photoImg} />
        ) : (
          <>
            <span className={s.photoSlotIcon}>📷</span>
            <span className={s.photoSlotLabel}>{label}</span>
            {required && <span className={s.photoSlotRequired}>Recommended</span>}
          </>
        )}
      </label>
      {preview && (
        <button
          type="button"
          className={s.photoRemoveBtn}
          onClick={e => { e.stopPropagation(); onRemove(); }}
          aria-label={`Remove ${label} photo`}
        >
          <X size={12} strokeWidth={3} />
        </button>
      )}
    </div>
  );
}
