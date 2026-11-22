import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  ArrowUpCircle, CalendarDays, ClipboardCheck, DoorOpen, GraduationCap, MapPin, Pencil, Plus, Trash2, UserRound, Users,
} from 'lucide-react';
import { groupsApi } from '@api/endpoints';
import { useApi, useCan, useGroupName } from '@helpers/hooks';
import { formatDate, formatDay, fullName, money, percent, scheduleLabel, levelName } from '@helpers/format';
import { toast } from '@helpers/toast';
import { useConfirm } from '@context/ConfirmContext';
import { Avatar, Badge, Button, Card, Dropdown, EmptyState, Loader, PageHeader, ProgressBar, StatusBadge, Tabs } from '@components';
import { CAN } from '@data/roles';
import { ATTENDANCE_STATUS, ENROLLMENT_STATUS, FINAL_RESULTS, GROUP_STATUS } from '@data/enums';
import EnrollModal from '@pages/Students/EnrollModal';
import ExamsTable from '@pages/Exams/ExamsTable';
import GroupFormModal, { suggestName } from './GroupFormModal';
import PromoteModal from './PromoteModal';
import styles from './Groups.module.scss';

// Name for the next-level group: swap the level name in the current name, else suggest a fresh one.
const nextGroupName = (g) => {
  if (g.name === suggestName(g.program, g.levelNumber, g.sessions)) return suggestName(g.program, g.levelNumber + 1, g.sessions);
  const current = g.level?.name ?? levelName(g.levelNumber, g.program);
  const next = levelName(g.levelNumber + 1, g.program);
  return current && g.name.includes(current) ? g.name.replace(current, next) : suggestName(g.program, g.levelNumber + 1, g.sessions);
};

