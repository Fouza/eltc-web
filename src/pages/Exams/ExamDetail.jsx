import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Pencil, Save, Trash2 } from 'lucide-react';
import { examsApi } from '@api/endpoints';
import { useApi, useCan } from '@helpers/hooks';
import { formatDate, fullName, levelName } from '@helpers/format';
import { toast } from '@helpers/toast';
import { useConfirm } from '@context/ConfirmContext';
import { Avatar, Badge, Button, Card, EmptyState, Loader, PageHeader, StatCard, StatusBadge } from '@components';
import { CAN } from '@data/roles';
import { EXAM_TYPES } from '@data/enums';
import ExamFormModal from './ExamFormModal';
import styles from './Exams.module.scss';

// Grade entry grid: Enter moves to the next student, like a spreadsheet.
const ExamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const canEdit = useCan(CAN.manageExams);
  const { data: exam, loading, reload } = useApi(() => examsApi.get(id), [id]);
  const [rows, setRows] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const inputs = useRef([]);

  useEffect(() => {
    if (exam) {
      setRows(exam.rows.map((r) => ({ student: r.student, score: r.score ?? '', absent: Boolean(r.absent), comment: r.comment ?? '' })));
      setDirty(false);
    }
  }, [exam]);

  const set = (i, patch) => { setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r))); setDirty(true); };
  const stats = useMemo(() => {
    const scored = rows.filter((r) => !r.absent && r.score !== '' && !Number.isNaN(Number(r.score))).map((r) => Number(r.score));
    return {
      graded: scored.length,
      average: scored.length ? Math.round((scored.reduce((s, v) => s + v, 0) / scored.length) * 100) / 100 : null,
      passed: exam ? scored.filter((v) => v >= exam.passScore).length : 0,
      best: scored.length ? Math.max(...scored) : null,
    };
  }, [rows, exam]);

  if (loading && !exam) return <Loader full />;
  if (!exam) return <EmptyState title="Exam not found" />;

  const save = async () => {
    setSaving(true);
    try {
      await examsApi.saveResults(id, rows.map((r) => ({ student: r.student._id, score: r.score === '' ? null : Number(r.score), absent: r.absent, comment: r.comment })));
      toast.success('Results saved', exam.type === 'final' ? 'Final results of the level were updated.' : undefined);
      reload();
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!(await confirm({ title: `Delete ${exam.title}?`, message: 'The results typed for this exam are deleted too.', danger: true, confirmLabel: 'Delete' }))) return;
    await examsApi.remove(id);
    toast.success('Exam deleted');
    navigate('/exams');
  };
  const invalid = (r) => r.score !== '' && (Number(r.score) < 0 || Number(r.score) > exam.maxScore || Number.isNaN(Number(r.score)));

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Exams', to: '/exams' }, { label: exam.title }]}
        title={<span className="d-inline-flex gap-2 align-items-center">{exam.title} <StatusBadge map={EXAM_TYPES} value={exam.type} dot={false} /></span>}
        subtitle={<><Link to={`/groups/${exam.group?._id}`}>{exam.group?.name}</Link> · {exam.program?.name} {levelName(exam.levelNumber, exam.program)} · {formatDate(exam.date)} · graded /{exam.maxScore}, pass at {exam.passScore}</>}
        actions={canEdit && (
          <>
            <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button>
            <Button variant="ghost" icon={Trash2} onClick={remove} aria-label="Delete" />
          </>
        )}
      />
      <div className="row g-3 mb-3">
        <div className="col-6 col-lg-3"><StatCard label="Graded" value={`${stats.graded}/${rows.length}`} tone="blue" /></div>
        <div className="col-6 col-lg-3"><StatCard label="Average" value={stats.average ?? '—'} hint={`out of ${exam.maxScore}`} tone="purple" /></div>
        <div className="col-6 col-lg-3"><StatCard label="Passed" value={stats.passed} hint={stats.graded ? `${Math.round((stats.passed / stats.graded) * 100)}%` : ''} tone="green" /></div>
        <div className="col-6 col-lg-3"><StatCard label="Best score" value={stats.best ?? '—'} tone="amber" /></div>
      </div>
      <Card padded={false} title="Results" subtitle="Type a score and press Enter to go to the next student." actions={canEdit && <Button icon={Save} loading={saving} disabled={!dirty || rows.some(invalid)} onClick={save}>Save results</Button>}>
        {rows.length ? (
          <div className="table-scroll mt-3">
            <table className="table-eltc">
              <thead><tr><th style={{ width: 40 }}>#</th><th>Student</th><th style={{ width: 150 }}>Score / {exam.maxScore}</th><th style={{ width: 90 }}>Absent</th><th>Comment</th><th style={{ width: 100 }}>Result</th></tr></thead>
              <tbody>
                {rows.map((r, i) => {
                  const has = r.score !== '' && !r.absent;
                  const pass = has && Number(r.score) >= exam.passScore;
                  return (
                    <tr key={r.student._id}>
                      <td className="fg-subtle">{i + 1}</td>
                      <td><div className="d-flex align-items-center gap-2"><Avatar person={r.student} size={30} /><span className="fw-600 fg-ink">{fullName(r.student)}</span></div></td>
                      <td>
                        <input
                          ref={(el) => { inputs.current[i] = el; }}
                          className={`form-control form-control-sm ${styles.score} ${invalid(r) ? 'is-invalid' : ''}`}
                          type="number" step="0.25" min="0" max={exam.maxScore} inputMode="decimal"
                          value={r.absent ? '' : r.score}
                          disabled={r.absent || !canEdit}
                          onChange={(e) => set(i, { score: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); inputs.current[i + 1]?.focus(); inputs.current[i + 1]?.select(); } }}
                        />
                      </td>
                      <td><input type="checkbox" className="form-check-input" checked={r.absent} disabled={!canEdit} onChange={(e) => set(i, { absent: e.target.checked, score: '' })} /></td>
                      <td><input className="form-control form-control-sm" value={r.comment} disabled={!canEdit} onChange={(e) => set(i, { comment: e.target.value })} placeholder="Optional" /></td>
                      <td>{r.absent ? <Badge tone="gray">Absent</Badge> : has ? <Badge tone={pass ? 'green' : 'red'}>{pass ? 'Pass' : 'Fail'}</Badge> : <span className="fg-subtle">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <EmptyState compact title="No student in this group" />}
      </Card>
      <ExamFormModal open={editing} exam={{ ...exam, group: exam.group?._id }} onClose={() => setEditing(false)} onSaved={reload} />
    </>
  );
};

export default ExamDetail;
