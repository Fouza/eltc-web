import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router';
import dayjs from 'dayjs';
import { Download, Plus, Upload, Users } from 'lucide-react';
import { fetchStudents, queryChanged } from '@store/studentsSlice';
import { studentsApi } from '@api/endpoints';
import { useCampus, useCan, useDebounced } from '@helpers/hooks';
import { age, formatDate, fullName, money, levelName } from '@helpers/format';
import { downloadFile, toCsv } from '@helpers/csv';
import { Avatar, Badge, Button, Card, EmptyState, Loader, PageHeader, Pagination, SearchInput, Segmented, StatusBadge } from '@components';
import { CAN } from '@data/roles';
import { STUDENT_STATUS } from '@data/enums';
import ImportStudentsModal from './ImportStudentsModal';

const StudentsList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const campus = useCampus();
  const programs = useSelector((s) => s.refs.programs);
  const { query, items, total, pages, loading } = useSelector((s) => s.students);
  const [q, setQ] = useState(query.q);
  const [importing, setImporting] = useState(false);
  const debouncedQ = useDebounced(q, 300);
  const canEdit = useCan(CAN.manageStudents);
  const canFinance = useCan(CAN.viewFinance);

  // ?status=active from the dashboard cards
  useEffect(() => {
    if (params.get('status')) dispatch(queryChanged({ status: params.get('status') }));
  }, [params, dispatch]);
  useEffect(() => {
    if (debouncedQ !== query.q) dispatch(queryChanged({ q: debouncedQ }));
  }, [debouncedQ]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    dispatch(fetchStudents());
  }, [dispatch, query, campus]);

  const exportCsv = async () => {
    const all = await studentsApi.list({ ...query, campus, page: 1, limit: 200 });
    downloadFile(
      toCsv(all.items, [
        { label: 'Number', value: (s) => s.studentNumber },
        { label: 'First name', value: (s) => s.firstName },
        { label: 'Last name', value: (s) => s.lastName },
        { label: 'Phone', value: (s) => s.phone },
        { label: 'Guardian phone', value: (s) => s.guardian?.phone },
        { label: 'Email', value: (s) => s.email },
        { label: 'Birth date', value: (s) => (s.birthDate ? dayjs(s.birthDate).format('YYYY-MM-DD') : '') },
        { label: 'Place of birth', value: (s) => s.birthPlace ?? '' },
        { label: 'Campus', value: (s) => s.campus?.name },
        { label: 'Groups', value: (s) => s.groups.map((g) => g.name).join(', ') },
        { label: 'Status', value: (s) => STUDENT_STATUS[s.status]?.label },
        { label: 'Balance', value: (s) => s.balance },
        { label: 'Registered', value: (s) => dayjs(s.registeredAt).format('YYYY-MM-DD') },
      ]),
      `students-${dayjs().format('YYYY-MM-DD')}.csv`,
    );
  };

  return (
    <>
      <PageHeader
        title="Students"
        subtitle={`${total} students${query.status ? ` · ${STUDENT_STATUS[query.status]?.label}` : ''}`}
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={exportCsv}>Export</Button>
            {canEdit && <Button variant="secondary" icon={Upload} onClick={() => setImporting(true)}>Import</Button>}
            {canEdit && <Button icon={Plus} onClick={() => navigate('/students/new')}>Register a student</Button>}
          </>
        }
      />
      <Card padded={false}>
        <div className="d-flex gap-2 flex-wrap align-items-center p-3">
          <SearchInput value={q} onChange={setQ} placeholder="Name, phone, student number…" className="flex-grow-1" style={{ maxWidth: 360 }} />
          <Segmented
            value={query.status}
            onChange={(status) => dispatch(queryChanged({ status }))}
            options={[{ value: '', label: 'All' }, ...Object.entries(STUDENT_STATUS).map(([value, s]) => ({ value, label: s.label }))]}
          />
          <select className="form-select w-auto" value={query.program} onChange={(e) => dispatch(queryChanged({ program: e.target.value }))}>
            <option value="">All programs</option>
            {programs.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          {canFinance && (
            <label className="d-flex align-items-center gap-2 fs-13 fw-600 ms-1">
              <input type="checkbox" className="form-check-input m-0" checked={query.overdue === '1'} onChange={(e) => dispatch(queryChanged({ overdue: e.target.checked ? '1' : '' }))} />
              Late payers only
            </label>
          )}
        </div>
        {loading && !items.length ? (
          <Loader />
        ) : items.length ? (
          <>
            <div className="table-scroll">
              <table className="table-eltc">
                <thead>
                  <tr>
                    <th>Student</th><th>Contact</th><th>Campus</th><th>Groups</th>
                    {canFinance && <th className="num">Balance</th>}
                    <th>Status</th><th>Registered</th>
                  </tr>
                </thead>
                <tbody style={{ opacity: loading ? 0.5 : 1 }}>
                  {items.map((s) => (
                    <tr key={s._id} className="clickable" onClick={() => navigate(`/students/${s._id}`)}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <Avatar person={s} />
                          <div className="min-w-0">
                            <div className="fw-700 fg-ink">{fullName(s)}</div>
                            <div className="fs-12 fg-subtle">{s.studentNumber}{s.birthDate ? ` · ${age(s.birthDate)} y/o` : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>{s.phone ?? s.guardian?.phone ?? '—'}</div>
                        {!s.phone && s.guardian?.name && <div className="fs-12 fg-subtle">{s.guardian.relation ?? 'Guardian'}: {s.guardian.name}</div>}
                      </td>
                      <td><Badge color={s.campus?.color}>{s.campus?.code}</Badge></td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {s.groups.map((g) => <Badge key={g._id} color={g.program?.color}>{g.name}</Badge>)}
                          {!s.groups.length && s.desiredProgram && <span className="fs-12 fg-muted">Wants {s.desiredProgram.name} {levelName(s.desiredLevel, s.desiredProgram)}</span>}
                        </div>
                      </td>
                      {canFinance && (
                        <td className="num">
                          {s.balance > 0 ? <span className={s.overdue > 0 ? 'fg-red fw-700' : 'fw-600'}>{money(s.balance)}</span> : <span className="fg-subtle">—</span>}
                        </td>
                      )}
                      <td><StatusBadge map={STUDENT_STATUS} value={s.status} /></td>
                      <td className="fg-muted fs-12">{formatDate(s.registeredAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={query.page} pages={pages} total={total} limit={query.limit} onChange={(page) => dispatch(queryChanged({ page }))} />
          </>
        ) : (
          <EmptyState icon={Users} title="No student found" message="Try another search or filter." action={canEdit && <Button icon={Plus} onClick={() => navigate('/students/new')}>Register a student</Button>} />
        )}
      </Card>
      <ImportStudentsModal open={importing} onClose={() => setImporting(false)} onDone={() => dispatch(fetchStudents())} />
    </>
  );
};

export default StudentsList;