const AttendanceMatrix = ({ groupId, roster }) => {
  const { data: sheets, loading } = useApi(() => groupsApi.attendance(groupId), [groupId]);
  if (loading) return <Loader />;
  if (!sheets?.length) return <EmptyState compact icon={ClipboardCheck} title="No attendance recorded yet" />;
  const shown = sheets.slice(-16);
  const byKey = {};
  shown.forEach((s) => s.entries.forEach((e) => { byKey[`${s._id}-${e.student}`] = e.status; }));
  return (
    <div className="table-scroll">
      <table className="table-eltc compact">
        <thead>
          <tr>
            <th>Student</th>
            {shown.map((s) => <th key={s._id} className="text-center" title={s.topic}>{formatDay(s.date)}</th>)}
            <th className="num">Rate</th>
          </tr>
        </thead>
        <tbody>
          {roster.filter((e) => e.status === 'active').map((e) => (
            <tr key={e._id}>
              <td className="fw-600 text-nowrap">{fullName(e.student)}</td>
              {shown.map((s) => {
                const st = byKey[`${s._id}-${e.student._id}`];
                return <td key={s._id} className="text-center"><span className={`${styles.cell} ${styles[st] ?? ''}`} title={ATTENDANCE_STATUS[st]?.label}>{ATTENDANCE_STATUS[st]?.short ?? '·'}</span></td>;
              })}
              <td className={`num fw-700 ${e.attendance?.rate < 75 ? 'fg-red' : ''}`}>{percent(e.attendance?.rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const GroupDetail = () => {
  const groupName = useGroupName();
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [tab, setTab] = useState('students');
  const [editing, setEditing] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [creatingNext, setCreatingNext] = useState(false);
  const canEdit = useCan(CAN.manageGroups);
  const canEnroll = useCan(CAN.manageEnrollments);
  const canFinance = useCan(CAN.viewFinance);
  const { data: g, loading, reload } = useApi(() => groupsApi.get(id), [id]);

  const stats = useMemo(() => {
    if (!g) return {};
    const active = g.roster.filter((e) => e.status === 'active');
    const rates = active.map((e) => e.attendance?.rate).filter((r) => r !== null && r !== undefined);
    return {
      active,
      attendance: rates.length ? Math.round(rates.reduce((s, r) => s + r, 0) / rates.length) : null,
      due: active.reduce((s, e) => s + e.balance, 0),
      overdue: active.filter((e) => e.overdue > 0).length,
    };
  }, [g]);

  if (loading && !g) return <Loader full />;
  if (!g) return <EmptyState title="Group not found" />;

  const setStatus = async (status) => {
    await groupsApi.update(id, { status });
    toast.success(`Group marked as ${GROUP_STATUS[status].label.toLowerCase()}`);
    reload();
  };
  const remove = async () => {
    if (!(await confirm({ title: `Delete ${g.name}?`, message: 'Only possible when no student was ever enrolled.', danger: true, confirmLabel: 'Delete' }))) return;
    try {
      await groupsApi.remove(id);
      toast.success('Group deleted');
      navigate('/groups');
    } catch (err) { toast.error(err); }
  };

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Groups', to: '/groups' }, { label: g.name }]}
        title={
          <span className="d-inline-flex align-items-center gap-2 flex-wrap">
            {groupName(g)} <StatusBadge map={GROUP_STATUS} value={g.status} />
          </span>
        }
        subtitle={`${g.program?.name} · ${g.level?.name ?? levelName(g.levelNumber, g.program)}`}
        actions={
          <>
            <Link to={`/attendance?group=${g._id}`}><Button variant="secondary" icon={ClipboardCheck}>Take attendance</Button></Link>
            {canEnroll && ['planned', 'ongoing'].includes(g.status) && <Button icon={Plus} onClick={() => setEnrolling(true)}>Add a student</Button>}
            {canEdit && (
              <Dropdown
                trigger={<Button variant="secondary">More</Button>}
                items={[
                  { label: 'Edit group', icon: Pencil, onClick: () => setEditing(true) },
                  { label: 'Promote to next level', icon: ArrowUpCircle, onClick: () => setPromoting(true), hidden: g.levelNumber >= (g.program?.levelsCount ?? 99) },
                  { label: 'Mark as ongoing', icon: CalendarDays, onClick: () => setStatus('ongoing'), hidden: g.status === 'ongoing' },
                  { label: 'Mark as completed', icon: GraduationCap, onClick: () => setStatus('completed'), hidden: g.status === 'completed' },
                  { label: 'Delete group', icon: Trash2, danger: true, onClick: remove, hidden: g.roster.length > 0 },
                ]}
              />
            )}
          </>
        }
      />

      <div className="row g-3 mb-3">
        <div className="col-lg-8">
          <Card className="h-100">
            <div className={styles.infoGrid}>
              <div><span><UserRound size={15} /> Teacher</span><b>{fullName(g.teacher) || '—'}</b>{g.teacher?.phone && <small>{g.teacher.phone}</small>}</div>
              <div><span><CalendarDays size={15} /> Schedule</span><b>{scheduleLabel(g.schedule)}</b></div>
              <div><span><MapPin size={15} /> Campus</span><b>{g.campus?.name}</b></div>
              <div><span><DoorOpen size={15} /> Room</span><b>{g.room || '—'}</b></div>
              <div><span>Dates</span><b>{formatDate(g.startDate)} → {formatDate(g.endDate)}</b></div>
              <div><span>Fee</span><b>{money(g.fee ?? g.level?.fee)}</b></div>
            </div>
            {g.notes && <div className="mt-3 fs-13 fg-muted">{g.notes}</div>}
          </Card>
        </div>
        <div className="col-lg-4">
          <Card className="h-100">
            <div className="d-flex justify-content-between align-items-end mb-2">
              <div><div className="fg-muted fw-600 fs-13">Seats taken</div><div className="fs-24 fw-800">{g.enrolledCount} <span className="fs-15 fg-subtle">/ {g.capacity}</span></div></div>
              <Users className="fg-blue" />
            </div>
            <ProgressBar value={g.enrolledCount} max={g.capacity} height={8} />
            <div className="d-flex justify-content-between mt-3 fs-13"><span className="fg-muted">Sessions held</span><b>{g.sessionsHeld}</b></div>
            <div className="d-flex justify-content-between mt-1 fs-13"><span className="fg-muted">Average attendance</span><b>{percent(stats.attendance)}</b></div>
            {canFinance && <div className="d-flex justify-content-between mt-1 fs-13"><span className="fg-muted">Left to collect</span><b className={stats.overdue ? 'fg-red' : ''}>{money(stats.due)}</b></div>}
          </Card>
        </div>
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'students', label: 'Students', icon: Users, count: stats.active.length },
          { key: 'attendance', label: 'Attendance', icon: ClipboardCheck },
          { key: 'exams', label: 'Exams', icon: GraduationCap },
        ]}
      />

      {tab === 'students' && (
        <Card padded={false}>
          {g.roster.length ? (
            <div className="table-scroll">
              <table className="table-eltc">
                <thead><tr><th>Student</th><th>Contact</th><th className="num">Attendance</th>{canFinance && <th className="num">Balance</th>}<th>Result</th><th>Status</th></tr></thead>
                <tbody>
                  {g.roster.map((e) => (
                    <tr key={e._id} className="clickable" onClick={() => navigate(`/students/${e.student._id}`)} style={{ opacity: e.status === 'active' ? 1 : 0.55 }}>
                      <td><div className="d-flex align-items-center gap-2"><Avatar person={e.student} size={32} /><div><div className="fw-700 fg-ink">{fullName(e.student)}</div><div className="fs-12 fg-subtle">{e.student.studentNumber}</div></div></div></td>
                      <td>{e.student.phone ?? e.student.guardian?.phone}</td>
                      <td className={`num fw-600 ${e.attendance?.rate < 75 ? 'fg-red' : ''}`}>{percent(e.attendance?.rate)}{e.attendance?.absent ? <div className="fs-12 fg-subtle">{e.attendance.absent} absences</div> : null}</td>
                      {canFinance && <td className="num">{e.balance > 0 ? <span className={e.overdue > 0 ? 'fg-red fw-700' : 'fw-600'}>{money(e.balance)}</span> : <Badge tone="green">Paid</Badge>}</td>}
                      <td><StatusBadge map={FINAL_RESULTS} value={e.finalResult} dot={false} />{e.finalScore !== undefined && e.finalScore !== null && <span className="fs-12 fg-muted ms-1">{e.finalScore}</span>}</td>
                      <td><StatusBadge map={ENROLLMENT_STATUS} value={e.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={Users} title="No student yet" action={canEnroll && <Button icon={Plus} onClick={() => setEnrolling(true)}>Add a student</Button>} />
          )}
        </Card>
      )}
      {tab === 'attendance' && <Card padded={false}><AttendanceMatrix groupId={id} roster={g.roster} /></Card>}
      {tab === 'exams' && <ExamsTable params={{ group: id, sort: 'asc' }} group={g} />}

      <GroupFormModal open={editing} group={g} onClose={() => setEditing(false)} onSaved={reload} />
      <GroupFormModal
        open={creatingNext}
        prefill={{ program: g.program?._id, levelNumber: g.levelNumber + 1, campus: g.campus?._id, teacher: g.teacher?._id ?? '', sessions: g.sessions ?? [], capacity: g.capacity, room: g.room, name: nextGroupName(g) }}
        onClose={() => setCreatingNext(false)}
        onSaved={() => setPromoting(true)}
      />
      <EnrollModal open={enrolling} group={g} onClose={() => setEnrolling(false)} onSaved={reload} />
      <PromoteModal open={promoting} group={g} onClose={() => setPromoting(false)} onSaved={reload} onCreateNext={() => { setPromoting(false); setCreatingNext(true); }} />
    </>
  );
};

export default GroupDetail;
