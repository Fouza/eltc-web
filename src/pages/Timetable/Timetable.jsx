import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import dayjs from 'dayjs';
import { groupsApi } from '@api/endpoints';
import { useApi, useCampus, useGroupName } from '@helpers/hooks';
import { fullName } from '@helpers/format';
import { Card, Loader, PageHeader } from '@components';
import { DAYS, WEEK_ORDER } from '@data/days';
import styles from './Timetable.module.scss';

const START = 8;
const END = 21;
const HOUR = 56; // px per hour
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

// Weekly grid of every current group. Filter by teacher or room to spot clashes.
const Timetable = () => {
  const navigate = useNavigate();
  const campus = useCampus();
  const groupName = useGroupName();
  const teachers = useSelector((s) => s.refs.teachers);
  const [teacher, setTeacher] = useState('');
  const { data: groups, loading } = useApi(() => groupsApi.list({ status: 'ongoing,planned', campus, teacher }), [campus, teacher]);
  const today = dayjs().day();

  const byDay = useMemo(() => {
    const out = Object.fromEntries(WEEK_ORDER.map((d) => [d, []]));
    (groups ?? []).forEach((g) => g.schedule.forEach((s) => out[s.day]?.push({ g, s })));
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
  }, [groups]);

  return (
    <>
      <PageHeader
        title="Timetable"
        subtitle="Current and planned groups for the selected campus."
        actions={
          <select className="form-select" value={teacher} onChange={(e) => setTeacher(e.target.value)}>
            <option value="">All teachers</option>
            {teachers.map((t) => <option key={t._id} value={t._id}>{fullName(t)}</option>)}
          </select>
        }
      />
      <Card padded={false}>
        {loading && !groups ? <Loader /> : (
          <div className={styles.scroll}>
            <div className={styles.grid} style={{ '--hour': `${HOUR}px` }}>
              <div className={styles.corner} />
              {WEEK_ORDER.map((d) => <div key={d} className={`${styles.dayHead} ${d === today ? styles.today : ''}`}>{DAYS[d]}</div>)}
              <div className={styles.hours}>
                {Array.from({ length: END - START }, (_, i) => <div key={i} className={styles.hour}>{String(START + i).padStart(2, '0')}:00</div>)}
              </div>
              {WEEK_ORDER.map((d) => (
                <div key={d} className={`${styles.dayCol} ${d === today ? styles.todayCol : ''}`} style={{ height: (END - START) * HOUR }}>
                  {byDay[d].map(({ g, s, lane, lanes }) => {
                    const top = ((toMin(s.startTime) - START * 60) / 60) * HOUR;
                    const height = Math.max(28, ((toMin(s.endTime) - toMin(s.startTime)) / 60) * HOUR - 3);
                    return (
                      <button
                        key={`${g._id}-${s.startTime}`}
                        type="button"
                        className={styles.event}
                        style={{ top, height, left: `calc(${(lane / lanes) * 100}% + 3px)`, width: `calc(${100 / lanes}% - 6px)`, '--c': g.program?.color ?? '#064CA5' }}
                        onClick={() => navigate(`/groups/${g._id}`)}
                        title={`${groupName(g)} · ${s.startTime}–${s.endTime} · ${fullName(g.teacher)} · ${g.room ?? ''}`}
                      >
                        <b>{groupName(g)}</b>
                        <span>{s.startTime}–{s.endTime}</span>
                        {height > 50 && <span>{fullName(g.teacher)} · {g.room} · {g.campus?.code}</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </>
  );
};

export default Timetable;
