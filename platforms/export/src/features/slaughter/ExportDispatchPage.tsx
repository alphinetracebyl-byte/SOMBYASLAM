import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import type { SlaughterRecord, ExportConsignment } from '@/types/facility';
import s from '../quarantine/quarantine.module.css';

export function ExportDispatchPage(): JSX.Element {
  const { facilityId, facilityCode, staffName } = useAuthStore();
  const [cleared, setCleared]         = useState<SlaughterRecord[]>([]);
  const [consignments, setConsignments] = useState<ExportConsignment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [selected, setSelected]       = useState<Set<string>>(new Set());

  const [destination, setDestination] = useState('');
  const [exporter, setExporter]       = useState('');
  const [container, setContainer]     = useState('');
  const [seal, setSeal]               = useState('');
  const [loadingDate, setLoadingDate] = useState(new Date().toISOString().slice(0, 10));
  const [loadingTime, setLoadingTime] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');

  useEffect(() => { void load(); }, [facilityId]);

  async function load() {
    if (!facilityId) return;
    setLoading(true);
    const [cRes, consRes] = await Promise.all([
      supabase.from('slaughter_records').select('*').eq('facility_id', facilityId)
        .eq('status', 'POST_MORTEM_PASSED').order('slaughter_date', { ascending: false }),
      supabase.from('export_consignments').select('*').eq('facility_id', facilityId)
        .order('created_at', { ascending: false }).limit(50),
    ]);
    setCleared(cRes.data ?? []);
    setConsignments(consRes.data ?? []);
    setLoading(false);
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === cleared.length) setSelected(new Set());
    else setSelected(new Set(cleared.map(r => r.id)));
  }

  async function createConsignment() {
    if (selected.size === 0) { setError('Select at least one carcass.'); return; }
    if (!destination.trim()) { setError('Destination is required.'); return; }
    setSaving(true); setError(null);

    const code = `CONS-${facilityCode ?? 'SH'}-${Date.now()}`;
    const selectedItems = cleared.filter(r => selected.has(r.id));
    const totalWeight = selectedItems.reduce((acc, r) => acc + (r.carcass_weight_kg ?? 0), 0);

    const { data: cons, error: e1 } = await supabase.from('export_consignments').insert({
      consignment_code: code,
      facility_id: facilityId,
      facility_code: facilityCode,
      status: 'LOADING',
      destination,
      exporter_name: exporter || null,
      container_vehicle: container || null,
      container_seal: seal || null,
      loading_date: loadingDate,
      loading_time: loadingTime || null,
      total_items: selectedItems.length,
      total_weight_kg: totalWeight > 0 ? totalWeight : null,
      supervisor_name: staffName,
      notes: dispatchNotes || null,
    }).select().single();

    if (e1 || !cons) { setSaving(false); setError(e1?.message ?? 'Failed to create consignment'); return; }

    const items = selectedItems.map(r => ({
      consignment_id: cons.id,
      facility_id: facilityId,
      slaughter_id: r.id,
      carcass_code: r.carcass_code,
      tag_number: r.tag_number,
      species: r.species,
      carcass_weight_kg: r.carcass_weight_kg,
    }));
    const { error: e2 } = await supabase.from('consignment_items').insert(items);
    if (e2) { setSaving(false); setError(e2.message); return; }

    await supabase.from('slaughter_records').update({
      status: 'DISPATCHED', updated_at: new Date().toISOString(),
    }).in('id', [...selected]);

    setSaving(false); setShowForm(false); setSelected(new Set());
    setDestination(''); setExporter(''); setContainer(''); setSeal('');
    setLoadingTime(''); setDispatchNotes('');
    void load();
  }

  const selectedWeight = cleared.filter(r => selected.has(r.id))
    .reduce((a, r) => a + (r.carcass_weight_kg ?? 0), 0);

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Export Dispatch</h1>
          <p className={s.pageSub}>Build export consignments from post-mortem cleared carcasses</p>
        </div>
        {cleared.length > 0 && (
          <button className={`${s.btn} ${s.btn_success}`} disabled={selected.size === 0}
            onClick={() => { setError(null); setShowForm(true); }}>
            {selected.size > 0 ? `+ Create Consignment (${selected.size})` : '+ Create Consignment'}
          </button>
        )}
      </div>

      <div className={s.tableWrap}>
        <div className={s.tableHeader}>
          <h2 className={s.tableTitle}>Cleared for Dispatch ({cleared.length})</h2>
          {cleared.length > 0 && (
            <button className={`${s.btn} ${s.btn_outline}`} onClick={toggleAll}>
              {selected.size === cleared.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>
        {loading ? <div className={s.empty}>Loading…</div> : cleared.length === 0 ? (
          <div className={s.empty}>No carcasses cleared for dispatch. Post-mortem inspection must pass first.</div>
        ) : (
          <table>
            <thead>
              <tr><th></th><th>Carcass Code</th><th>Tag</th><th>Species</th><th>Slaughter Date</th><th>Carcass Wt.</th></tr>
            </thead>
            <tbody>
              {cleared.map(r => (
                <tr key={r.id}
                  style={{ background: selected.has(r.id) ? '#eff6ff' : undefined, cursor: 'pointer' }}
                  onClick={() => toggleSelect(r.id)}
                >
                  <td onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} />
                  </td>
                  <td><strong style={{ fontFamily: 'monospace' }}>{r.carcass_code ?? '—'}</strong></td>
                  <td>{r.tag_number}</td>
                  <td>{r.species}</td>
                  <td>{r.slaughter_date ?? '—'}</td>
                  <td>{r.carcass_weight_kg ? `${r.carcass_weight_kg} kg` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className={s.tableFooter} style={selected.size > 0 ? { color: '#0b5ed7', fontWeight: 600 } : undefined}>
          {selected.size > 0
            ? `${selected.size} selected — total weight: ${selectedWeight.toFixed(1)} kg`
            : `${cleared.length} cleared`
          }
        </div>
      </div>

      <div className={s.tableWrap}>
        <div className={s.tableHeader}><h2 className={s.tableTitle}>Export Consignments</h2></div>
        {consignments.length === 0 ? <div className={s.empty}>No consignments created yet.</div> : (
          <table>
            <thead>
              <tr>
                <th>Code</th><th>Destination</th><th>Exporter</th><th>Container</th>
                <th>Loading Date</th><th>Items</th><th>Total Wt.</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {consignments.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.consignment_code}</strong></td>
                  <td>{c.destination ?? '—'}</td>
                  <td>{c.exporter_name ?? '—'}</td>
                  <td>{c.container_vehicle ?? '—'}</td>
                  <td>{c.loading_date ?? '—'}</td>
                  <td>{c.total_items}</td>
                  <td>{c.total_weight_kg ? `${c.total_weight_kg} kg` : '—'}</td>
                  <td><span className={`${s.badge} ${s.badge_ACTIVE}`}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className={s.tableFooter}>{consignments.length} consignment{consignments.length !== 1 ? 's' : ''}</div>
      </div>

      {showForm && (
        <div className={s.modal}>
          <div className={s.modalBackdrop} onClick={() => setShowForm(false)} />
          <div className={`${s.modalBox} ${s.modalBoxWide}`}>
            <h2 className={s.modalTitle}>Create Export Consignment</h2>
            {error && <div className={`${s.alert} ${s.alert_error}`}>⚠ {error}</div>}
            <div className={`${s.alert} ${s.alert_info}`}>
              ℹ {selected.size} carcass{selected.size !== 1 ? 'es' : ''} selected —
              total weight: <strong>{selectedWeight.toFixed(1)} kg</strong>
            </div>
            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label}>Destination Country / Port *</label>
                <input className={s.input} value={destination} onChange={e => setDestination(e.target.value)}
                  placeholder="e.g. Saudi Arabia — Jeddah Port" />
              </div>
              <div className={s.field}>
                <label className={s.label}>Exporter / Company</label>
                <input className={s.input} value={exporter} onChange={e => setExporter(e.target.value)}
                  placeholder="Exporting company name" />
              </div>
            </div>
            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label}>Container / Vehicle Number</label>
                <input className={s.input} value={container} onChange={e => setContainer(e.target.value)}
                  placeholder="e.g. CONT-2026-001" />
              </div>
              <div className={s.field}>
                <label className={s.label}>Container Seal Number</label>
                <input className={s.input} value={seal} onChange={e => setSeal(e.target.value)} placeholder="Official seal number" />
              </div>
            </div>
            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label}>Loading Date</label>
                <input className={s.input} type="date" value={loadingDate} onChange={e => setLoadingDate(e.target.value)} />
              </div>
              <div className={s.field}>
                <label className={s.label}>Loading Time</label>
                <input className={s.input} type="time" value={loadingTime} onChange={e => setLoadingTime(e.target.value)} />
              </div>
            </div>
            <div className={s.field}>
              <label className={s.label}>Notes</label>
              <textarea className={s.textarea} value={dispatchNotes} onChange={e => setDispatchNotes(e.target.value)}
                placeholder="Special instructions, refrigeration requirements…" />
            </div>
            <div className={s.formActions}>
              <button className={`${s.btn} ${s.btn_outline}`} onClick={() => setShowForm(false)}>Cancel</button>
              <button className={`${s.btn} ${s.btn_success}`} disabled={saving}
                onClick={() => void createConsignment()}>
                {saving ? 'Creating…' : `Create Consignment (${selected.size} item${selected.size !== 1 ? 's' : ''})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExportDispatchPage;
