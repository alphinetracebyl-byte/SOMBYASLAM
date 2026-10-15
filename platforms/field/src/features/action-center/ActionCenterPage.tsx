import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Send, Loader, X, Inbox, RefreshCw, Plus, ExternalLink, Search, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import s from './action-center.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface UserResult {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  regionCode: string;
}

interface Reply {
  id: string;
  messageId: string;
  fromUserId: string;
  fromUserName: string;
  fromRole: string;
  body: string;
  createdAt: string;
}

const PRIORITY_CFG: Record<string, { bg: string; color: string; label: string }> = {
  LOW:    { bg: '#f3f4f6', color: '#6b7280', label: 'Low'    },
  NORMAL: { bg: '#f0f9ff', color: '#0369a1', label: 'Normal' },
  HIGH:   { bg: '#fffbeb', color: '#b45309', label: 'High'   },
  URGENT: { bg: '#fef2f2', color: '#b91c1c', label: 'Urgent' },
};

const STATUS_CFG: Record<string, { bg: string; color: string; label: string }> = {
  UNREAD:    { bg: '#fef9c3', color: '#92400e', label: 'Unread'    },
  READ:      { bg: '#f3f4f6', color: '#6b7280', label: 'Read'      },
  RESPONDED: { bg: '#f0fdf4', color: '#15803d', label: 'Responded' },
  CLOSED:    { bg: '#f3f4f6', color: '#374151', label: 'Closed'    },
};

const ROLES = [
  'FIELD_INSPECTOR', 'VETERINARY_OFFICER', 'MINISTRY_STAFF',
  'FARMER', 'QUARANTINE_OFFICER', 'CHECKPOINT_OFFICER', 'SLAUGHTERHOUSE_OFFICER',
];

