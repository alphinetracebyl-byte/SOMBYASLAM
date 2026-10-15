import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, Send, Loader, X, Inbox,
  RefreshCw, Plus, ExternalLink, CheckCircle,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import s from './action-center.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Reply {
  id: string;
  messageId: string;
  fromUserId: string;
  fromUserName: string;
  fromRole: string;
  body: string;
  createdAt: string;
}

interface ActionMessage {
  id: string;
  messageCode: string;
  fromUserId: string;
  fromUserName: string;
  fromRole: string;
  fromRegion: string;
  toUserId?: string;
  toUserName?: string;
  toRole?: string;
  toRegion?: string;
  subject: string;
  body: string;
  priority: string;
  refType?: string;
  refCode?: string;
  status: string;
  responseBody?: string;
  respondedByName?: string;
  respondedAt?: string;
  createdAt: string;
}

const STATUS_CFG: Record<string, { bg: string; color: string; label: string }> = {
  UNREAD:    { bg: '#fef9c3', color: '#92400e', label: 'New'       },
  READ:      { bg: '#f3f4f6', color: '#6b7280', label: 'Read'      },
  RESPONDED: { bg: '#f0fdf4', color: '#15803d', label: 'Responded' },
  CLOSED:    { bg: '#e0e7ff', color: '#3730a3', label: 'Done'      },
};

const PRIORITY_CFG: Record<string, { bg: string; color: string; label: string }> = {
  LOW:    { bg: '#f3f4f6', color: '#6b7280', label: 'Low'    },
  NORMAL: { bg: '#f0f9ff', color: '#0369a1', label: 'Normal' },
  HIGH:   { bg: '#fffbeb', color: '#b45309', label: 'High'   },
  URGENT: { bg: '#fef2f2', color: '#b91c1c', label: 'Urgent' },
};

// Who the farmer can send to
const RECIPIENT_ROLES = [
  { value: 'MINISTRY_STAFF',      label: 'Ministry Staff'      },
  { value: 'FIELD_INSPECTOR',     label: 'Field Inspector'     },
  { value: 'VETERINARY_OFFICER',  label: 'Veterinary Officer'  },
];

// What a farmer request can be about
const REQUEST_TYPES = [
  'Update my contact information',
  'Update my email address',
  'Change premises details',
  'Query about movement permit',
  'Appeal animal rejection',
  'Request health certificate',
  'Report an error in my record',
  'Other request',
];

