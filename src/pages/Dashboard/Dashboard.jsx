import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertCircle, CalendarCheck2, ClipboardCheck, Clock, GraduationCap, Layers, MapPin, Plus, Users, Wallet,
} from 'lucide-react';
import { dashboardApi } from '@api/endpoints';
import { useApi, useCampus, useCan, useGroupName } from '@helpers/hooks';
import { formatDate, fromNow, fullName, money, number, percent, formatDay, formatMonth } from '@helpers/format';
import { Avatar, Badge, Button, Card, EmptyState, Loader, ProgressBar, StatCard, StatusBadge } from '@components';
import { CAN } from '@data/roles';
import { useTheme } from '@helpers/theme';
import { EXAM_TYPES, STUDENT_STATUS, AUDIENCES } from '@data/enums';
import RecordPaymentModal from '@pages/Payments/RecordPaymentModal';
import styles from './Dashboard.module.scss';

// Chart colours per theme (SVG attributes can't read CSS variables).
const CHART = {
  light: { received: '#064CA5', billed: '#9B7BF0', grid: '#F2F4F7', tick: '#98A2B3', cursor: 'rgba(6,76,165,0.05)' },
  dark: { received: '#4D8FF0', billed: '#A98BF5', grid: '#1D2330', tick: '#6C7689', cursor: 'rgba(110,168,254,0.08)' },
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

const RevenueTooltip = ({ active, payload, label }) =>
  active && payload?.length ? (
    <div className={styles.tooltip}>
      <div className="fw-700 mb-1">{formatMonth(`${label}-01`)}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="d-flex align-items-center gap-2">
          <i className={styles.swatch} style={{ background: p.color }} /> {p.name}: <b className="ms-auto tabular">{money(p.value)}</b>
        </div>
      ))}
    </div>
  ) : null;

// Horizontal bars with direct labels (name + value), so colour is never the only cue.
const BarList = ({ rows, total }) => (
  <div className="d-flex flex-column gap-3">
    {rows.map((r) => (
      <div key={r.name}>
        <div className="d-flex justify-content-between fs-13 mb-1">
          <span className="fw-600 fg-ink">{r.name}</span>
          <span className="fg-muted tabular">
            {number(r.count)} <span className="fg-subtle">· {total ? Math.round((r.count / total) * 100) : 0}%</span>
          </span>
        </div>
        <div className={styles.barTrack}>
          <div className={styles.barFill} style={{ width: `${total ? (r.count / total) * 100 : 0}%`, background: r.color ?? '#064CA5' }} />
        </div>
      </div>
    ))}
  </div>
);

