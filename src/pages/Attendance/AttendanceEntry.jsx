import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import dayjs from 'dayjs';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, ClipboardCheck, Keyboard, Phone, Save, Trash2 } from 'lucide-react';
import { attendanceApi, groupsApi } from '@api/endpoints';
import { useApi, useCampus, useCan } from '@helpers/hooks';
import { formatDateTime, fullName, scheduleLabel, todayInput } from '@helpers/format';
import { toast } from '@helpers/toast';
import { useConfirm } from '@context/ConfirmContext';
import { Avatar, Badge, Button, Card, EmptyState, Field, Loader, PageHeader, Segmented } from '@components';
import { CAN } from '@data/roles';
import { ATTENDANCE_STATUS } from '@data/enums';
import { DAYS_SHORT } from '@data/days';
import styles from './Attendance.module.scss';

const OPTIONS = Object.entries(ATTENDANCE_STATUS).map(([value, s]) => ({ value, label: s.short, title: s.label, tone: s.tone === 'blue' ? 'purple' : s.tone }));
const KEYS = { p: 'present', a: 'absent', l: 'late', e: 'excused' };

// Nearest past class day of the group (so "today" lands on the last session when there is no class today).
const lastSessionDate = (group) => {
  if (!group?.schedule?.length) return todayInput();
  for (let i = 0; i < 7; i++) {
    const d = dayjs().subtract(i, 'day');
    if (group.schedule.some((s) => s.day === d.day())) return d.format('YYYY-MM-DD');
  }
  return todayInput();
};

