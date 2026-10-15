import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Pencil, Check, X } from 'lucide-react';
import s from './batchDetail.module.css';

const SPECIES_OPTIONS = ['CATTLE', 'CAMEL', 'GOAT', 'SHEEP'];
const SPECIES_EMOJI: Record<string, string> = { CATTLE: '🐄', CAMEL: '🐪', GOAT: '🐐', SHEEP: '🐑' };

const BREEDS: Record<string, string[]> = {
  CATTLE: ['Zebu', 'Somali Zebu', 'Crossbreed', 'Boran', 'Orma', 'Galla', 'Other'],
  CAMEL:  ['Somali (Geel)', 'Bactrian', 'Dromedary', 'Crossbreed', 'Other'],
  GOAT:   ['Somali', 'Galla', 'Boer Cross', 'Toggenburg', 'Other'],
  SHEEP:  ['Somali Blackhead', 'Barkè', 'Ogaden', 'Crossbreed', 'Other'],
};

const PURPOSE_OPTIONS = ['Sale', 'Export', 'Slaughter', 'Breeding', 'Dairy', 'Draft', 'Other'];

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  DRAFT:        { color: '#64748b', bg: '#f1f5f9' },
  SUBMITTED:    { color: '#1d4ed8', bg: '#dbeafe' },
  UNDER_REVIEW: { color: '#d97706', bg: '#fef3c7' },
  APPROVED:     { color: '#16a34a', bg: '#dcfce7' },
  REJECTED:     { color: '#dc2626', bg: '#fee2e2' },
  TAGGED:       { color: '#7c3aed', bg: '#f5f3ff' },
};

interface Batch {
  id: string;
  batchCode: string;
  batchName: string;
  premisesCode: string;
  species: string;
  breed: string;
  count: number;
  purpose: string;
  status: string;
  region: string;
  createdAt: string;
  submittedAt?: string;
  approvedAt?: string;
  notes?: string;
}

