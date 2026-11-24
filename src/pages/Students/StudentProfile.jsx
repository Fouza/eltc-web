import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import {
  ArrowRightLeft, CalendarCheck2, FilePlus2, GraduationCap, Layers, LogOut, Mail, MapPin, Pencil, Phone, Plus, Printer, Trash2, UserRound, Wallet,
} from 'lucide-react';
import { enrollmentsApi, studentsApi, groupsApi } from '@api/endpoints';
import { useApi, useCan, useGroupName } from '@helpers/hooks';
import { age, formatDate, formatDay, fullName, money, percent, scheduleLabel, levelName } from '@helpers/format';
import { toast } from '@helpers/toast';
import { useConfirm } from '@context/ConfirmContext';
import { Avatar, Badge, Button, Card, Dropdown, EmptyState, Field, Loader, Modal, PageHeader, StatusBadge, Tabs } from '@components';
import { CAN } from '@data/roles';
import { ATTENDANCE_STATUS, CERTIFICATE_STATUS, ENROLLMENT_STATUS, EXAM_TYPES, FINAL_RESULTS, INVOICE_STATUS, PAYMENT_METHODS, STUDENT_STATUS } from '@data/enums';
import RecordPaymentModal from '@pages/Payments/RecordPaymentModal';
import InvoiceFormModal from '@pages/Payments/InvoiceFormModal';
import EnrollModal from './EnrollModal';
import styles from './Students.module.scss';

const TransferModal = ({ enrollment, onClose, onSaved }) => {
  const [groupId, setGroupId] = useState('');
  const { data: groups } = useApi(() => groupsApi.list({ status: 'ongoing,planned', program: enrollment?.program?._id }), [enrollment?._id], { skip: !enrollment });
  const save = async () => {
    try {
      await enrollmentsApi.transfer(enrollment._id, groupId);
      toast.success('Student transferred', 'Open invoices follow the student.');
      onSaved();
      onClose();
    } catch (err) { toast.error(err); }
  };
  return (
    <Modal open={Boolean(enrollment)} onClose={onClose} title="Change group" subtitle="Another schedule, teacher or campus for the same program." footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!groupId} onClick={save}>Transfer</Button></>}>
      <Field label="New group">
        <select className="form-select" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">Choose…</option>
          {groups?.filter((g) => g._id !== enrollment?.group?._id).map((g) => (
            <option key={g._id} value={g._id}>{g.name} — {levelName(g.levelNumber, g.program)} · {g.campus?.code} · {scheduleLabel(g.schedule)} · {g.enrolledCount}/{g.capacity}</option>
          ))}
        </select>
      </Field>
    </Modal>
  );
};

const InfoRow = ({ label, children }) => (
  <div className={styles.infoRow}>
    <span>{label}</span>
    <div>{children || <span className="fg-subtle">—</span>}</div>
  </div>
);

