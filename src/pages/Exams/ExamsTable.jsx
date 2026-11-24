import { useState } from 'react';
import { useNavigate } from 'react-router';
import { GraduationCap, Plus } from 'lucide-react';
import { examsApi } from '@api/endpoints';
import { useApi, useCan } from '@helpers/hooks';
import { formatDate, fromNow, percent, levelName } from '@helpers/format';
import { Badge, Button, Card, EmptyState, Loader, StatusBadge } from '@components';
import { CAN } from '@data/roles';
import { EXAM_TYPES } from '@data/enums';
import ExamFormModal from './ExamFormModal';

// Shared by the Exams page and the Exams tab of a group.
const ExamsTable = ({ params, group, title, refreshKey }) => {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const canEdit = useCan(CAN.manageExams);
  const { data, loading, reload } = useApi(() => examsApi.list(params), [JSON.stringify(params), refreshKey]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card padded={false} title={title} actions={group && canEdit && <Button size="sm" icon={Plus} onClick={() => setCreating(true)}>Schedule an exam</Button>} bodyClassName={group || title ? 'pt-3' : ''}>
      {loading && !data ? <Loader /> : data?.length ? (
        <div className="table-scroll">
          <table className="table-eltc">
            <thead><tr><th>Exam</th>{!group && <th>Group</th>}<th>Date</th><th className="num">Graded</th><th className="num">Average</th><th className="num">Pass rate</th><th>Status</th></tr></thead>
            <tbody>
              {data.map((e) => {
                const late = e.status === 'scheduled' && e.date.slice(0, 10) < today;
                return (
                  <tr key={e._id} className="clickable" onClick={() => navigate(`/exams/${e._id}`)}>
                    <td><div className="fw-700 fg-ink">{e.title}</div><StatusBadge map={EXAM_TYPES} value={e.type} dot={false} /></td>
                    {!group && <td><div className="fw-600">{e.group?.name}</div><div className="fs-12 fg-subtle">{e.program?.name} · {levelName(e.levelNumber, e.program)}</div></td>}
                    <td><div>{formatDate(e.date)}</div><div className="fs-12 fg-subtle">{fromNow(e.date)}</div></td>
                    <td className="num">{e.stats.graded}</td>
                    <td className="num fw-700">{e.stats.average === null || e.stats.average === undefined ? '—' : `${e.stats.average}%`}</td>
                    <td className="num">{percent(e.stats.passRate)}</td>
                    <td>{e.status === 'graded' ? <Badge tone="green" dot>Graded</Badge> : late ? <Badge tone="red" dot>Results missing</Badge> : <Badge tone="cyan" dot>Upcoming</Badge>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={GraduationCap} title="No exam" action={group && canEdit && <Button icon={Plus} onClick={() => setCreating(true)}>Schedule an exam</Button>} />
      )}
      <ExamFormModal open={creating} group={group} onClose={() => setCreating(false)} onSaved={reload} />
    </Card>
  );
};

export default ExamsTable;
