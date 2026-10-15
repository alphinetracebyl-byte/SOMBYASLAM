import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Save, DoorOpen, DoorClosed } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import s from './capacity.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Pen {
  id:            string;
  pen_code:      string;
  pen_name:      string | null;
  capacity:      number;
  current_count: number | null;
  species:       string[] | null;
  status:        'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
}

type FormState = {
  pen_code:      string;
  pen_name:      string;
  capacity:      string;
  current_count: string;
  species:       string[];
  status:        string;
};

const EMPTY_FORM: FormState = {
  pen_code: '', pen_name: '', capacity: '', current_count: '0', species: [], status: 'AVAILABLE',
};

const SPECIES_OPTIONS = [
  { value: 'CATTLE', label: 'Cattle' },
  { value: 'CAMEL',  label: 'Camel'  },
  { value: 'GOAT',   label: 'Goat'   },
  { value: 'SHEEP',  label: 'Sheep'  },
];

const STATUS_OPTIONS = [
  { value: 'AVAILABLE',   label: 'Available'   },
  { value: 'OCCUPIED',    label: 'Occupied'    },
  { value: 'MAINTENANCE', label: 'Maintenance' },
];

function penFormOf(p: Pen): FormState {
  return {
    pen_code:      p.pen_code,
    pen_name:      p.pen_name ?? '',
    capacity:      String(p.capacity),
    current_count: String(p.current_count ?? 0),
    species:       p.species ?? [],
    status:        p.status,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CapacityWidget(): JSX.Element {
  const { facilityId, staffRole } = useAuthStore();
  const isSupervisor = staffRole === 'QUARANTINE_SUPERVISOR';

  const [pens,     setPens]     = useState<Pen[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [adding,   setAdding]   = useState(false);
  const [editId,   setEditId]   = useState<string | null>(null);
  const [form,     setForm]     = useState<FormState>(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { void load(); }, [facilityId]);

  async function load() {
    if (!facilityId) return;
    setLoading(true);
    const { data } = await supabase
      .from('facility_pens')
      .select('*')
      .eq('facility_id', facilityId)
      .order('created_at');
    setPens((data ?? []) as Pen[]);
    setLoading(false);
  }

  function setF<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function toggleSpecies(sp: string) {
    setForm(f => ({
      ...f,
      species: f.species.includes(sp) ? f.species.filter(x => x !== sp) : [...f.species, sp],
    }));
  }

  function validate(): string | null {
    if (!form.pen_code.trim()) return 'Pen code is required';
    const cap = Number.parseInt(form.capacity, 10);
    if (!form.capacity || Number.isNaN(cap) || cap < 1) return 'Capacity must be at least 1';
    if (cap > 10000) return 'Capacity cannot exceed 10,000';
    const cur = Number.parseInt(form.current_count, 10);
    if (Number.isNaN(cur) || cur < 0) return 'Current animals cannot be negative';
    if (cur > cap) return 'Current animals cannot exceed capacity';
    if (form.species.length === 0) return 'Select at least one animal type';
    return null;
  }

  async function addPen() {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true); setError('');
    const { error: e } = await supabase.from('facility_pens').insert({
      facility_id:   facilityId,
      pen_code:      form.pen_code.trim().toUpperCase(),
      pen_name:      form.pen_name.trim() || null,
      capacity:      Number.parseInt(form.capacity, 10),
      current_count: Number.parseInt(form.current_count, 10),
      species:       form.species,
      status:        form.status,
    });
    setSaving(false);
    if (e) { setError(e.message); return; }
    setAdding(false);
    setForm(EMPTY_FORM);
    await load();
  }

  async function savePen() {
    if (!editId) return;
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true); setError('');
    const { error: e } = await supabase.from('facility_pens').update({
      pen_code:      form.pen_code.trim().toUpperCase(),
      pen_name:      form.pen_name.trim() || null,
      capacity:      Number.parseInt(form.capacity, 10),
      current_count: Number.parseInt(form.current_count, 10),
      species:       form.species,
      status:        form.status,
    }).eq('id', editId);
    setSaving(false);
    if (e) { setError(e.message); return; }
    setEditId(null);
    setForm(EMPTY_FORM);
    await load();
  }

  async function deletePen(id: string) {
    await supabase.from('facility_pens').delete().eq('id', id);
    setDeleteId(null);
    await load();
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalPens    = pens.length;
  const totalAnimals = pens.reduce((a, p) => a + (p.current_count ?? 0), 0);
  const totalCap     = pens.reduce((a, p) => a + p.capacity, 0);
  const availPens    = pens.filter(p => p.status === 'AVAILABLE').length;
  const occupiedPens = pens.filter(p => p.status === 'OCCUPIED').length;

  const showForm = adding || editId !== null;

  if (loading) return <div className={s.widget}><span className={s.loadingText}>Loading pens…</span></div>;

  return (
    <div className={s.widget}>

      {/* ── Header ── */}
      <div className={s.header}>
        <div>
          <div className={s.title}>Holding Pens</div>
          {totalPens > 0 && (
            <div className={s.subtitle}>
              <strong>{totalAnimals.toLocaleString()}</strong> animals in facility
              {' · '}
              <span className={s.statAvail}>{availPens} available</span>
              {' · '}
              <span className={s.statOcc}>{occupiedPens} occupied</span>
              {' · '}
              capacity {totalCap.toLocaleString()}
            </div>
          )}
        </div>
        {isSupervisor && !showForm && (
          <button type="button" className={s.addBtn}
            onClick={() => { setForm(EMPTY_FORM); setError(''); setAdding(true); }}>
            <Plus size={14} strokeWidth={2.5}/> Add Pen
          </button>
        )}
      </div>

      {/* ── Empty state ── */}
      {totalPens === 0 && !showForm && (
        <div className={s.empty}>
          <div className={s.emptyIcon}>🐄</div>
          <div className={s.emptyTitle}>No pens configured</div>
          <div className={s.emptySub}>Add holding pens to track animals at this facility.</div>
          {isSupervisor && (
            <button type="button" className={s.addBtnLg}
              onClick={() => { setForm(EMPTY_FORM); setError(''); setAdding(true); }}>
              <Plus size={15}/> Add First Pen
            </button>
          )}
        </div>
      )}

      {/* ── Pen cards ── */}
      {totalPens > 0 && !showForm && (
        <div className={s.grid}>
          {pens.map(pen => {
            const isOcc = pen.status === 'OCCUPIED';
            const isMnt = pen.status === 'MAINTENANCE';
            const cnt   = pen.current_count ?? 0;
            const pct   = pen.capacity > 0 ? Math.min((cnt / pen.capacity) * 100, 100) : 0;
            const avail = Math.max(0, pen.capacity - cnt);
            return (
              <div key={pen.id} className={`${s.card} ${isOcc ? s.cardOcc : isMnt ? s.cardMnt : s.cardAvail}`}>

                {/* Code + name */}
                <div className={s.cardHead}>
                  <div className={s.doorIcon}>
                    {isOcc ? <DoorClosed size={22} strokeWidth={1.75}/> : <DoorOpen size={22} strokeWidth={1.75}/>}
                  </div>
                  <div className={s.penCode}>Pen {pen.pen_code}</div>
                  {pen.pen_name && <div className={s.penName}>{pen.pen_name}</div>}
                </div>

                {/* Animal count — primary info */}
                <div className={s.animalBlock}>
                  <span className={s.animalNum}>{cnt.toLocaleString()}</span>
                  <div className={s.animalMeta}>
                    <span className={s.animalLbl}>animals inside</span>
                    <span className={s.animalAvail}>{avail.toLocaleString()} left</span>
                  </div>
                </div>

                {/* Fill bar */}
                <div className={s.fillWrap}>
                  <div className={s.fillBar} style={{ width: `${pct}%`,
                    background: pct >= 90 ? '#7c4f2a' : pct >= 60 ? '#c4956a' : '#1d4ed8' }}/>
                </div>
                <div className={s.fillLbl}>{pen.capacity.toLocaleString()} capacity</div>

                {/* Species */}
                {(pen.species?.length ?? 0) > 0 && (
                  <div className={s.speciesRow}>
                    {pen.species!.map(sp => (
                      <span key={sp} className={s.spTag}>
                        {SPECIES_OPTIONS.find(o => o.value === sp)?.label ?? sp}
                      </span>
                    ))}
                  </div>
                )}

                {/* Status badge */}
                <div className={`${s.statusBadge} ${isOcc ? s.badgeOcc : isMnt ? s.badgeMnt : s.badgeAvail}`}>
                  {pen.status}
                </div>

                {/* Edit / delete */}
                {isSupervisor && (
                  <div className={s.cardActions}>
                    <button type="button" className={s.iconBtn} title="Edit"
                      onClick={() => { setEditId(pen.id); setForm(penFormOf(pen)); setError(''); }}>
                      <Pencil size={12}/>
                    </button>
                    <button type="button" className={`${s.iconBtn} ${s.iconBtnDel}`} title="Remove"
                      onClick={() => setDeleteId(pen.id)}>
                      <Trash2 size={12}/>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit form ── */}
      {showForm && (
        <div className={s.formCard}>
          <div className={s.formTitle}>
            {adding ? 'Add New Pen' : `Edit Pen ${pens.find(p => p.id === editId)?.pen_code ?? ''}`}
          </div>

          <div className={s.formRow}>
            <div className={s.field}>
              <label className={s.label}>Pen Code <span className={s.req}>*</span></label>
              <input type="text" className={s.input} placeholder="e.g. A, 01"
                value={form.pen_code} onChange={e => setF('pen_code', e.target.value)} maxLength={10}/>
            </div>
            <div className={s.field}>
              <label className={s.label}>Pen Name <span className={s.opt}>(optional)</span></label>
              <input type="text" className={s.input} placeholder="e.g. North Block"
                value={form.pen_name} onChange={e => setF('pen_name', e.target.value)}/>
            </div>
            <div className={s.field}>
              <label className={s.label}>Total Capacity <span className={s.req}>*</span></label>
              <input type="number" className={s.input} placeholder="Max animals"
                min={1} max={10000} value={form.capacity} onChange={e => setF('capacity', e.target.value)}/>
            </div>
            <div className={s.field}>
              <label className={s.label}>Animals Inside Now</label>
              <input type="number" className={s.input} placeholder="Current count"
                min={0} value={form.current_count} onChange={e => setF('current_count', e.target.value)}/>
            </div>
            <div className={s.field}>
              <label className={s.label}>Status</label>
              <select className={s.input} value={form.status} onChange={e => setF('status', e.target.value)}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Species — plain checkboxes */}
          <div className={s.spField}>
            <label className={s.label}>Animal Types Accepted <span className={s.req}>*</span></label>
            <div className={s.spChecks}>
              {SPECIES_OPTIONS.map(o => (
                <label key={o.value} className={s.spCheck}>
                  <input type="checkbox" checked={form.species.includes(o.value)}
                    onChange={() => toggleSpecies(o.value)}/>
                  {o.label}
                </label>
              ))}
            </div>
          </div>

          {error && <div className={s.errorMsg}>{error}</div>}

          <div className={s.formActions}>
            <button type="button" className={s.cancelBtn} disabled={saving}
              onClick={() => { setAdding(false); setEditId(null); setForm(EMPTY_FORM); setError(''); }}>
              <X size={13}/> Cancel
            </button>
            <button type="button" className={s.saveBtn} disabled={saving}
              onClick={adding ? addPen : savePen}>
              <Save size={13}/> {saving ? 'Saving…' : adding ? 'Add Pen' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* ── Confirm delete ── */}
      {deleteId && (
        <div className={s.confirmOverlay} onClick={() => setDeleteId(null)}>
          <div className={s.confirmBox} onClick={e => e.stopPropagation()}>
            <div className={s.confirmTitle}>Remove pen?</div>
            <div className={s.confirmMsg}>
              Pen {pens.find(p => p.id === deleteId)?.pen_code} will be permanently removed.
            </div>
            <div className={s.confirmBtns}>
              <button type="button" className={s.cancelBtn} onClick={() => setDeleteId(null)}>Cancel</button>
              <button type="button" className={s.deleteBtn} onClick={() => void deletePen(deleteId)}>Remove</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default CapacityWidget;