function relTime(ts: string): string {
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ActionCenterPage(): JSX.Element {
  const navigate    = useNavigate();
  const { userId, roles, regionCode } = useAuthStore();
  const userRole    = roles[0] ?? 'FIELD_INSPECTOR';
  const roleLabel   = userRole.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  // Real Supabase auth UID (may differ from dev store userId)
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

  // ── Compose ────────────────────────────────────────────────────────────────
  const [composing,  setComposing]  = useState(false);
  const [cMode,      setCMode]      = useState<'role' | 'user'>('role');
  const [cSubject,   setCSubject]   = useState('');
  const [cBody,      setCBody]      = useState('');
  const [cToRole,    setCToRole]    = useState('');
  const [cToRegion,  setCToRegion]  = useState('');
  const [cPriority,  setCPriority]  = useState('NORMAL');
  const [cSending,   setCSending]   = useState(false);
  const [cError,     setCError]     = useState('');

  // Specific-user search
  const [cToUserId,      setCToUserId]      = useState('');
  const [cToUserName,    setCToUserName]    = useState('');
  const [cSearch,        setCSearch]        = useState('');
  const [cSearchResults, setCSearchResults] = useState<UserResult[]>([]);
  const [cSearching,     setCSearching]     = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // ── Reply thread ───────────────────────────────────────────────────────────
  const [replies,      setReplies]      = useState<Record<string, Reply[]>>({});
  const [replyText,    setReplyText]    = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replyError,   setReplyError]   = useState('');

  // ── Load messages ──────────────────────────────────────────────────────────
  const loadMessages = () => {
    if (!authUid) return;
    setLoading(true);

    let q = supabase
      .from('action_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (tab === 'inbox') q = q.or(`to_user_id.eq.${authUid},to_user_id.is.null`);
    else                 q = q.eq('from_user_id', authUid);

    void q.then(({ data }) => {
      setMessages((data ?? []).map(r => ({
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
      })));
      setLoading(false);
    });
  };

  useEffect(() => { loadMessages(); }, [authUid, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll replies while a message is expanded
  useEffect(() => {
    if (!selected) return;
    const id = setInterval(() => void loadReplies(selected), 10_000);
    return () => clearInterval(id);
  }, [selected]); // eslint-disable-line

  const unreadCount = messages.filter(m => m.status === 'UNREAD').length;

  // ── User search (debounced) ────────────────────────────────────────────────
  useEffect(() => {
    if (cToUserId || cSearch.trim().length < 2) { setCSearchResults([]); return; }
    const t = setTimeout(async () => {
      setCSearching(true);
      const { data } = await supabase.rpc('search_users', { p_query: cSearch.trim() });
      setCSearchResults((data ?? []).map((r: Record<string, unknown>) => ({
        userId:     r.user_id as string,
        fullName:   (r.full_name as string) ?? (r.email as string),
        email:      r.email as string,
        role:       r.role as string,
        regionCode: (r.region_code as string) ?? '',
      })));
      setCSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [cSearch, cToUserId]);

  // Close search results on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setCSearchResults([]);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

  // ── Mark read ──────────────────────────────────────────────────────────────
  const markRead = async (id: string) => {
    await supabase.from('action_messages').update({ status: 'READ' }).eq('id', id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'READ' } : m));
  };

  // ── Toggle expand ──────────────────────────────────────────────────────────
  const toggle = (msg: ActionMessage) => {
    const isOpening = selected !== msg.id;
    setSelected(prev => prev === msg.id ? null : msg.id);
    setReplyText('');
    setReplyError('');
    if (isOpening) {
      if (msg.status === 'UNREAD' && tab === 'inbox') void markRead(msg.id);
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
      from_user_name: roleLabel,
      from_role:      userRole,
      body:           replyText.trim(),
    });

    if (error) { setReplyError('Failed to send. Please try again.'); setReplySending(false); return; }

    void loadReplies(msg.id);
    setReplyText('');
    setReplySending(false);
  };

  // ── Mark closed ────────────────────────────────────────────────────────────
  const markClosed = async (id: string) => {
    await supabase.from('action_messages').update({ status: 'CLOSED' }).eq('id', id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'CLOSED' } : m));
  };

  // ── Send new message ───────────────────────────────────────────────────────
  const resetCompose = () => {
    setComposing(false);
    setCMode('role');
    setCSubject(''); setCBody(''); setCToRole(''); setCToRegion(''); setCPriority('NORMAL');
    setCToUserId(''); setCToUserName(''); setCSearch(''); setCSearchResults([]);
    setCError('');
  };

  const sendMessage = async () => {
    if (!authUid || !cSubject.trim() || !cBody.trim()) return;
    if (cMode === 'role' && !cToRole) return;
    if (cMode === 'user' && !cToUserId) return;
    setCSending(true);
    setCError('');

    const { data: msgCode } = await supabase.rpc('generate_message_code', { p_region: regionCode || 'SOM' });

    const { error } = await supabase.from('action_messages').insert({
      message_code:   (msgCode as string) || `MSG-${Date.now()}`,
      from_user_id:   authUid,
      from_user_name: roleLabel,
      from_role:      userRole,
      from_region:    regionCode || null,
      to_user_id:     cMode === 'user' ? cToUserId : null,
      to_user_name:   cMode === 'user' ? cToUserName : null,
      to_role:        cMode === 'role' ? cToRole : null,
      to_region:      cMode === 'role' ? (cToRegion || regionCode || null) : null,
      subject:        cSubject.trim(),
      body:           cBody.trim(),
      priority:       cPriority,
      status:         'UNREAD',
    });

    if (error) { setCError('Failed to send. Please try again.'); setCSending(false); return; }

    resetCompose();
    setCSending(false);
    if (tab === 'sent') loadMessages();
  };

  // ── Ref link navigation ────────────────────────────────────────────────────
  const goToRef = (refType: string, refCode: string) => {
    if (refType === 'MOVEMENT')          navigate(`/movements?code=${refCode}`);
    else if (refType === 'ANIMAL')       navigate(`/animals?code=${refCode}`);
    else if (refType === 'PREMISES')     navigate(`/premises?code=${refCode}`);
    else if (refType === 'INSPECTION')   navigate(`/inspections?code=${refCode}`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={s.page}>

      {/* Header */}
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Messenger</h1>
          <p className={s.sub}>Messages, information requests, and notifications</p>
        </div>
        <div className={s.headerRight}>
          <button className={s.refreshBtn} onClick={loadMessages} title="Refresh"><RefreshCw size={14} /></button>
          <button className={s.composeBtn} onClick={() => setComposing(true)}>
            <Plus size={14} style={{ marginRight: '0.35rem' }} /> Compose
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={s.tabs}>
        <button
          className={`${s.tab}${tab === 'inbox' ? ' ' + s.tabActive : ''}`}
          onClick={() => { setTab('inbox'); setSelected(null); }}
        >
          <Inbox size={14} style={{ marginRight: '0.35rem' }} />
          Inbox
          {unreadCount > 0 && tab === 'inbox' && <span className={s.unreadBadge}>{unreadCount}</span>}
        </button>
        <button
          className={`${s.tab}${tab === 'sent' ? ' ' + s.tabActive : ''}`}
          onClick={() => { setTab('sent'); setSelected(null); }}
        >
          <Send size={14} style={{ marginRight: '0.35rem' }} />
          Sent
        </button>
      </div>

      {/* Message list */}
      {loading ? (
        <div className={s.list}>{[1, 2, 3].map(i => <div key={i} className={s.skeleton} />)}</div>
      ) : messages.length === 0 ? (
        <div className={s.empty}>
          <MessageSquare size={44} strokeWidth={1.25} color="#cbd5e1" />
          <div className={s.emptyTitle}>{tab === 'inbox' ? 'No messages yet' : 'No sent messages'}</div>
          <div className={s.emptySub}>
            {tab === 'inbox'
              ? 'Information requests and messages addressed to you will appear here.'
              : 'Messages you compose will appear here.'}
          </div>
          <button className={s.composeBtn} style={{ marginTop: '0.5rem' }} onClick={() => setComposing(true)}>
            <Plus size={14} style={{ marginRight: '0.35rem' }} /> Compose New Message
          </button>
        </div>
      ) : (
        <div className={s.messageList}>
          {messages.map(msg => {
            const isExpanded = selected === msg.id;
            const stCfg  = STATUS_CFG[msg.status]   ?? STATUS_CFG.READ;
            const priCfg = PRIORITY_CFG[msg.priority] ?? PRIORITY_CFG.NORMAL;
            return (
              <div
                key={msg.id}
                className={`${s.msgRow}${msg.status === 'UNREAD' ? ' ' + s.msgRowUnread : ''}${isExpanded ? ' ' + s.msgRowOpen : ''}`}
                onClick={() => toggle(msg)}
              >
                <div className={s.msgTop}>
                  <div className={s.msgLeft}>
                    {msg.status === 'UNREAD' && tab === 'inbox' && <span className={s.unreadDot} />}
                    <div className={s.msgMeta}>
                      <span className={s.msgFrom}>
                        {tab === 'inbox' ? msg.fromUserName : (msg.toUserName || msg.toRole?.replace(/_/g, ' ') || 'Broadcast')}
                      </span>
                      {msg.fromRole && tab === 'inbox' && (
                        <span className={s.msgRole}>{msg.fromRole.replace(/_/g, ' ')}</span>
                      )}
                      {msg.fromRegion && <span className={s.msgCode}>{msg.fromRegion}</span>}
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
                    <span style={{ ...priCfg, fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 10 }}>
                      {priCfg.label}
                    </span>
                    <span style={{ ...stCfg, fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 10 }}>
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

                    {msg.status !== 'CLOSED' && (
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

      {/* ── Compose modal ─────────────────────────────────────────────────────── */}
      {composing && (
        <div className={s.overlay} onClick={() => !cSending && resetCompose()}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHead}>
              <div className={s.modalTitle}>New Message</div>
              <button className={s.closeBtn} onClick={() => !cSending && resetCompose()}><X size={18} /></button>
            </div>
            <div className={s.modalBody}>

              {/* Send-to mode */}
              <div className={s.formRow}>
                <label className={s.formLabel}>Send To</label>
                <div className={s.modeToggle}>
                  <button
                    type="button"
                    className={`${s.modeBtn}${cMode === 'role' ? ' ' + s.modeBtnActive : ''}`}
                    onClick={() => { setCMode('role'); setCToUserId(''); setCToUserName(''); setCSearch(''); setCSearchResults([]); }}
                  >
                    Broadcast to Role
                  </button>
                  <button
                    type="button"
                    className={`${s.modeBtn}${cMode === 'user' ? ' ' + s.modeBtnActive : ''}`}
                    onClick={() => { setCMode('user'); setCToRole(''); setCToRegion(''); }}
                  >
                    Specific Account
                  </button>
                </div>
              </div>

              {cMode === 'role' ? (
                <>
                  <div className={s.formRow}>
                    <label className={s.formLabel}>Role *</label>
                    <select className={s.formSelect} value={cToRole} onChange={e => setCToRole(e.target.value)}>
                      <option value="">Select role…</option>
                      {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div className={s.formRow}>
                    <label className={s.formLabel}>Region <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional — leave blank for all regions)</span></label>
                    <input
                      className={s.formInput}
                      value={cToRegion}
                      onChange={e => setCToRegion(e.target.value.toUpperCase())}
                      placeholder={regionCode || 'e.g. BAR'}
                      maxLength={6}
                    />
                  </div>
                </>
              ) : (
                <div className={s.formRow}>
                  <label className={s.formLabel}>Search Account *</label>
                  <div className={s.searchWrap} ref={searchRef}>
                    {cToUserId ? (
                      <div className={s.selectedUser}>
                        <span>{cToUserName}</span>
                        <button type="button" onClick={() => { setCToUserId(''); setCToUserName(''); }}>×</button>
                      </div>
                    ) : (
                      <>
                        <div style={{ position: 'relative' }}>
                          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                          <input
                            className={s.formInput}
                            style={{ paddingLeft: '2.25rem' }}
                            value={cSearch}
                            onChange={e => setCSearch(e.target.value)}
                            placeholder="Search by name or email…"
                            autoFocus
                          />
                        </div>
                        {cSearching && (
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', padding: '0.375rem 0' }}>Searching…</div>
                        )}
                        {cSearchResults.length > 0 && (
                          <div className={s.searchResults}>
                            {cSearchResults.map(r => (
                              <button
                                key={r.userId}
                                type="button"
                                className={s.searchResultItem}
                                onClick={() => { setCToUserId(r.userId); setCToUserName(r.fullName || r.email); setCSearch(''); setCSearchResults([]); }}
                              >
                                <span>{r.fullName || r.email}</span>
                                <span>{r.role.replace(/_/g, ' ')}{r.regionCode ? ` · ${r.regionCode}` : ''}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {!cSearching && cSearch.trim().length >= 2 && cSearchResults.length === 0 && (
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af', padding: '0.375rem 0' }}>No active accounts found</div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className={s.formRow}>
                <label className={s.formLabel}>Priority</label>
                <select className={s.formSelect} value={cPriority} onChange={e => setCPriority(e.target.value)}>
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div className={s.formRow}>
                <label className={s.formLabel}>Subject *</label>
                <input
                  className={s.formInput}
                  value={cSubject}
                  onChange={e => setCSubject(e.target.value)}
                  placeholder="Message subject"
                />
              </div>
              <div className={s.formRow}>
                <label className={s.formLabel}>Message *</label>
                <textarea
                  className={s.formTextarea}
                  rows={5}
                  value={cBody}
                  onChange={e => setCBody(e.target.value)}
                  placeholder="Type your message here…"
                />
              </div>
              {cError && <div className={s.replyError}>{cError}</div>}
              <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
                <button
                  className={s.sendBtn}
                  disabled={
                    cSending || !cSubject.trim() || !cBody.trim() ||
                    (cMode === 'role' && !cToRole) ||
                    (cMode === 'user' && !cToUserId)
                  }
                  onClick={sendMessage}
                >
                  {cSending ? <Loader size={13} className={s.spin} /> : <Send size={13} />}
                  {' '}Send Message
                </button>
                <button className={s.cancelBtn} disabled={cSending} onClick={resetCompose}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActionCenterPage;