const AttendanceEntry = () => {
  const campus = useCampus();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const canEdit = useCan(CAN.recordAttendance);
  const { data: groups } = useApi(() => groupsApi.list({ status: 'ongoing,planned', campus }), [campus]);
  const { data: alerts } = useApi(() => attendanceApi.alerts({ campus }), [campus]);
  const groupId = params.get('group') ?? '';
  const group = groups?.find((g) => g._id === groupId);
  const [date, setDate] = useState(params.get('date') ?? '');
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [focus, setFocus] = useState(0);
  const listRef = useRef(null);

  useEffect(() => {
    if (group && !date) setDate(lastSessionDate(group));
  }, [group, date]);

  useEffect(() => {
    if (!groupId || !date) return;
    setLoading(true);
    attendanceApi.sheet(groupId, date).then((s) => { setSheet(s); setDirty(false); setFocus(0); }).catch(toast.error).finally(() => setLoading(false));
  }, [groupId, date]);

  const setEntry = (i, patch) => {
    setSheet((s) => ({ ...s, entries: s.entries.map((e, j) => (j === i ? { ...e, ...patch } : e)) }));
    setDirty(true);
  };
  const setAll = (status) => {
    setSheet((s) => ({ ...s, entries: s.entries.map((e) => ({ ...e, status })) }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const saved = await attendanceApi.save({ groupId, date, topic: sheet.topic, entries: sheet.entries.map((e) => ({ student: e.student._id, status: e.status, note: e.note })) });
      setSheet(saved);
      setDirty(false);
      toast.success('Attendance saved', `${group?.name} · ${dayjs(date).format('ddd D MMM')}`);
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!(await confirm({ title: 'Delete this sheet?', message: 'Use this if the class did not take place.', danger: true, confirmLabel: 'Delete' }))) return;
    await attendanceApi.remove(sheet._id);
    toast.success('Sheet deleted');
    setSheet(await attendanceApi.sheet(groupId, date));
  };

  // Keyboard: ↑/↓ move, P/A/L/E set the status and go to the next student, Ctrl+S saves.
  useEffect(() => {
    if (!sheet || !canEdit) return undefined;
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setFocus((f) => Math.min(sheet.entries.length - 1, f + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setFocus((f) => Math.max(0, f - 1)); }
      else if (KEYS[e.key.toLowerCase()]) {
        setEntry(focus, { status: KEYS[e.key.toLowerCase()] });
        setFocus((f) => Math.min(sheet.entries.length - 1, f + 1));
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }); // re-bind each render: uses latest state

  useEffect(() => {
    listRef.current?.querySelector(`[data-row="${focus}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [focus]);

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, excused: 0 };
    sheet?.entries.forEach((e) => { c[e.status]++; });
    return c;
  }, [sheet]);
  const isClassDay = group && date && group.schedule.some((s) => s.day === dayjs(date).day());
  const todays = (groups ?? []).filter((g) => g.status === 'ongoing' && g.schedule.some((s) => s.day === dayjs().day()));
  const shiftDate = (n) => setDate(dayjs(date).add(n, 'day').format('YYYY-MM-DD'));

  return (
    <>
      <PageHeader title="Attendance" subtitle="Type the teacher's paper list: everyone starts as present, click (or press A / L / E) for the exceptions." />
      <div className="row g-3">
        <div className="col-xl-8">
          <Card className="mb-3">
            <div className="row g-3 align-items-end">
              <div className="col-md-6">
                <Field label="Group" className="mb-0">
                  <select className="form-select" value={groupId} onChange={(e) => { setDate(''); setSheet(null); setParams({ group: e.target.value }); }}>
                    <option value="">Choose a group…</option>
                    {groups?.map((g) => <option key={g._id} value={g._id}>{g.name} · {g.campus?.code} · {scheduleLabel(g.schedule)}</option>)}
                  </select>
                </Field>
              </div>
              <div className="col-md-6">
                <Field label="Date" className="mb-0">
                  <div className="d-flex gap-2">
                    <Button variant="secondary" icon={ChevronLeft} onClick={() => shiftDate(-1)} disabled={!date} aria-label="Previous day" />
                    <input type="date" className="form-control" value={date} max={todayInput()} onChange={(e) => setDate(e.target.value)} disabled={!groupId} />
                    <Button variant="secondary" icon={ChevronRight} onClick={() => shiftDate(1)} disabled={!date || date >= todayInput()} aria-label="Next day" />
                  </div>
                </Field>
              </div>
            </div>
            {!groupId && todays.length > 0 && (
              <div className="mt-3">
                <div className="ls-up mb-2">Today's classes</div>
                <div className="d-flex flex-wrap gap-2">
                  {todays.map((g) => (
                    <button key={g._id} type="button" className={styles.quick} onClick={() => setParams({ group: g._id })}>
                      <b>{g.name}</b> <span>{g.schedule.find((s) => s.day === dayjs().day())?.startTime}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {!groupId ? (
            <Card><EmptyState icon={ClipboardCheck} title="Choose a group to start" message="Or pick one of today's classes above." /></Card>
          ) : loading || !sheet ? (
            <Card><Loader /></Card>
          ) : (
            <Card
              padded={false}
              title={`${group?.name ?? ''} · ${dayjs(date).format('dddd D MMMM')}`}
              subtitle={
                sheet.exists
                  ? `Saved by ${fullName(sheet.recordedBy)} · ${formatDateTime(sheet.updatedAt)}${dirty ? ' · unsaved changes' : ''}`
                  : isClassDay ? 'Not recorded yet' : `⚠ No class on ${DAYS_SHORT[dayjs(date).day()]} for this group — check the date`
              }
              actions={canEdit && (
                <>
                  <Button size="sm" variant="secondary" icon={Check} onClick={() => setAll('present')}>All present</Button>
                  {sheet.exists && <Button size="sm" variant="ghost" icon={Trash2} onClick={remove} aria-label="Delete sheet" />}
                </>
              )}
            >
              <div className="px-3 pt-3">
                <input className="form-control" placeholder="Lesson / topic (optional)" value={sheet.topic ?? ''} onChange={(e) => { setSheet({ ...sheet, topic: e.target.value }); setDirty(true); }} disabled={!canEdit} />
              </div>
              <div className={styles.list} ref={listRef}>
                {sheet.entries.map((e, i) => (
                  <div key={e.student._id} data-row={i} className={`${styles.row} ${focus === i ? styles.focused : ''} ${styles[e.status]}`} onClick={() => setFocus(i)}>
                    <span className={styles.num}>{i + 1}</span>
                    <Avatar person={e.student} size={34} />
                    <div className="flex-grow-1 min-w-0">
                      <div className="fw-700 text-ellipsis">{fullName(e.student)}</div>
                      <input className={styles.note} placeholder="Note…" value={e.note ?? ''} onChange={(ev) => setEntry(i, { note: ev.target.value })} disabled={!canEdit} />
                    </div>
                    <Segmented size="sm" options={OPTIONS} value={e.status} onChange={(status) => canEdit && setEntry(i, { status })} />
                  </div>
                ))}
                {!sheet.entries.length && <EmptyState compact title="No student in this group" />}
              </div>
              <div className={styles.footer}>
                <div className="d-flex gap-2 flex-wrap">
                  <Badge tone="green">{counts.present} present</Badge>
                  <Badge tone="red">{counts.absent} absent</Badge>
                  <Badge tone="amber">{counts.late} late</Badge>
                  <Badge tone="blue">{counts.excused} excused</Badge>
                </div>
                {canEdit && <Button icon={Save} loading={saving} onClick={save} disabled={!sheet.entries.length}>{sheet.exists ? 'Update' : 'Save'} attendance</Button>}
              </div>
            </Card>
          )}
        </div>
        <div className="col-xl-4">
          <Card title="Keyboard" icon={Keyboard} className="mb-3">
            <div className={styles.keys}>
              <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
              <span><kbd>P</kbd> present</span>
              <span><kbd>A</kbd> absent</span>
              <span><kbd>L</kbd> late</span>
              <span><kbd>E</kbd> excused</span>
              <span><kbd>Ctrl</kbd>+<kbd>S</kbd> save</span>
            </div>
          </Card>
          <Card title="Students missing classes" subtitle="3+ absences in the last 30 days" icon={AlertTriangle}>
            {alerts?.length ? (
              <div className="d-flex flex-column gap-2">
                {alerts.slice(0, 10).map((a) => (
                  <div key={`${a._id.student}-${a._id.group}`} className="d-flex align-items-center gap-2">
                    <Avatar person={a.student} size={30} />
                    <div className="flex-grow-1 min-w-0">
                      <Link to={`/students/${a.student._id}?tab=attendance`} className="fw-600 fg-ink">{fullName(a.student)}</Link>
                      <div className="fs-12 fg-subtle">{a.group.name}</div>
                    </div>
                    <Badge tone="red">{a.absences}×</Badge>
                    {(a.student.guardian?.phone || a.student.phone) && <a href={`tel:${a.student.guardian?.phone || a.student.phone}`}><Button size="sm" variant="ghost" icon={Phone} /></a>}
                  </div>
                ))}
              </div>
            ) : <EmptyState compact title="No attendance problem" />}
          </Card>
        </div>
      </div>
    </>
  );
};

export default AttendanceEntry;
