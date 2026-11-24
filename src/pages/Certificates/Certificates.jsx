import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useSelector } from 'react-redux';
import { AlertTriangle, Award, BadgeCheck, Ban, Clock3, HandHeart, Phone, Printer, Undo2 } from 'lucide-react';
import { certificatesApi, groupsApi } from '@api/endpoints';
import { useApi, useCampus, useCan, useGroupName } from '@helpers/hooks';
import { formatDate, fromNow, fullName, money, todayInput } from '@helpers/format';
import { toast } from '@helpers/toast';
import { Badge, Button, Card, Dropdown, EmptyState, Field, Loader, Modal, PageHeader, SearchInput, Segmented, StatCard, Tabs } from '@components';
import { CAN } from '@data/roles';
import { CERTIFICATE_RECEIVERS } from '@data/enums';
import styles from './Certificates.module.scss';

const DAY = 24 * 3600 * 1000;
const waitingDays = (c) => Math.floor((Date.now() - new Date(c.issuedAt)) / DAY);
const phoneOf = (s) => s?.phone || s?.guardian?.phone;

// "Owes 12 000 DZD" when the student still has something to pay (many schools hold the certificate until then).
const Balance = ({ balance }) =>
  balance?.due > 0 ? (
    <span className={balance.overdue > 0 ? 'fg-red fw-600' : 'fg-amber fw-600'} title={balance.overdue > 0 ? `${money(balance.overdue)} overdue` : 'Not overdue yet'}>
      Owes {money(balance.due)}
    </span>
  ) : (
    <span className="fg-green fs-13">Paid up</span>
  );

const Score = ({ score, mention }) =>
  score === null || score === undefined ? <span className="fg-subtle fs-13">No final exam</span> : <><b>{score}%</b> {mention && <Badge tone={score >= 80 ? 'green' : score >= 70 ? 'blue' : score >= 60 ? 'cyan' : 'gray'}>{mention}</Badge>}</>;

const Student = ({ s, extra }) => (
  <>
    <Link to={`/students/${s?._id}`} className="fw-700 fg-ink" onClick={(e) => e.stopPropagation()}>{fullName(s)}</Link>
    <div className="fs-12 fg-subtle">{s?.studentNumber}{extra}</div>
  </>
);

