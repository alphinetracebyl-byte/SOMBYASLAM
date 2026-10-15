import { useState, useEffect } from 'react';
import { Truck, CheckCircle, MapPin, ChevronRight, RefreshCw, Navigation } from 'lucide-react';
import { apiClient } from '@/api/client';
import s from './movements.module.css';

interface Movement {
  id: string; movementCode: string;
  originPremisesCode: string; destinationPremisesCode: string;
  animalCount: number; purpose: string;
  permitIssuedAt?: string; departedAt?: string;
}

export function MovementsPage(): JSX.Element {
  const [departures, setDepartures] = useState<Movement[]>([]);
  const [arrivals, setArrivals]     = useState<Movement[]>([]);
  const [loading, setLoading]       = useState(true);
  const [spinning, setSpinning]     = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = (silent = false) => {
    silent ? setSpinning(true) : setLoading(true);
    Promise.all([
      apiClient.get<{ content: Movement[] }>('/movements', { params: { status: 'PERMIT_ISSUED', size: 50 } }),
      apiClient.get<{ content: Movement[] }>('/movements', { params: { status: 'IN_TRANSIT',    size: 50 } }),
    ])
      .then(([d, a]) => {
        setDepartures(d.data.content ?? []);
        setArrivals(a.data.content ?? []);
      })
      .catch(() => { setDepartures([]); setArrivals([]); })
      .finally(() => { setLoading(false); setSpinning(false); });
  };

  useEffect(() => { load(); }, []);

  const confirmDeparture = async (id: string) => {
    setConfirming(id);
    try {
      await apiClient.post(`/movements/${id}/confirm-departure`);
      setDepartures(prev => prev.filter(m => m.id !== id));
    } finally { setConfirming(null); }
  };

  const confirmArrival = async (id: string) => {
    setConfirming(id);
    try {
      await apiClient.post(`/movements/${id}/confirm-arrival`);
      setArrivals(prev => prev.filter(m => m.id !== id));
    } finally { setConfirming(null); }
  };

  const total = departures.length + arrivals.length;

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Movement Confirmations</h1>
          <p className={s.sub}>
            {total > 0
              ? `${total} movement${total > 1 ? 's' : ''} awaiting confirmation`
              : 'Confirm animal departures and arrivals in your region'}
          </p>
        </div>
        <button className={s.refreshBtn} onClick={() => load(true)} disabled={spinning}>
          <RefreshCw size={15} className={spinning ? s.spin : undefined}/>
        </button>
      </div>

      {loading ? (
        <div className={s.panels}>
          <div className={s.panel}>
            <div className={s.panelHead}><div className={s.panelTitle}><Truck size={15}/> Pending Departures</div></div>
            {[1,2,3].map(i => <div key={i} className={s.skeleton}/>)}
          </div>
          <div className={s.panel}>
            <div className={s.panelHead}><div className={s.panelTitle}><CheckCircle size={15}/> Pending Arrivals</div></div>
            {[1,2,3].map(i => <div key={i} className={s.skeleton}/>)}
          </div>
        </div>
      ) : (
        <div className={s.panels}>
          {/* Departures column */}
          <div className={s.panel}>
            <div className={s.panelHead}>
              <div className={s.panelTitle}>
                <Truck size={15} color="#d97706"/>
                <span>Pending Departures</span>
              </div>
              <span className={`${s.panelBadge} ${s.badgeAmber}`}>{departures.length}</span>
            </div>
            {departures.length === 0 ? (
              <div className={s.panelEmpty}>
                <Navigation size={32} color="#cbd5e1"/>
                <p>No pending departures</p>
              </div>
            ) : departures.map(m => (
              <div key={m.id} className={s.card}>
                <div className={s.cardTop}>
                  <span className={s.code}>{m.movementCode}</span>
                  <span className={s.animals}>{m.animalCount} animal{m.animalCount !== 1 ? 's' : ''}</span>
                </div>
                <div className={s.routeBlock}>
                  <div className={s.routePin}>
                    <MapPin size={12} color="#64748b"/>{m.originPremisesCode}
                  </div>
                  <ChevronRight size={14} color="#94a3b8"/>
                  <div className={s.routePinDest}>
                    <MapPin size={12} color="#d97706"/>{m.destinationPremisesCode}
                  </div>
                </div>
                <div className={s.purpose}>{m.purpose}</div>
                <button
                  className={`${s.confirmBtn} ${s.confirmAmber}`}
                  disabled={confirming === m.id}
                  onClick={() => confirmDeparture(m.id)}>
                  <Truck size={14}/>
                  {confirming === m.id ? 'Confirming…' : 'Confirm Departure'}
                </button>
              </div>
            ))}
          </div>

          {/* Arrivals column */}
          <div className={s.panel}>
            <div className={s.panelHead}>
              <div className={s.panelTitle}>
                <CheckCircle size={15} color="#059669"/>
                <span>Pending Arrivals</span>
              </div>
              <span className={`${s.panelBadge} ${s.badgeGreen}`}>{arrivals.length}</span>
            </div>
            {arrivals.length === 0 ? (
              <div className={s.panelEmpty}>
                <CheckCircle size={32} color="#cbd5e1"/>
                <p>No pending arrivals</p>
              </div>
            ) : arrivals.map(m => (
              <div key={m.id} className={s.card}>
                <div className={s.cardTop}>
                  <span className={s.code}>{m.movementCode}</span>
                  <span className={s.animals}>{m.animalCount} animal{m.animalCount !== 1 ? 's' : ''}</span>
                </div>
                <div className={s.routeBlock}>
                  <div className={s.routePin}>
                    <MapPin size={12} color="#64748b"/>{m.originPremisesCode}
                  </div>
                  <ChevronRight size={14} color="#94a3b8"/>
                  <div className={s.routePinDest}>
                    <MapPin size={12} color="#059669"/>{m.destinationPremisesCode}
                  </div>
                </div>
                <div className={s.purpose}>{m.purpose}</div>
                <button
                  className={`${s.confirmBtn} ${s.confirmGreen}`}
                  disabled={confirming === m.id}
                  onClick={() => confirmArrival(m.id)}>
                  <CheckCircle size={14}/>
                  {confirming === m.id ? 'Confirming…' : 'Confirm Arrival'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MovementsPage;