const Dashboard = () => {
  const chart = CHART[useTheme()];
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const campus = useCampus();
  const groupName = useGroupName();
  const canPay = useCan(CAN.recordPayments);
  const canRegister = useCan(CAN.manageStudents);
  const [paying, setPaying] = useState(false);
  const { data, loading, reload } = useApi(() => dashboardApi.get({ campus }), [campus]);

  if (loading && !data) return <Loader full />;
  if (!data) return null;
  const f = data.finance;
  const trend = f && f.revenueLastMonth ? Math.round(((f.revenueThisMonth - f.revenueLastMonth) / f.revenueLastMonth) * 100) : null;
  const totalByLanguage = data.byLanguage.reduce((s, r) => s + r.count, 0);
  const totalByCampus = data.byCampus.reduce((s, r) => s + r.count, 0);

  return (
    <>
      <div className={styles.hero}>
        <div>
          <div className={styles.date}>{formatDate(new Date())}</div>
          <h1 className={styles.hello}>
            {greeting()}, {user?.firstName} 👋
          </h1>
          <p className={styles.heroText}>
            {data.todayGroups.length ? `${data.todayGroups.length} ${data.todayGroups.length > 1 ? 'classes' : 'class'} today` : 'No class scheduled today'}
            {f?.overdueCount ? ` · ${f.overdueCount} overdue payments to follow up` : ''}
            {data.students.prospects ? ` · ${data.students.prospects} students on the waiting list` : ''}
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {canRegister && <Button variant="secondary" icon={Plus} onClick={() => navigate('/students/new')}>Register a student</Button>}
          <Button variant="secondary" icon={ClipboardCheck} onClick={() => navigate('/attendance')}>Take attendance</Button>
          {canPay && <Button icon={Wallet} onClick={() => setPaying(true)}>Record a payment</Button>}
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-6 col-xl">
          <StatCard label="Active students" value={number(data.students.active)} icon={Users} tone="blue" hint={`+${data.students.newThisMonth} registered this month`} onClick={() => navigate('/students?status=active')} />
        </div>
        <div className="col-6 col-xl">
          <StatCard label="Ongoing groups" value={number(data.groups.ongoing)} icon={Layers} tone="purple" hint={`${data.groups.planned} planned`} onClick={() => navigate('/groups')} />
        </div>
        <div className="col-6 col-xl">
          <StatCard label="Attendance (30 days)" value={percent(data.attendance.rate)} icon={CalendarCheck2} tone="green" hint={`${number(data.attendance.sessions)} presences checked`} onClick={() => navigate('/attendance')} />
        </div>
        {f && (
          <>
            <div className="col-6 col-xl">
              <StatCard label="Collected this month" value={money(f.revenueThisMonth)} icon={Wallet} tone="cyan" trend={trend} hint="vs last month" onClick={() => navigate('/payments?tab=payments')} />
            </div>
            <div className="col-6 col-xl">
              <StatCard label="Overdue" value={money(f.overdue)} icon={AlertCircle} tone="red" hint={`${f.overdueCount} invoices · ${money(f.outstanding)} still to collect`} onClick={() => navigate('/payments?status=overdue')} />
            </div>
          </>
        )}
      </div>

      <div className="row g-3 mb-3">
        {f && (
          <div className="col-xl-8">
            <Card title="Money collected vs billed" subtitle="Last 6 months · billed = installments falling due that month" className="h-100">
              <div className={styles.legend}>
                <span><i className={styles.swatch} style={{ background: chart.received }} /> Collected</span>
                <span><i className={styles.swatch} style={{ background: chart.billed }} /> Billed</span>
              </div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={f.revenueByMonth} barGap={2} barCategoryGap="28%" margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={chart.grid} />
                    <XAxis dataKey="month" tickFormatter={(m) => dayjs(`${m}-01`).format('MMM')} tickLine={false} axisLine={false} tick={{ fill: chart.tick, fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} tickLine={false} axisLine={false} tick={{ fill: chart.tick, fontSize: 12 }} width={44} />
                    <Tooltip content={<RevenueTooltip />} cursor={{ fill: chart.cursor }} />
                    <Bar dataKey="received" name="Collected" fill={chart.received} radius={[4, 4, 0, 0]} maxBarSize={22} />
                    <Bar dataKey="billed" name="Billed" fill={chart.billed} radius={[4, 4, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}
        <div className={f ? 'col-xl-4' : 'col-xl-6'}>
          <Card title="Students by language" subtitle="Active enrollments" className="h-100">
            {data.byLanguage.length ? <BarList rows={data.byLanguage} total={totalByLanguage} /> : <EmptyState compact title="No active students" />}
            <div className="divider" />
            <div className="ls-up mb-2">By audience</div>
            <div className="d-flex gap-2 flex-wrap">
              {data.byAudience.map((a) => (
                <Badge key={a.name} tone={a.name === 'children' ? 'pink' : 'blue'}>
                  {AUDIENCES[a.name] ?? a.name}: {a.count}
                </Badge>
              ))}
            </div>
          </Card>
        </div>
        {!f && (
          <div className="col-xl-6">
            <Card title="Students by campus" className="h-100">
              <BarList rows={data.byCampus} total={totalByCampus} />
            </Card>
          </div>
        )}
      </div>

      <div className="row g-3">
        <div className="col-xl-4 col-lg-6">
          <Card title="Today's classes" icon={Clock} actions={<Link to="/timetable" className="fs-13 fw-600">Timetable</Link>} className="h-100">
            {data.todayGroups.length ? (
              <div className="d-flex flex-column gap-2">
                {data.todayGroups.map((g) => (
                  <Link key={g._id} to={`/attendance?group=${g._id}`} className={styles.classRow}>
                    <div className={styles.time}>
                      <b>{g.slot.startTime}</b>
                      <span>{g.slot.endTime}</span>
                    </div>
                    <i className={styles.classBar} style={{ background: g.program?.color ?? '#064CA5' }} />
                    <div className="flex-grow-1 min-w-0">
                      <div className="fw-700 fg-ink text-ellipsis">{groupName(g)}</div>
                      <div className="fs-12 fg-muted text-ellipsis">
                        {fullName(g.teacher)} · {g.room} · {g.campus?.code}
                      </div>
                    </div>
                    <span className="fs-12 fg-muted tabular">{g.enrolledCount}/{g.capacity}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState compact icon={Clock} title="No class today" />
            )}
          </Card>
        </div>

        {f ? (
          <div className="col-xl-4 col-lg-6">
            <Card title="Overdue payments" icon={AlertCircle} actions={<Link to="/payments?status=overdue" className="fs-13 fw-600">See all</Link>} className="h-100">
              {f.overdueInvoices.length ? (
                <div className="d-flex flex-column">
                  {f.overdueInvoices.map((inv) => (
                    <Link key={inv._id} to={`/students/${inv.student?._id}?tab=payments`} className={styles.listRow}>
                      <Avatar person={inv.student} size={34} />
                      <div className="flex-grow-1 min-w-0">
                        <div className="fw-600 fg-ink text-ellipsis">{fullName(inv.student)}</div>
                        <div className="fs-12 fg-muted">Due {formatDate(inv.dueDate)} · {fromNow(inv.dueDate)}</div>
                      </div>
                      <b className="fg-red tabular fs-13">{money(inv.amount - inv.paidAmount)}</b>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState compact icon={Wallet} title="No overdue payment" message="Everyone is up to date." />
              )}
            </Card>
          </div>
        ) : null}

        <div className="col-xl-4 col-lg-6">
          <Card title="Upcoming exams" icon={GraduationCap} actions={<Link to="/exams" className="fs-13 fw-600">All exams</Link>} className="h-100">
            {data.upcomingExams.length ? (
              <div className="d-flex flex-column">
                {data.upcomingExams.map((e) => (
                  <Link key={e._id} to={`/exams/${e._id}`} className={styles.listRow}>
                    <div className={styles.dateChip}>
                      <b>{dayjs(e.date).format('D')}</b>
                      <span>{dayjs(e.date).format('MMM')}</span>
                    </div>
                    <div className="flex-grow-1 min-w-0">
                      <div className="fw-600 fg-ink text-ellipsis">{e.title}</div>
                      <div className="fs-12 fg-muted">{e.group?.name} · {formatDay(e.date)}</div>
                    </div>
                    <StatusBadge map={EXAM_TYPES} value={e.type} dot={false} />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState compact icon={GraduationCap} title="No exam in the next 2 weeks" />
            )}
          </Card>
        </div>

        <div className="col-xl-8 col-lg-6">
          <Card title="Latest registrations" icon={Users} actions={<Link to="/students" className="fs-13 fw-600">All students</Link>}>
            <div className="table-scroll">
              <table className="table-eltc compact">
                <tbody>
                  {data.recentStudents.map((s) => (
                    <tr key={s._id} className="clickable" onClick={() => navigate(`/students/${s._id}`)}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <Avatar person={s} size={30} />
                          <div>
                            <div className="fw-600 fg-ink">{fullName(s)}</div>
                            <div className="fs-12 fg-subtle">{s.studentNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td><Badge color={s.campus?.color}>{s.campus?.name}</Badge></td>
                      <td><StatusBadge map={STUDENT_STATUS} value={s.status} /></td>
                      <td className="fg-muted fs-12 text-end">{fromNow(s.registeredAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {f && (
          <div className="col-xl-4 col-lg-6">
            <Card title="Students by campus" icon={MapPin} className="h-100">
              {data.byCampus.length ? <BarList rows={data.byCampus} total={totalByCampus} /> : <EmptyState compact title="No data" />}
              <div className="divider" />
              <div className="d-flex justify-content-between fs-13">
                <span className="fg-muted">Collection rate (6 months)</span>
                <b>
                  {percent(
                    Math.round(
                      (f.revenueByMonth.reduce((s, m) => s + m.received, 0) / Math.max(1, f.revenueByMonth.reduce((s, m) => s + m.billed, 0))) * 100,
                    ),
                  )}
                </b>
              </div>
              <div className="mt-2">
                <ProgressBar
                  tone="green"
                  value={f.revenueByMonth.reduce((s, m) => s + m.received, 0)}
                  max={Math.max(1, f.revenueByMonth.reduce((s, m) => s + m.billed, 0))}
                />
              </div>
            </Card>
          </div>
        )}
      </div>

      <RecordPaymentModal open={paying} onClose={() => setPaying(false)} onSaved={reload} />
    </>
  );
};

export default Dashboard;