export function BatchDetailPage(): JSX.Element {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate    = useNavigate();

  const [batch,   setBatch]   = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const [form, setForm] = useState({
    batchName: '',
    species:   '',
    breed:     '',
    purpose:   '',
    notes:     '',
  });

  useEffect(() => {
    if (!batchId) return;
    supabase
      .from('batches')
      .select('id, batch_code, batch_name, premises_code, species, breed, count, status, region, created_at, submitted_at, approved_at, notes, purpose')
      .eq('id', batchId)
      .single()
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }
        const b: Batch = {
          id:          data.id as string,
          batchCode:   data.batch_code as string,
          batchName:   data.batch_name as string,
          premisesCode: data.premises_code as string,
          species:     data.species as string,
          breed:       data.breed as string,
          count:       Number(data.count),
          purpose:     (data.purpose as string) ?? '',
          status:      data.status as string,
          region:      data.region as string,
          createdAt:   data.created_at as string,
          submittedAt: (data.submitted_at as string) ?? undefined,
          approvedAt:  (data.approved_at as string) ?? undefined,
          notes:       (data.notes as string) ?? '',
        };
        setBatch(b);
        setForm({ batchName: b.batchName, species: b.species, breed: b.breed, purpose: b.purpose, notes: b.notes ?? '' });
        setLoading(false);
      });
  }, [batchId]);

  const startEdit = () => {
    if (!batch) return;
    setForm({ batchName: batch.batchName, species: batch.species, breed: batch.breed, purpose: batch.purpose, notes: batch.notes ?? '' });
    setEditing(true);
    setError('');
  };

  const cancelEdit = () => { setEditing(false); setError(''); };

  const handleSave = async () => {
    if (!batch) return;
    if (!form.batchName.trim()) { setError('Batch name is required.'); return; }
    setSaving(true);
    setError('');
    const { error: upErr } = await supabase
      .from('batches')
      .update({
        batch_name: form.batchName.trim(),
        species:    form.species,
        breed:      form.breed,
        purpose:    form.purpose || null,
        notes:      form.notes.trim() || null,
      })
      .eq('id', batch.id);

    if (upErr) {
      setError('Failed to save: ' + upErr.message);
      setSaving(false);
      return;
    }

    setBatch(prev => prev ? { ...prev, batchName: form.batchName.trim(), species: form.species, breed: form.breed, purpose: form.purpose, notes: form.notes } : prev);
    setEditing(false);
    setSaving(false);
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  if (loading) return <div className={s.loading}>Loading batch…</div>;
  if (!batch)  return <div className={s.loading}>Batch not found.</div>;

  const st     = STATUS_COLORS[batch.status] ?? STATUS_COLORS.DRAFT;
  const breeds = BREEDS[editing ? form.species : batch.species] ?? [];
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className={s.page}>

      {/* Header */}
      <div className={s.pageHeader}>
        <button className={s.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={15} strokeWidth={2.5} /> Back
        </button>
        <div className={s.headerMeta}>
          <span className={s.batchCode}>{batch.batchCode}</span>
          <span className={s.statusBadge} style={{ color: st.color, background: st.bg }}>{batch.status}</span>
        </div>
        {!editing ? (
          <button className={s.editBtn} onClick={startEdit}>
            <Pencil size={14} strokeWidth={2} /> Edit Batch
          </button>
        ) : (
          <div className={s.editActions}>
            <button className={s.cancelBtn} onClick={cancelEdit} disabled={saving}>
              <X size={14} /> Cancel
            </button>
            <button className={s.saveBtn} onClick={() => void handleSave()} disabled={saving}>
              <Check size={14} /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {error && <div className={s.errorBox}>{error}</div>}

      <div className={s.body}>

        {/* ── Section 1: Batch Information ── */}
        <div className={s.section}>
          <div className={s.sectionTitle}>BATCH INFORMATION</div>

          <div className={s.fieldRow}>
            <div className={s.field}>
              <div className={s.label}>Batch Code</div>
              <div className={s.readOnly}>{batch.batchCode}</div>
            </div>
            <div className={s.field}>
              <div className={s.label}>Batch Name <span className={s.req}>*</span></div>
              {editing
                ? <input className={s.input} value={form.batchName} onChange={set('batchName')} />
                : <div className={s.readOnly}>{batch.batchName || '—'}</div>
              }
            </div>
          </div>

          <div className={s.fieldRow}>
            <div className={s.field}>
              <div className={s.label}>Status</div>
              <div className={s.readOnly}>
                <span style={{ color: st.color, fontWeight: 700 }}>{batch.status}</span>
              </div>
            </div>
            <div className={s.field}>
              <div className={s.label}>Farm</div>
              <div className={s.readOnly}>{batch.premisesCode}</div>
            </div>
          </div>

          <div className={s.fieldRow}>
            <div className={s.field}>
              <div className={s.label}>Region</div>
              <div className={s.readOnly}>{batch.region || '—'}</div>
            </div>
            <div className={s.field}>
              <div className={s.label}>Animal Count</div>
              <div className={s.readOnly}>{batch.count}</div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Species & Breed ── */}
        <div className={s.section}>
          <div className={s.sectionTitle}>SPECIES &amp; BREED</div>

          {editing ? (
            <div className={s.speciesCards}>
              {SPECIES_OPTIONS.map(sp => (
                <button
                  key={sp}
                  className={`${s.speciesCard}${form.species === sp ? ' ' + s.speciesCardActive : ''}`}
                  onClick={() => setForm(p => ({ ...p, species: sp, breed: '' }))}
                >
                  <span className={s.speciesEmoji}>{SPECIES_EMOJI[sp]}</span>
                  <span>{sp.charAt(0) + sp.slice(1).toLowerCase()}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className={s.speciesDisplay}>
              <span className={s.speciesEmojiLg}>{SPECIES_EMOJI[batch.species] ?? '🐾'}</span>
              <div>
                <div className={s.speciesName}>{batch.species.charAt(0) + batch.species.slice(1).toLowerCase()}</div>
                <div className={s.breedName}>{batch.breed || '—'}</div>
              </div>
            </div>
          )}

          <div className={s.field}>
            <div className={s.label}>Breed</div>
            {editing ? (
              <select className={s.select} value={form.breed} onChange={set('breed')}>
                <option value="">Select breed…</option>
                {breeds.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            ) : (
              <div className={s.readOnly}>{batch.breed || '—'}</div>
            )}
          </div>
        </div>

        {/* ── Section 3: Purpose & Notes ── */}
        <div className={s.section}>
          <div className={s.sectionTitle}>PURPOSE &amp; NOTES</div>

          <div className={s.field}>
            <div className={s.label}>Purpose</div>
            {editing ? (
              <select className={s.select} value={form.purpose} onChange={set('purpose')}>
                <option value="">No purpose set</option>
                {PURPOSE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            ) : (
              <div className={s.readOnly}>{batch.purpose || <span style={{ opacity: 0.4 }}>No purpose set</span>}</div>
            )}
          </div>

          <div className={s.field}>
            <div className={s.label}>Notes</div>
            {editing ? (
              <textarea className={s.textarea} rows={3} value={form.notes} onChange={set('notes')} />
            ) : (
              <div className={s.readOnly} style={{ minHeight: 48 }}>{batch.notes || <span style={{ opacity: 0.4 }}>No notes</span>}</div>
            )}
          </div>
        </div>

        {/* ── Section 4: Dates ── */}
        <div className={s.section}>
          <div className={s.sectionTitle}>TIMELINE</div>
          <div className={s.fieldRow}>
            <div className={s.field}>
              <div className={s.label}>Created</div>
              <div className={s.readOnly}>{fmtDate(batch.createdAt)}</div>
            </div>
            <div className={s.field}>
              <div className={s.label}>Submitted</div>
              <div className={s.readOnly}>{fmtDate(batch.submittedAt)}</div>
            </div>
            <div className={s.field}>
              <div className={s.label}>Approved</div>
              <div className={s.readOnly}>{fmtDate(batch.approvedAt)}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default BatchDetailPage;