// Who collected it: the student, a parent (name pre-filled from the registration form) or someone else.
const HandOverModal = ({ cert, onClose, onDone }) => {
  const [f, setF] = useState({ receiver: 'student', handedOverTo: '', handedOverAt: todayInput(), notes: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (cert) setF({ receiver: 'student', handedOverTo: '', handedOverAt: todayInput(), notes: '' }); }, [cert]);
  if (!cert) return null;
  const setReceiver = (receiver) => setF((x) => ({ ...x, receiver, handedOverTo: receiver === 'guardian' ? cert.student?.guardian?.name ?? '' : '' }));
  const save = async () => {
    setSaving(true);
    try {
      await certificatesApi.handover(cert._id, f);
      toast.success('Certificate handed over', `${cert.number} · ${cert.studentName}`);
      onDone();
      onClose();
    } catch (err) { toast.error(err); } finally { setSaving(false); }
  };
  const needsName = f.receiver !== 'student';
  return (
    <Modal open onClose={onClose} title="Hand over the certificate" subtitle={`${cert.number} · ${cert.studentName} · ${cert.levelName}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={HandHeart} loading={saving} disabled={needsName && !f.handedOverTo.trim()} onClick={save}>Hand over</Button></>}>
      {cert.balance?.due > 0 && (
        <div className={styles.warn}>
          <AlertTriangle size={18} />
          <div><b>{cert.studentName} still owes {money(cert.balance.due)}</b>{cert.balance.overdue > 0 && <> ({money(cert.balance.overdue)} overdue)</>}. Check with the school before giving the certificate.</div>
        </div>
      )}
      <Field label="Collected by">
        <Segmented value={f.receiver} onChange={setReceiver} options={Object.entries(CERTIFICATE_RECEIVERS).map(([value, label]) => ({ value, label }))} />
      </Field>
      {needsName && (
        <Field label="Their name" required hint={f.receiver === 'other' ? 'Ask for an ID and write the name as on it.' : undefined}>
          <input className="form-control" value={f.handedOverTo} onChange={(e) => setF({ ...f, handedOverTo: e.target.value })} autoFocus />
        </Field>
      )}
      <div className="row">
        <div className="col-sm-5"><Field label="Date"><input type="date" className="form-control" value={f.handedOverAt} onChange={(e) => setF({ ...f, handedOverAt: e.target.value })} /></Field></div>
        <div className="col-sm-7"><Field label="Note"><input className="form-control" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Optional" /></Field></div>
      </div>
    </Modal>
  );
};

const RevokeModal = ({ cert, onClose, onDone }) => {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  if (!cert) return null;
  const save = async () => {
    setSaving(true);
    try {
      await certificatesApi.revoke(cert._id, reason);
      toast.success('Certificate revoked', 'The QR code now shows it as revoked. The student is back in "To issue".');
      onDone();
      onClose();
    } catch (err) { toast.error(err); } finally { setSaving(false); }
  };
  return (
    <Modal open onClose={onClose} title={`Revoke ${cert.number}?`} subtitle="For a certificate issued by mistake (wrong name, wrong level…). It can't be undone."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" loading={saving} disabled={!reason.trim()} onClick={save}>Revoke</Button></>}>
      <Field label="Reason" required><input className="form-control" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Typo in the name, issued twice…" autoFocus /></Field>
    </Modal>
  );
};

const Certificates = () => {
  const navigate = useNavigate();
  const campus = useCampus();
  const groupName = useGroupName();
  const programs = useSelector((s) => s.refs.programs);
  const canRevoke = useCan(CAN.revokeCertificates);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'issue';
  const [q, setQ] = useState(params.get('q') ?? '');
  const [program, setProgram] = useState('');
  const [group, setGroup] = useState('');
  const [selected, setSelected] = useState([]);
  const [handing, setHanding] = useState(null);
  const [revoking, setRevoking] = useState(null);
  const [busy, setBusy] = useState(false);

  const filters = { campus, program, group, q: q.trim().length >= 2 ? q.trim() : '' };
  const { data: stats, reload: reloadStats } = useApi(() => certificatesApi.stats({ campus }), [campus]);
  const { data: rows, loading, reload } = useApi(
    () => (tab === 'issue' ? certificatesApi.candidates(filters) : certificatesApi.list({ ...filters, status: tab })),
    [tab, campus, program, group, filters.q],
  );
  const { data: groups } = useApi(() => groupsApi.list({ status: 'ongoing,completed', campus }), [campus]);
  useEffect(() => setSelected([]), [tab, campus, program, group, filters.q]);

  const setTab = (t) => setParams((p) => { p.set('tab', t); return p; });
  const refresh = () => { reload(); reloadStats(); };
  const list = rows ?? [];
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allOn = list.length > 0 && list.every((r) => selected.includes(r._id));
  const toggleAll = () => setSelected(allOn ? [] : list.map((r) => r._id));

  const print = (ids) => navigate(`/certificates/print?ids=${ids.join(',')}`);
  const issue = async (enrollmentIds) => {
    setBusy(true);
    try {
      const { ids } = await certificatesApi.issue(enrollmentIds);
      toast.success(`${ids.length} certificate${ids.length > 1 ? 's' : ''} issued`, 'Opening them for printing.');
      print(ids);
    } catch (err) { toast.error(err); } finally { setBusy(false); }
  };
  const undo = async (c) => {
    try {
      await certificatesApi.undoHandover(c._id);
      toast.success('Hand-over undone', 'Back in "Ready to collect".');
      refresh();
    } catch (err) { toast.error(err); }
  };

  const tabs = [
    { key: 'issue', label: 'To issue', icon: Award, count: stats?.toIssue },
    { key: 'ready', label: 'Ready to collect', icon: Clock3, count: stats?.ready },
    { key: 'handed', label: 'Handed over', icon: BadgeCheck },
    { key: 'revoked', label: 'Revoked', icon: Ban },
  ];
  const selectBox = (id) => <input type="checkbox" className="form-check-input m-0" checked={selected.includes(id)} onChange={() => toggle(id)} onClick={(e) => e.stopPropagation()} aria-label="Select" />;
  const headBox = <input type="checkbox" className="form-check-input m-0" checked={allOn} onChange={toggleAll} aria-label="Select all" />;

  return (
    <>
      <PageHeader title="Certificates" subtitle="Students who passed a level: issue and print their certificate, then record who collected it." />
      <div className="row g-3 mb-3">
        <div className="col-6 col-lg-3"><StatCard label="To issue" value={stats?.toIssue ?? '—'} icon={Award} tone="blue" hint="passed, no certificate yet" onClick={() => setTab('issue')} /></div>
        <div className="col-6 col-lg-3"><StatCard label="Ready to collect" value={stats?.ready ?? '—'} icon={Clock3} tone="amber" hint="printed, waiting at the desk" onClick={() => setTab('ready')} /></div>
        <div className="col-6 col-lg-3"><StatCard label="Waiting 30+ days" value={stats?.waitingLong ?? '—'} icon={Phone} tone="red" hint="worth a phone call" onClick={() => setTab('ready')} /></div>
        <div className="col-6 col-lg-3"><StatCard label="Handed over" value={stats?.handedThisMonth ?? '—'} icon={BadgeCheck} tone="green" hint="this month" onClick={() => setTab('handed')} /></div>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} className="mb-3" />
      <div className="d-flex gap-2 flex-wrap mb-3">
        <SearchInput value={q} onChange={setQ} placeholder={tab === 'issue' ? 'Student name or number…' : 'Student, number or CERT-…'} style={{ minWidth: 260 }} />
        <select className="form-select" style={{ maxWidth: 220 }} value={program} onChange={(e) => { setProgram(e.target.value); setGroup(''); }}>
          <option value="">All programs</option>
          {programs.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        <select className="form-select" style={{ maxWidth: 300 }} value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">All groups</option>
          {(groups?.items ?? groups ?? []).filter((g) => !program || (g.program?._id ?? g.program) === program).map((g) => <option key={g._id} value={g._id}>{groupName(g)}</option>)}
        </select>
      </div>

      {selected.length > 0 && (
        <div className={styles.bulk}>
          <b>{selected.length} selected</b>
          {tab === 'issue' && <Button icon={Printer} loading={busy} onClick={() => issue(selected)}>Issue &amp; print {selected.length}</Button>}
          {tab !== 'issue' && tab !== 'revoked' && <Button icon={Printer} onClick={() => print(selected)}>Print {selected.length}</Button>}
          <Button variant="ghost" onClick={() => setSelected([])}>Clear</Button>
        </div>
      )}

      <Card padded={false}>
        {loading && !rows ? <Loader /> : !list.length ? (
          <EmptyState
            icon={tab === 'issue' ? Award : tab === 'ready' ? Clock3 : tab === 'handed' ? BadgeCheck : Ban}
            title={{ issue: 'Nobody waiting for a certificate', ready: 'No certificate waiting at the desk', handed: 'No certificate handed over yet', revoked: 'No revoked certificate' }[tab]}
            message={tab === 'issue' ? 'Students appear here once they pass a level (final exam, or "Mark passed" on their profile).' : undefined}
          />
        ) : (
          <div className="table-scroll">
            <table className="table-eltc">
              {tab === 'issue' && (
                <>
                  <thead><tr><th style={{ width: 36 }}>{headBox}</th><th>Student</th><th>Level passed</th><th>Finished</th><th>Final score</th><th>Balance</th><th /></tr></thead>
                  <tbody>
                    {list.map((r) => (
                      <tr key={r._id} className={selected.includes(r._id) ? styles.on : ''} onClick={() => toggle(r._id)}>
                        <td>{selectBox(r._id)}</td>
                        <td><Student s={r.student} /></td>
                        <td><div className="fw-600">{r.program?.name} · {r.levelName}</div><div className="fs-12 fg-subtle">{groupName({ ...r.group, campus: r.campus })}</div></td>
                        <td><div>{formatDate(r.finishedAt)}</div><div className="fs-12 fg-subtle">{fromNow(r.finishedAt)}</div></td>
                        <td><Score score={r.finalScore} mention={r.mention} /></td>
                        <td><Balance balance={r.balance} /></td>
                        <td className="text-end"><Button size="sm" variant="soft" icon={Printer} onClick={(e) => { e.stopPropagation(); issue([r._id]); }}>Issue</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
              {tab === 'ready' && (
                <>
                  <thead><tr><th style={{ width: 36 }}>{headBox}</th><th>Certificate</th><th>Student</th><th>Waiting</th><th>Balance</th><th /></tr></thead>
                  <tbody>
                    {list.map((c) => {
                      const days = waitingDays(c);
                      const phone = phoneOf(c.student);
                      return (
                        <tr key={c._id} className={selected.includes(c._id) ? styles.on : ''} onClick={() => toggle(c._id)}>
                          <td>{selectBox(c._id)}</td>
                          <td><div className="fw-700 fg-ink">{c.number}</div><div className="fs-12 fg-subtle">{c.programName} · {c.levelName}</div></td>
                          <td><Student s={c.student} extra={phone && <> · <a href={`tel:${phone}`} onClick={(e) => e.stopPropagation()}>{phone}</a></>} /></td>
                          <td>
                            <div className={days >= 30 ? 'fg-red fw-600' : days >= 14 ? 'fg-amber fw-600' : ''}>{days === 0 ? 'Since today' : `${days} day${days > 1 ? 's' : ''}`}</div>
                            <div className="fs-12 fg-subtle">issued {formatDate(c.issuedAt)}{c.printCount ? ` · printed ${c.printCount}×` : ' · not printed yet'}</div>
                          </td>
                          <td><Balance balance={c.balance} /></td>
                          <td className="text-end text-nowrap" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="ghost" icon={Printer} onClick={() => print([c._id])} aria-label="Print" />
                            <Button size="sm" variant="soft" icon={HandHeart} onClick={() => setHanding(c)}>Hand over</Button>
                            {canRevoke && <Dropdown trigger={<Button size="sm" variant="ghost">•••</Button>} items={[{ label: 'Revoke…', icon: Ban, danger: true, onClick: () => setRevoking(c) }]} />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </>
              )}
              {tab === 'handed' && (
                <>
                  <thead><tr><th style={{ width: 36 }}>{headBox}</th><th>Certificate</th><th>Student</th><th>Handed over</th><th>Collected by</th><th /></tr></thead>
                  <tbody>
                    {list.map((c) => (
                      <tr key={c._id} className={selected.includes(c._id) ? styles.on : ''} onClick={() => toggle(c._id)}>
                        <td>{selectBox(c._id)}</td>
                        <td><div className="fw-700 fg-ink">{c.number}</div><div className="fs-12 fg-subtle">{c.programName} · {c.levelName}</div></td>
                        <td><Student s={c.student} /></td>
                        <td><div>{formatDate(c.handedOverAt)}</div><div className="fs-12 fg-subtle">by {fullName(c.handedOverBy) || '—'}</div></td>
                        <td><div className="fw-600">{c.handedOverTo}</div><div className="fs-12 fg-subtle">{CERTIFICATE_RECEIVERS[c.receiver]}{c.notes ? ` · ${c.notes}` : ''}</div></td>
                        <td className="text-end text-nowrap" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" icon={Printer} onClick={() => print([c._id])} title="Reprint (same number)" aria-label="Reprint" />
                          <Dropdown
                            trigger={<Button size="sm" variant="ghost">•••</Button>}
                            items={[
                              { label: 'Undo hand-over', icon: Undo2, onClick: () => undo(c) },
                              { label: 'Revoke…', icon: Ban, danger: true, onClick: () => setRevoking(c), hidden: !canRevoke },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
              {tab === 'revoked' && (
                <>
                  <thead><tr><th>Certificate</th><th>Student</th><th>Revoked</th><th>Reason</th></tr></thead>
                  <tbody>
                    {list.map((c) => (
                      <tr key={c._id}>
                        <td><div className="fw-700 fg-ink">{c.number}</div><div className="fs-12 fg-subtle">{c.programName} · {c.levelName}</div></td>
                        <td><Student s={c.student} /></td>
                        <td>{formatDate(c.revokedAt)}</td>
                        <td className="fg-muted">{c.revokedReason}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </table>
          </div>
        )}
      </Card>

      {handing && <HandOverModal cert={handing} onClose={() => setHanding(null)} onDone={refresh} />}
      {revoking && <RevokeModal cert={revoking} onClose={() => setRevoking(null)} onDone={refresh} />}
    </>
  );
};

export default Certificates;