function relTime(ts: string): string {
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function mapRow(r: Record<string, unknown>): ActionMessage {
  return {
    id:              r.id as string,
    messageCode:     r.message_code as string,
    fromUserId:      r.from_user_id as string,
    fromUserName:    (r.from_user_name as string) ?? '',
    fromRole:        (r.from_role as string) ?? '',
    fromRegion:      (r.from_region as string) ?? '',
    toUserId:        r.to_user_id   as string | undefined,
    toUserName:      r.to_user_name as string | undefined,
    toRole:          r.to_role      as string | undefined,
    toRegion:        r.to_region    as string | undefined,
    subject:         (r.subject as string) ?? '',
    body:            (r.body as string) ?? '',
    priority:        (r.priority as string) ?? 'NORMAL',
    refType:         r.ref_type     as string | undefined,
    refCode:         r.ref_code     as string | undefined,
    status:          (r.status as string) ?? 'UNREAD',
    responseBody:    r.response_body    as string | undefined,
    respondedByName: r.responded_by_name as string | undefined,
    respondedAt:     r.responded_at      as string | undefined,
    createdAt:       r.created_at as string,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ActionCenterPage(): JSX.Element {
  const navigate   = useNavigate();
  const { userId, farmerName, region } = useAuthStore();
  const displayName = farmerName ?? 'Farmer';

  // Real Supabase auth UID (farmer userId may differ from session UID in dev)
  const [authUid, setAuthUid] = useState<string>(userId ?? '');
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) setAuthUid(data.user.id);
    });
  }, []);

  const [tab,      setTab]      = useState<'inbox' | 'sent'>('inbox');
  const [messages, setMessages] = useState<ActionMessage[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  // Reply thread
  const [replies,      setReplies]      = useState<Record<string, Reply[]>>({});
  const [replyText,    setReplyText]    = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replyError,   setReplyError]   = useState('');

  // Compose
  const [composing,  setComposing]  = useState(false);
  const [cToRole,    setCToRole]    = useState('MINISTRY_STAFF');
  const [cSubject,   setCSubject]   = useState('');
  const [cBody,      setCBody]      = useState('');
  const [cRefType,   setCRefType]   = useState('');
  const [cRefCode,   setCRefCode]   = useState('');
  const [cPriority,  setCPriority]  = useState('NORMAL');
  const [cSending,   setCSending]   = useState(false);
  const [cError,     setCError]     = useState('');

  // ── Load ───────────────────────────────────────────────────────────────────
  const loadMessages = () => {
    if (!authUid) return;
    setLoading(true);

    let q = supabase
      .from('action_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (tab === 'inbox') q = q.or(`to_user_id.eq.${authUid},from_user_id.eq.${authUid}`);
    else                 q = q.eq('from_user_id', authUid);

    void q.then(({ data }) => {
      setMessages((data ?? []).map(r => mapRow(r as Record<string, unknown>)));
      setLoading(false);
    });
  };

  useEffect(() => { loadMessages(); }, [authUid, tab]); // eslint-disable-line

  // ── Poll replies while a message is expanded ───────────────────────────────
  useEffect(() => {
    if (!selected) return;
    const id = setInterval(() => void loadReplies(selected), 10_000);
    return () => clearInterval(id);
  }, [selected]); // eslint-disable-line

  // ── Load replies ───────────────────────────────────────────────────────────
  const loadReplies = async (messageId: string) => {
    const { data } = await supabase
      .from('action_message_replies')
      .select('*')
      .eq('message_id', messageId)
      .order('created_at', { ascending: true });
    setReplies(prev => ({
      ...prev,
      [messageId]: (data ?? []).map(r => ({
        id:           r.id as string,
        messageId:    r.message_id as string,
        fromUserId:   r.from_user_id as string,
        fromUserName: (r.from_user_name as string) ?? '',
        fromRole:     (r.from_role as string) ?? '',
        body:         r.body as string,
        createdAt:    r.created_at as string,
      })),
    }));
  };

  const unreadCount = messages.filter(m => m.status === 'UNREAD' && m.fromUserId !== authUid && tab === 'inbox').length;

  // ── Mark read ──────────────────────────────────────────────────────────────
  const markRead = async (id: string) => {
    await supabase.from('action_messages').update({ status: 'READ' }).eq('id', id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'READ' } : m));
  };

  const markClosed = async (id: string) => {
    await supabase.from('action_messages').update({ status: 'CLOSED' }).eq('id', id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'CLOSED' } : m));
  };

  const toggle = (msg: ActionMessage) => {
    const isOpening = selected !== msg.id;
    setSelected(prev => prev === msg.id ? null : msg.id);
    setReplyText('');
    setReplyError('');
    if (isOpening) {
      if (msg.status === 'UNREAD' && msg.fromUserId !== authUid && tab === 'inbox') void markRead(msg.id);
      void loadReplies(msg.id);
    }
  };

  // ── Send reply ─────────────────────────────────────────────────────────────
  const sendReply = async (msg: ActionMessage) => {
    if (!replyText.trim() || !authUid) return;
    setReplySending(true);
    setReplyError('');

    const { error } = await supabase.from('action_message_replies').insert({
      message_id:     msg.id,
      from_user_id:   authUid,
      from_user_name: displayName,
      from_role:      'FARMER',
      body:           replyText.trim(),
    });

    if (error) { setReplyError('Failed to send. Please try again.'); setReplySending(false); return; }

    void loadReplies(msg.id);
    setReplyText('');
    setReplySending(false);
  };

  // ── Send ───────────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!authUid || !cSubject.trim() || !cBody.trim()) return;
    setCSending(true);
    setCError('');

    const { data: msgCode } = await supabase.rpc('generate_message_code', { p_region: region || 'SOM' });

    const { error } = await supabase.from('action_messages').insert({
      message_code:   (msgCode as string) || `MSG-${Date.now()}`,
      from_user_id:   authUid,
      from_user_name: displayName,
      from_role:      'FARMER',
      from_region:    region || null,
      to_role:        cToRole || null,
      to_region:      region || null,
      subject:        cSubject.trim(),
      body:           cBody.trim(),
      priority:       cPriority,
      ref_type:       cRefType || null,
      ref_code:       cRefCode.trim() || null,
      status:         'UNREAD',
    });

    if (error) { setCError('Failed to send. Please try again.'); setCSending(false); return; }

    setComposing(false);
    setCSubject(''); setCBody(''); setCRefType(''); setCRefCode('');
    setCToRole('MINISTRY_STAFF'); setCPriority('NORMAL');
    setCSending(false);
    if (tab === 'sent') loadMessages();
  };

  // ── Ref navigation ─────────────────────────────────────────────────────────
  const goToRef = (refType: string, refCode: string) => {
    if (refType === 'MOVEMENT')      navigate(`/movements?code=${refCode}`);
    else if (refType === 'ANIMAL')   navigate(`/animals/${refCode}`);
    else if (refType === 'PREMISES') navigate(`/premises/${refCode}`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={s.page}>

      <div className={s.header}>
        <div>
          <h1 className={s.title}>Messenger</h1>
          <p className={s.sub}>Send messages, get updates, track your cases</p>
        </div>
        <div className={s.headerRight}>
          <button className={s.refreshBtn} onClick={loadMessages} title="Refresh"><RefreshCw size={14} /></button>
          <button className={s.composeBtn} onClick={() => setComposing(true)}>
            <Plus size={14} style={{ marginRight: '0.35rem' }} /> New Message
          </button>
        </div>
      </div>

      {/* Helper banner */}
      <div className={s.helpBanner}>
        <MessageSquare size={14} style={{ flexShrink: 0 }} />
        <span>
          Use Messenger to contact ministry staff or field officers — for example, to update your details, appeal a decision, or get help with a movement permit.
        </span>
      </div>

      <div className={s.tabs}>
        <button className={`${s.tab}${tab === 'inbox' ? ' ' + s.tabActive : ''}`} onClick={() => { setTab('inbox'); setSelected(null); }}>
          <Inbox size={14} style={{ marginRight: '0.35rem' }} />
          Inbox
          {unreadCount > 0 && <span className={s.unreadBadge}>{unreadCount}</span>}
        </button>
        <button className={`${s.tab}${tab === 'sent' ? ' ' + s.tabActive : ''}`} onClick={() => { setTab('sent'); setSelected(null); }}>
          <Send size={14} style={{ marginRight: '0.35rem' }} />
          Sent
        </button>
      </div>

      {loading ? (
        <div className={s.list}>{[1, 2, 3].map(i => <div key={i} className={s.skeleton} />)}</div>
      ) : messages.length === 0 ? (
        <div className={s.empty}>
          <MessageSquare size={44} strokeWidth={1.25} color="#cbd5e1" />
          <div className={s.emptyTitle}>
            {tab === 'inbox' ? 'No messages yet' : 'No sent messages yet'}
          </div>
          <div className={s.emptySub}>
            {tab === 'inbox'
              ? 'Messages from ministry staff and field officers will appear here.'
              : 'Messages you send will appear here.'}
          </div>
          <button className={s.composeBtn} style={{ marginTop: '0.5rem' }} onClick={() => setComposing(true)}>
            <Plus size={14} style={{ marginRight: '0.35rem' }} /> Send a Message
          </button>
        </div>
      ) : (
        <div className={s.messageList}>
          {messages.map(msg => {
            const isExpanded = selected === msg.id;
            const isMine = msg.fromUserId === authUid;
            const stCfg  = STATUS_CFG[msg.status]    ?? STATUS_CFG.READ;
            const priCfg = PRIORITY_CFG[msg.priority] ?? PRIORITY_CFG.NORMAL;
            return (
              <div
                key={msg.id}
                className={`${s.msgRow}${msg.status === 'UNREAD' && !isMine && tab === 'inbox' ? ' ' + s.msgRowUnread : ''}${isExpanded ? ' ' + s.msgRowOpen : ''}`}
                onClick={() => toggle(msg)}
              >
                <div className={s.msgTop}>
                  <div className={s.msgLeft}>
                    {msg.status === 'UNREAD' && !isMine && tab === 'inbox' && <span className={s.unreadDot} />}
                    <div className={s.msgMeta}>
                      <span className={s.msgFrom}>
                        {isMine
                          ? (msg.toUserName || msg.toRole?.replace(/_/g, ' ') || 'Ministry Staff')
                          : (msg.fromUserName || msg.fromRole.replace(/_/g, ' '))}
                      </span>
                      {isMine && msg.toRole && (
                        <span className={s.msgRole}>{msg.toRole.replace(/_/g, ' ')}</span>
                      )}
                    </div>
                    <span className={s.msgCode}>{msg.messageCode}</span>
                    {msg.refType && msg.refCode && (
                      <button
                        className={s.refBadge}
                        onClick={e => { e.stopPropagation(); goToRef(msg.refType!, msg.refCode!); }}
                        title={`Go to ${msg.refType}`}
                      >
                        {msg.refCode} <ExternalLink size={10} style={{ marginLeft: 2 }} />
                      </button>
                    )}
                  </div>
                  <div className={s.msgRight}>
                    <span style={{ background: priCfg.bg, color: priCfg.color, fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 10 }}>
                      {priCfg.label}
                    </span>
                    <span style={{ background: stCfg.bg, color: stCfg.color, fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 10 }}>
                      {stCfg.label}
                    </span>
                    <span className={s.msgTime}>{relTime(msg.createdAt)}</span>
                  </div>
                </div>

                <div className={s.msgSubject}>{msg.subject}</div>

                {isExpanded && (
                  <div className={s.msgDetail} onClick={e => e.stopPropagation()}>
                    <div className={s.msgBody}>{msg.body}</div>

                    {/* Reply thread */}
                    {(replies[msg.id] ?? []).length > 0 && (
                      <div className={s.replyThread}>
                        {(replies[msg.id] ?? []).map(r => (
                          <div key={r.id} className={`${s.replyItem}${r.fromUserId === authUid ? ' ' + s.replyItemMine : ''}`}>
                            <div className={s.replyMeta}>
                              <span className={s.replyAuthor}>{r.fromUserName || r.fromRole.replace(/_/g, ' ')}</span>
                              <span className={s.replyTime}>{relTime(r.createdAt)}</span>
                            </div>
                            <div className={s.replyBody}>{r.body}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {msg.status === 'CLOSED' ? (
                      <div className={s.closedBanner}>This conversation has been closed.</div>
                    ) : (
                      <div className={s.replyArea}>
                        <textarea
                          className={s.replyInput}
                          rows={3}
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder="Write a reply…"
                        />
                        {replyError && <div className={s.replyError}>{replyError}</div>}
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <button
                            className={s.sendBtn}
                            disabled={replySending || !replyText.trim()}
                            onClick={() => sendReply(msg)}
                          >
                            {replySending ? <Loader size={13} className={s.spin} /> : <Send size={13} />}
                            {' '}Reply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Compose modal ─────────────────────────────────────────────────── */}
      {composing && (
        <div className={s.overlay} onClick={() => !cSending && setComposing(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHead}>
              <div className={s.modalTitle}>New Message</div>
              <button className={s.closeBtn} onClick={() => !cSending && setComposing(false)}><X size={18} /></button>
            </div>
            <div className={s.modalBody}>

              {/* Quick subject chips */}
              <div>
                <label className={s.formLabel} style={{ marginBottom: '0.4rem', display: 'block' }}>Quick subject (optional)</label>
                <div className={s.chipRow}>
                  {REQUEST_TYPES.map(t => (
                    <button
                      key={t}
                      className={`${s.chip}${cSubject === t ? ' ' + s.chipActive : ''}`}
                      onClick={() => setCSubject(t)}
                      type="button"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className={s.formRow}>
                <label className={s.formLabel}>Send To</label>
                <select className={s.formSelect} value={cToRole} onChange={e => setCToRole(e.target.value)}>
                  {RECIPIENT_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div className={s.formRow}>
                <label className={s.formLabel}>Subject *</label>
                <input
                  className={s.formInput}
                  value={cSubject}
                  onChange={e => setCSubject(e.target.value)}
                  placeholder="Brief description of your request"
                />
              </div>

              <div className={s.formRow}>
                <label className={s.formLabel}>Your Message *</label>
                <textarea
                  className={s.formTextarea}
                  rows={5}
                  value={cBody}
                  onChange={e => setCBody(e.target.value)}
                  placeholder="Describe your request in detail. Include any relevant codes or dates."
                />
              </div>

              {/* Optional reference */}
              <div className={s.refRow}>
                <div className={s.formRow} style={{ flex: 1 }}>
                  <label className={s.formLabel}>Related to (optional)</label>
                  <select className={s.formSelect} value={cRefType} onChange={e => setCRefType(e.target.value)}>
                    <option value="">None</option>
                    <option value="MOVEMENT">Movement</option>
                    <option value="ANIMAL">Animal</option>
                    <option value="PREMISES">Premises</option>
                  </select>
                </div>
                {cRefType && (
                  <div className={s.formRow} style={{ flex: 1 }}>
                    <label className={s.formLabel}>Code</label>
                    <input
                      className={s.formInput}
                      value={cRefCode}
                      onChange={e => setCRefCode(e.target.value)}
                      placeholder={`e.g. ${cRefType === 'MOVEMENT' ? 'MOV-BAR-26-001234' : cRefType === 'ANIMAL' ? 'AN-BAR-001234' : 'PRM-BAR-001234'}`}
                    />
                  </div>
                )}
              </div>

              <div className={s.formRow}>
                <label className={s.formLabel}>Priority</label>
                <select className={s.formSelect} value={cPriority} onChange={e => setCPriority(e.target.value)}>
                  <option value="LOW">Low — not urgent</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High — needs attention</option>
                  <option value="URGENT">Urgent — critical issue</option>
                </select>
              </div>

              {cError && <div className={s.replyError}>{cError}</div>}

              <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
                <button
                  className={s.sendBtn}
                  style={{ background: '#0f2170', color: '#fff', border: 'none' }}
                  disabled={cSending || !cSubject.trim() || !cBody.trim()}
                  onClick={sendMessage}
                >
                  {cSending ? <Loader size={13} className={s.spin} /> : <Send size={13} />}
                  {' '}Send Message
                </button>
                <button className={s.cancelBtn} disabled={cSending} onClick={() => setComposing(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActionCenterPage;
