import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router';
import dayjs from 'dayjs';
import { Ban, CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, RotateCcw, Users } from 'lucide-react';
import { groupsApi } from '@api/endpoints';
import { useApi, useCampus, useCan, useGroupName } from '@helpers/hooks';
import { fullName, levelName } from '@helpers/format';
import { toast } from '@helpers/toast';
import { cancellationOn, runsOn } from '@helpers/sessionDates';
import { Badge, Button, Card, Field, Loader, Modal, PageHeader } from '@components';
import { CAN } from '@data/roles';
import { SESSION_CANCEL_REASONS } from '@data/enums';
import styles from './Timetable.module.scss';

const START = 8;
const END = 21;
const HOUR = 56; // px per hour
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const KEY = 'YYYY-MM-DD';
// Weeks start on Saturday (see WEEK_ORDER).
const weekStartOf = (d) => dayjs(d).subtract((dayjs(d).day() + 1) % 7, 'day').format(KEY);

// One session on one day: details, attendance, and cancel (holiday, Eid, teacher absent) or restore.
const SessionModal = ({ item, onClose, onChanged }) => {
  const groupName = useGroupName();
  const canManage = useCan(CAN.manageGroups);
  const [reason, setReason] = useState('holiday');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  if (!item) return null;
  const { g, s, key, cancelled } = item;
  const past = key <= dayjs().format(KEY);

  const run = async (fn, message) => {
    setSaving(true);
    try {
      const res = await fn();
      toast.success(message, res.invoicesMoved ? `${res.invoicesMoved} invoice date(s) moved` : undefined);
      onChanged();
      onClose();
    } catch (err) { toast.error(err); } finally { setSaving(false); }
  };
  const cancel = () => run(() => groupsApi.cancelSession(g._id, { date: key, reason, note }), 'Session cancelled');
  const restore = () => run(() => groupsApi.restoreSession(g._id, key), 'Session restored');

  return (
    <Modal
      open
      onClose={onClose}
      title={groupName(g)}
      subtitle={`${dayjs(key).format('dddd D MMMM YYYY')} · ${s.startTime}–${s.endTime}`}
      footer={
        <>
          <Link to={`/groups/${g._id}`}><Button variant="secondary" icon={Users}>Open group</Button></Link>
          {!cancelled && past && <Link to={`/attendance?group=${g._id}&date=${key}`}><Button variant="secondary" icon={ClipboardCheck}>Attendance</Button></Link>}
          {canManage && (cancelled
            ? <Button icon={RotateCcw} loading={saving} onClick={restore}>Restore the session</Button>
            : <Button variant="danger" icon={Ban} loading={saving} onClick={cancel}>Cancel this session</Button>)}
        </>
      }
    >
      <div className="d-flex flex-wrap gap-1 mb-3">
        <Badge color={g.campus?.color}>{g.campus?.name}</Badge>
        <Badge tone="purple">{g.program?.name} · {levelName(g.levelNumber, g.program)}</Badge>
        <Badge tone="gray">{g.enrolledCount} students</Badge>
        {g.teacher && <Badge tone="gray">{fullName(g.teacher)}</Badge>}
        {g.room && <Badge tone="gray">{g.room}</Badge>}
      </div>
      {cancelled ? (
        <div className={styles.cancelledBox}>
          <b>Cancelled — {SESSION_CANCEL_REASONS[cancelled.reason]}</b>
          {cancelled.note && <div>{cancelled.note}</div>}
          <div className="fs-12 fg-subtle mt-1">No attendance for this day. This group's payment blocks and the end of its level were moved one session later. Restoring moves them back.</div>
        </div>
      ) : canManage ? (
        <>
          <Field label="Cancel for a reason" hint={`Only this group (${g.campus?.name}) on this day. Its payment blocks and the end of the level move one session later; no attendance is taken.`}>
            <div className="d-flex flex-wrap gap-2">
              {Object.entries(SESSION_CANCEL_REASONS).map(([k, label]) => (
                <label key={k} className={`${styles.reason} ${reason === k ? styles.reasonOn : ''}`}>
                  <input type="radio" name="reason" className="d-none" checked={reason === k} onChange={() => setReason(k)} />{label}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Note"><input className="form-control" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Eid al-Fitr, teacher sick…" /></Field>
        </>
      ) : null}
    </Modal>
  );
};

// Week calendar with real dates: every session of the current groups, cancelled ones crossed out.
// Filter by program, level or teacher to see a clear picture.
const Timetable = () => {
  const campus = useCampus();
  const groupName = useGroupName();
  const { teachers, programs } = useSelector((st) => st.refs);
  const [params, setParams] = useSearchParams();
  const week = params.get('week') ?? weekStartOf(dayjs());
  const program = params.get('program') ?? '';
  const level = params.get('level') ?? '';
  const teacher = params.get('teacher') ?? '';
  const setParam = (patch) => setParams((p) => {
    const next = new URLSearchParams(p);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    return next;
  });
  const [open, setOpen] = useState(null);
  const { data: groups, loading, reload } = useApi(
    () => groupsApi.list({ status: 'ongoing,planned,completed', campus, teacher, program, level }),
    [campus, teacher, program, level],
  );
  const todayKey = dayjs().format(KEY);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => dayjs(week).add(i, 'day').format(KEY)), [week]);
  const selectedProgram = programs.find((p) => p._id === program);

  const byDay = useMemo(() => {
    const out = Object.fromEntries(days.map((k) => [k, []]));
    for (const g of groups ?? []) {
      for (const k of days) {
        if (!runsOn(g, k)) continue;
        g.schedule.filter((s) => s.day === dayjs(k).day()).forEach((s) => out[k].push({ g, s, key: k, cancelled: cancellationOn(g, k) }));
      }
    }
    // Side-by-side columns only inside a cluster of classes that overlap in time.
    Object.values(out).forEach((items) => {
      items.sort((a, b) => toMin(a.s.startTime) - toMin(b.s.startTime));
      let cluster = [];
      let clusterEnd = -1;
      let lanes = [];
      const close = () => cluster.forEach((it) => { it.lanes = lanes.length; });
      items.forEach((it) => {
        const start = toMin(it.s.startTime);
        if (start >= clusterEnd) { close(); cluster = []; lanes = []; }
        let lane = lanes.findIndex((end) => end <= start);
        if (lane < 0) { lane = lanes.length; lanes.push(0); }
        lanes[lane] = toMin(it.s.endTime);
        it.lane = lane;
        cluster.push(it);
        clusterEnd = Math.max(clusterEnd, toMin(it.s.endTime));
      });
      close();
    });
    return out;
  }, [groups, days]);

  const all = Object.values(byDay).flat();
  const cancelledCount = all.filter((i) => i.cancelled).length;
  const weekLabel = `${dayjs(days[0]).format('D MMM')} – ${dayjs(days[6]).format('D MMM YYYY')}`;

  return (
    <>
      <PageHeader
        title="Timetable"
        subtitle={`${all.length} sessions this week${cancelledCount ? ` · ${cancelledCount} cancelled` : ''}. Click a session to take attendance or cancel it.`}
      />
      <Card className="mb-3">
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <div className="d-flex gap-1 align-items-center">
            <Button variant="secondary" icon={ChevronLeft} aria-label="Previous week" onClick={() => setParam({ week: dayjs(week).subtract(7, 'day').format(KEY) })} />
            <Button variant="secondary" icon={CalendarDays} onClick={() => setParam({ week: '' })} disabled={week === weekStartOf(dayjs())}>This week</Button>
            <Button variant="secondary" icon={ChevronRight} aria-label="Next week" onClick={() => setParam({ week: dayjs(week).add(7, 'day').format(KEY) })} />
            <input type="date" className="form-control" style={{ width: 160 }} value={days[0]} onChange={(e) => e.target.value && setParam({ week: weekStartOf(e.target.value) })} aria-label="Go to date" />
          </div>
          <div className="fw-700 ms-1">{weekLabel}</div>
          <div className="d-flex flex-wrap gap-2 ms-auto">
            <select className="form-select" style={{ width: 'auto' }} value={program} onChange={(e) => setParam({ program: e.target.value, level: '' })}>
              <option value="">All programs</option>
              {programs.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            <select className="form-select" style={{ width: 'auto' }} value={level} onChange={(e) => setParam({ level: e.target.value })} disabled={!selectedProgram}>
              <option value="">All levels</option>
              {selectedProgram?.levels.map((l) => <option key={l.number} value={l.number}>{l.name}</option>)}
            </select>
            <select className="form-select" style={{ width: 'auto' }} value={teacher} onChange={(e) => setParam({ teacher: e.target.value })}>
              <option value="">All teachers</option>
              {teachers.map((t) => <option key={t._id} value={t._id}>{fullName(t)}</option>)}
            </select>
          </div>
        </div>
      </Card>
      <Card padded={false}>
        {loading && !groups ? <Loader /> : (
          <div className={styles.scroll}>
            <div className={styles.grid} style={{ '--hour': `${HOUR}px` }}>
              <div className={styles.corner} />
              {days.map((k) => (
                <div key={k} className={`${styles.dayHead} ${k === todayKey ? styles.today : ''}`}>
                  {dayjs(k).format('dddd')}
                  <span className={styles.date}>{dayjs(k).format('D MMM')}</span>
                </div>
              ))}
              <div className={styles.hours}>
                {Array.from({ length: END - START }, (_, i) => <div key={i} className={styles.hour}>{String(START + i).padStart(2, '0')}:00</div>)}
              </div>
              {days.map((k) => (
                <div key={k} className={`${styles.dayCol} ${k === todayKey ? styles.todayCol : ''}`} style={{ height: (END - START) * HOUR }}>
                  {byDay[k].map((it) => {
                    const { g, s, lane, lanes, cancelled } = it;
                    const top = ((toMin(s.startTime) - START * 60) / 60) * HOUR;
                    const height = Math.max(28, ((toMin(s.endTime) - toMin(s.startTime)) / 60) * HOUR - 3);
                    return (
                      <button
                        key={`${g._id}-${s.startTime}`}
                        type="button"
                        className={`${styles.event} ${cancelled ? styles.cancelled : ''}`}
                        style={{ top, height, left: `calc(${(lane / lanes) * 100}% + 3px)`, width: `calc(${100 / lanes}% - 6px)`, '--c': g.program?.color ?? '#064CA5' }}
                        onClick={() => setOpen(it)}
                        title={`${groupName(g)} · ${s.startTime}–${s.endTime} · ${fullName(g.teacher)} · ${g.campus?.name ?? ''}${cancelled ? ` · CANCELLED (${SESSION_CANCEL_REASONS[cancelled.reason]})` : ''}`}
                      >
                        <b>{groupName(g)}</b>
                        <span>{cancelled ? `Cancelled · ${SESSION_CANCEL_REASONS[cancelled.reason]}` : `${s.startTime}–${s.endTime}`}</span>
                        {height > 50 && !cancelled && <span>{fullName(g.teacher)}{g.room ? ` · ${g.room}` : ''} · {g.campus?.code}</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
      <SessionModal item={open} onClose={() => setOpen(null)} onChanged={reload} />
    </>
  );
};

export default Timetable;
