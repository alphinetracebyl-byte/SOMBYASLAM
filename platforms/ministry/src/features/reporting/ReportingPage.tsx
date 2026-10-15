import { Download, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const monthlyData = [
  { month: 'Jan', registered: 3200, movements: 1800, certified: 420 },
  { month: 'Feb', registered: 2900, movements: 2100, certified: 380 },
  { month: 'Mar', registered: 4100, movements: 2400, certified: 510 },
  { month: 'Apr', registered: 3800, movements: 2200, certified: 490 },
  { month: 'May', registered: 5200, movements: 2900, certified: 640 },
  { month: 'Jun', registered: 4700, movements: 3100, certified: 590 },
  { month: 'Jul', registered: 6100, movements: 3400, certified: 720 },
];

const reports = [
  { name: 'National Herd Census Q2 2025',            date: '2025-06-30', type: 'PDF',  size: '2.4 MB' },
  { name: 'Disease Surveillance Report — June 2025', date: '2025-07-01', type: 'PDF',  size: '1.1 MB' },
  { name: 'Movement Statistics May 2025',            date: '2025-06-05', type: 'XLSX', size: '680 KB' },
  { name: 'Export Certification Summary Q1 2025',    date: '2025-04-02', type: 'PDF',  size: '1.8 MB' },
];

const p: React.CSSProperties    = { display: 'flex', flexDirection: 'column', gap: '1.25rem', fontFamily: "'Inter',system-ui,sans-serif" };
const card: React.CSSProperties = { background: '#fff', borderRadius: 14, padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,.07)' };

export function ReportingPage(): JSX.Element {
  return (
    <div style={p}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>Reports &amp; Analytics</h1>
          <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0.2rem 0 0' }}>National livestock statistics and downloadable government reports</p>
        </div>
        <button style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.125rem', background: '#1a2e80', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Download size={14} strokeWidth={2} /> Generate Report
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: '1.25rem' }}>
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827', marginBottom: '0.25rem' }}>Monthly Activity Overview</div>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '1rem' }}>Registrations, movements and certifications — 2025</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.12)', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="registered" name="Registered" fill="#3b82f6" radius={[3,3,0,0]} />
              <Bar dataKey="movements"  name="Movements"  fill="#22c55e" radius={[3,3,0,0]} />
              <Bar dataKey="certified"  name="Certified"  fill="#a855f7" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827', marginBottom: '1rem' }}>Saved Reports</div>
          {reports.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: i < reports.length - 1 ? '1px solid #f3f4f6' : 'none', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <FileText size={14} strokeWidth={1.75} color="#9ca3af" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827' }}>{r.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{r.date} · {r.size}</div>
                </div>
              </div>
              <button style={{ padding: '0.3rem 0.625rem', background: '#f3f4f6', border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                <Download size={11} strokeWidth={2} /> {r.type}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ReportingPage;