const StudentProfile = () => {
  const groupName = useGroupName();
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'overview';
  const [enrolling, setEnrolling] = useState(params.get('enroll') === '1');
  const [paying, setPaying] = useState(null);
  const [invoicing, setInvoicing] = useState(false);
  const [transferring, setTransferring] = useState(null);
  const canEdit = useCan(CAN.manageStudents);
  const canEnroll = useCan(CAN.manageEnrollments);
  const canPay = useCan(CAN.recordPayments);
  const canInvoice = useCan(CAN.manageInvoices);
  const canDelete = useCan(CAN.deleteStudents);
  const { data, loading, reload } = useApi(() => studentsApi.get(id), [id]);

  if (loading && !data) return <Loader full />;
  if (!data) return <EmptyState title="Student not found" />;
  const { student: s, enrollments, invoices, payments, finance, attendance, grades, certificates = [] } = data;
  const certificateOf = (e) => certificates.find((c) => c.enrollment === e._id && c.status !== 'revoked');
  const active = enrollments.filter((e) => e.status === 'active');
  const setTab = (t) => setParams({ tab: t });

  const leaveGroup = async (e) => {
    if (!(await confirm({ title: `Remove from ${e.group?.name}?`, message: 'The student leaves the group. The current 4-week block stays due; the blocks that haven\'t started yet are cancelled.', danger: true, confirmLabel: 'Remove' }))) return;
    try {
      await enrollmentsApi.update(e._id, { status: 'dropped' });
      toast.success('Student removed from the group');
      reload();
    } catch (err) { toast.error(err); }
  };
  const setResult = async (e, finalResult) => {
    await enrollmentsApi.update(e._id, { finalResult });
    reload();
  };
  const remove = async () => {
    if (!(await confirm({ title: `Delete ${fullName(s)}?`, message: 'Only for duplicates or mistakes. This deletes enrollments, invoices, attendance and grades. A student with payments cannot be deleted.', danger: true, confirmLabel: 'Delete for good' }))) return;
    try {
      await studentsApi.remove(id);
      toast.success('Student deleted');
      navigate('/students');
    } catch (err) { toast.error(err); }
  };

  return (
    <>
      <PageHeader breadcrumb={[{ label: 'Students', to: '/students' }, { label: fullName(s) }]} title="" />
      <div className={styles.profileHead}>
        <div className="d-flex gap-3 align-items-center min-w-0">
          <Avatar person={s} size={72} />
          <div className="min-w-0">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <h1 className={styles.name}>{fullName(s)}</h1>
              <StatusBadge map={STUDENT_STATUS} value={s.status} />
            </div>
            <div className={styles.meta}>
              <span>{s.studentNumber}</span>
              {s.birthDate && <span>{age(s.birthDate)} years old</span>}
              <span><MapPin size={14} /> {s.campus?.name}</span>
              {(s.phone || s.guardian?.phone) && <a href={`tel:${s.phone ?? s.guardian.phone}`}><Phone size={14} /> {s.phone ?? `${s.guardian.phone} (${s.guardian.relation ?? 'guardian'})`}</a>}
              {s.email && <a href={`mailto:${s.email}`}><Mail size={14} /> {s.email}</a>}
            </div>
          </div>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {canEdit && <Button variant="secondary" icon={Pencil} onClick={() => navigate(`/students/${id}/edit`)}>Edit</Button>}
          {canPay && finance?.due > 0 && <Button variant="soft" icon={Wallet} onClick={() => setPaying({})}>Record payment</Button>}
          {canEnroll && <Button icon={Plus} onClick={() => setEnrolling(true)}>Enroll in a group</Button>}
          {canDelete && <Dropdown trigger={<Button variant="ghost">•••</Button>} items={[{ label: 'Delete student', icon: Trash2, danger: true, onClick: remove }]} />}
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-6 col-lg-3"><div className={styles.mini}><Layers size={18} className="fg-blue" /><div><span>Current groups</span><b>{active.length}</b></div></div></div>
        <div className="col-6 col-lg-3"><div className={styles.mini}><CalendarCheck2 size={18} className="fg-green" /><div><span>Attendance</span><b>{percent(attendance.rate)}</b></div></div></div>
        {finance && (
          <>
            <div className="col-6 col-lg-3"><div className={styles.mini}><Wallet size={18} className="fg-amber" /><div><span>Still to pay</span><b>{money(finance.due)}</b></div></div></div>
            <div className="col-6 col-lg-3"><div className={`${styles.mini} ${finance.overdue > 0 ? styles.miniDanger : ''}`}><Wallet size={18} className="fg-red" /><div><span>Overdue</span><b>{money(finance.overdue)}</b></div></div></div>
          </>
        )}
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'overview', label: 'Groups', icon: Layers, count: enrollments.length },
          ...(finance ? [{ key: 'payments', label: 'Payments', icon: Wallet, count: invoices.length }] : []),
          { key: 'attendance', label: 'Attendance', icon: CalendarCheck2, count: attendance.total },
          { key: 'grades', label: 'Grades', icon: GraduationCap, count: grades.length },
          { key: 'info', label: 'Registration form', icon: UserRound },
        ]}
      />

      {tab === 'overview' && (
        enrollments.length ? (
          <div className="row g-3">
            {enrollments.map((e) => (
              <div key={e._id} className="col-lg-6">
                <Card className={e.status !== 'active' ? styles.faded : ''}>
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div className="min-w-0">
                      <Link to={`/groups/${e.group?._id}`} className="fw-800 fs-15 fg-ink">{groupName(e.group)}</Link>
                      <div className="fs-13 fg-muted">{e.program?.name} · {levelName(e.levelNumber, e.program)}</div>
                    </div>
                    <div className="d-flex gap-1">
                      <StatusBadge map={ENROLLMENT_STATUS} value={e.status} />
                      {e.finalResult !== 'pending' && <StatusBadge map={FINAL_RESULTS} value={e.finalResult} dot={false} />}
                    </div>
                  </div>
                  <div className={styles.enrollGrid}>
                    <InfoRow label="Schedule">{scheduleLabel(e.group?.schedule)}</InfoRow>
                    <InfoRow label="Teacher">{fullName(e.group?.teacher)}</InfoRow>
                    <InfoRow label="Campus">{e.group?.campus?.name}</InfoRow>
                    <InfoRow label="Dates">{formatDate(e.group?.startDate)} → {formatDate(e.group?.endDate)}</InfoRow>
                    <InfoRow label="Fee">{money(e.fee)}{e.discount > 0 && <span className="fg-green fs-12"> −{money(e.discount)} ({e.discountReason ?? 'discount'})</span>}</InfoRow>
                    {e.finalScore !== undefined && e.finalScore !== null && <InfoRow label="Final score">{e.finalScore}%</InfoRow>}
                    {e.finalResult === 'passed' && (
                      <InfoRow label="Certificate">
                        {certificateOf(e) ? (
                          <Link to={`/certificates?tab=${certificateOf(e).status}&q=${certificateOf(e).number}`}>
                            {certificateOf(e).number} · {CERTIFICATE_STATUS[certificateOf(e).status].label}
                          </Link>
                        ) : (
                          <Link to={`/certificates?q=${encodeURIComponent(s.lastName)}`}>Not issued yet</Link>
                        )}
                      </InfoRow>
                    )}
                  </div>
                  {canEnroll && e.status === 'active' && (
                    <div className="d-flex gap-2 flex-wrap mt-3">
                      <Button size="sm" variant="secondary" icon={ArrowRightLeft} onClick={() => setTransferring(e)}>Change group</Button>
                      <Button size="sm" variant="ghost" onClick={() => setResult(e, 'passed')}>Mark passed</Button>
                      <Button size="sm" variant="ghost" onClick={() => setResult(e, 'failed')}>Mark failed</Button>
                      <Button size="sm" variant="ghost" icon={LogOut} className="ms-auto" onClick={() => leaveGroup(e)}>Leaves the group</Button>
                    </div>
                  )}
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <Card><EmptyState icon={Layers} title="Not in a group yet" message={s.desiredProgram ? `On the waiting list for ${s.desiredProgram.name}${s.desiredLevel ? `, level ${s.desiredLevel}` : ''}.` : undefined} action={canEnroll && <Button icon={Plus} onClick={() => setEnrolling(true)}>Enroll in a group</Button>} /></Card>
        )
      )}

      {tab === 'payments' && finance && (
        <div className="row g-3">
          <div className="col-12">
            <Card title="Invoices & installments" padded={false} actions={canInvoice && <Button size="sm" variant="secondary" icon={FilePlus2} onClick={() => setInvoicing(true)}>Add a fee</Button>}>
              {invoices.length ? (
                <div className="table-scroll">
                  <table className="table-eltc">
                    <thead><tr><th>For</th><th>Due</th><th className="num">Amount</th><th className="num">Paid</th><th>Status</th><th /></tr></thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv._id}>
                          <td><div className="fw-600">{inv.kind === 'book' && <Badge tone="purple" className="me-1">Book</Badge>}{inv.label}</div><div className="fs-12 fg-subtle">{inv.number}{inv.kind === 'book' ? (inv.handedOverAt ? ' · given' : ' · not given yet') : ''}</div></td>
                          <td>{formatDate(inv.dueDate)}</td>
                          <td className="num">{money(inv.amount)}</td>
                          <td className="num">{money(inv.paidAmount)}</td>
                          <td><StatusBadge map={INVOICE_STATUS} value={inv.isOverdue ? 'overdue' : inv.status} /></td>
                          <td className="text-end">{canPay && ['unpaid', 'partial'].includes(inv.status) && <Button size="sm" variant="soft" onClick={() => setPaying({ invoice: inv })}>Collect</Button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyState compact title="No invoice" />}
            </Card>
          </div>
          <div className="col-12">
            <Card title="Payments received" subtitle={`Total paid: ${money(finance.paid)}`} padded={false}>
              {payments.length ? (
                <div className="table-scroll">
                  <table className="table-eltc">
                    <thead><tr><th>Receipt</th><th>Date</th><th>Method</th><th className="num">Amount</th><th>Received by</th><th /></tr></thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p._id}>
                          <td className="fw-600">{p.receiptNumber}</td>
                          <td>{formatDate(p.paidAt)}</td>
                          <td><Badge>{PAYMENT_METHODS[p.method]}</Badge></td>
                          <td className="num fw-700">{money(p.amount)}</td>
                          <td className="fg-muted">{fullName(p.receivedBy)}</td>
                          <td className="text-end"><Link to={`/payments/${p._id}/receipt`}><Button size="sm" variant="ghost" icon={Printer}>Receipt</Button></Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyState compact icon={Wallet} title="No payment yet" />}
            </Card>
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <Card padded={false} title="Attendance" subtitle={`${attendance.total} sessions · ${attendance.absences} absences · ${attendance.late} late`}>
          {attendance.sessions.length ? (
            <div className="table-scroll mt-3">
              <table className="table-eltc">
                <thead><tr><th>Date</th><th>Group</th><th>Lesson</th><th>Status</th></tr></thead>
                <tbody>
                  {attendance.sessions.map((a) => (
                    <tr key={a._id}>
                      <td className="fw-600">{formatDay(a.date)}</td>
                      <td>{a.group?.name}</td>
                      <td className="fg-muted">{a.topic}</td>
                      <td><StatusBadge map={ATTENDANCE_STATUS} value={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState compact icon={CalendarCheck2} title="No attendance recorded" />}
        </Card>
      )}

      {tab === 'grades' && (
        <Card padded={false} title="Exam results">
          {grades.length ? (
            <div className="table-scroll mt-3">
              <table className="table-eltc">
                <thead><tr><th>Exam</th><th>Type</th><th>Group</th><th>Date</th><th className="num">Score</th><th>Comment</th></tr></thead>
                <tbody>
                  {grades.map((g) => {
                    const passed = g.result?.score >= g.passScore;
                    return (
                      <tr key={g._id} className="clickable" onClick={() => navigate(`/exams/${g._id}`)}>
                        <td className="fw-600">{g.title}</td>
                        <td><StatusBadge map={EXAM_TYPES} value={g.type} dot={false} /></td>
                        <td>{g.group?.name}</td>
                        <td>{formatDate(g.date)}</td>
                        <td className="num">{g.result?.absent ? <Badge tone="gray">Absent</Badge> : <b className={passed ? 'fg-green' : 'fg-red'}>{g.result?.score}%</b>}</td>
                        <td className="fg-muted">{g.result?.comment}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <EmptyState compact icon={GraduationCap} title="No grade yet" />}
        </Card>
      )}

      {tab === 'info' && (
        <div className="row g-3">
          <div className="col-lg-6">
            <Card title="Student">
              <InfoRow label="Gender">{s.gender === 'female' ? 'Female' : s.gender === 'male' ? 'Male' : null}</InfoRow>
              <InfoRow label="Birth date">{s.birthDate && `${formatDate(s.birthDate)} (${age(s.birthDate)} y/o)`}</InfoRow>
              <InfoRow label="Place of birth">{s.birthPlace}</InfoRow>
              <InfoRow label="Occupation">{s.occupation}</InfoRow>
              <InfoRow label="Phone">{s.phone}</InfoRow>
              <InfoRow label="Email">{s.email}</InfoRow>
              <InfoRow label="Address">{[s.address, s.city].filter(Boolean).join(', ')}</InfoRow>
            </Card>
          </div>
          <div className="col-lg-6">
            <Card title="Guardian" className="mb-3">
              <InfoRow label="Name">{s.guardian?.name}{s.guardian?.relation && ` (${s.guardian.relation})`}</InfoRow>
              <InfoRow label="Phone">{s.guardian?.phone}</InfoRow>
              <InfoRow label="Email">{s.guardian?.email}</InfoRow>
            </Card>
            <Card title="Registration">
              <InfoRow label="Registered">{formatDate(s.registeredAt)} {s.createdBy && `by ${fullName(s.createdBy)}`}</InfoRow>
              <InfoRow label="Source">{s.source}</InfoRow>
              <InfoRow label="Wanted">{s.desiredProgram && `${s.desiredProgram.name}${s.desiredLevel ? ` · ${levelName(s.desiredLevel, s.desiredProgram)}` : ''}`}</InfoRow>
              <InfoRow label="Preferred times">{s.preferredSlots}</InfoRow>
              <InfoRow label="Notes">{s.notes}</InfoRow>
            </Card>
          </div>
        </div>
      )}

      <EnrollModal open={enrolling} student={s} onClose={() => { setEnrolling(false); if (params.get('enroll')) setParams({}); }} onSaved={reload} />
      <RecordPaymentModal open={Boolean(paying)} student={s} invoice={paying?.invoice} onClose={() => setPaying(null)} onSaved={reload} />
      <InvoiceFormModal open={invoicing} student={s} onClose={() => setInvoicing(false)} onSaved={reload} />
      <TransferModal enrollment={transferring} onClose={() => setTransferring(null)} onSaved={reload} />
    </>
  );
};

export default StudentProfile;
