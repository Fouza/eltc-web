import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { examsApi, groupsApi } from '@api/endpoints';
import { Button, Field, Modal } from '@components';
import { todayInput, toInputDate, levelName } from '@helpers/format';
import { toast } from '@helpers/toast';
import { EXAM_TYPES } from '@data/enums';

const ExamFormModal = ({ open, onClose, onSaved, exam, group: fixedGroup }) => {
  const settings = useSelector((s) => s.refs.settings);
  const campus = useSelector((s) => s.ui.campus);
  const [groups, setGroups] = useState([]);
  const [f, setF] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!fixedGroup && !exam) groupsApi.list({ status: 'ongoing,planned', campus }).then(setGroups);
    setF(exam
      ? { ...exam, date: toInputDate(exam.date) }
      : { group: fixedGroup?._id ?? '', title: '', type: 'quiz', date: todayInput(), maxScore: settings?.defaultMaxScore ?? 20, passScore: settings?.defaultPassScore ?? 10, coefficient: 1 });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const save = async () => {
    setSaving(true);
    try {
      const data = { group: f.group, title: f.title, type: f.type, date: f.date, maxScore: Number(f.maxScore), passScore: Number(f.passScore), coefficient: Number(f.coefficient), notes: f.notes };
      const saved = exam ? await examsApi.update(exam._id, data) : await examsApi.create(data);
      toast.success(exam ? 'Exam updated' : 'Exam scheduled');
      onSaved?.(saved);
      onClose();
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={exam ? 'Edit exam' : 'Schedule an exam'} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} disabled={!f.group || !f.title || !f.date} onClick={save}>Save</Button></>}>
      {!fixedGroup && !exam && (
        <Field label="Group" required>
          <select className="form-select" value={f.group ?? ''} onChange={(e) => set('group', e.target.value)}>
            <option value="">Choose…</option>
            {groups.map((g) => <option key={g._id} value={g._id}>{g.name} · {g.program?.name} {levelName(g.levelNumber, g.program)}</option>)}
          </select>
        </Field>
      )}
      <div className="row">
        <div className="col-sm-7"><Field label="Title" required><input className="form-control" value={f.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder="Quiz 2, Final exam…" /></Field></div>
        <div className="col-sm-5">
          <Field label="Type" hint={f.type === 'final' ? 'Sets the pass/fail result of the level' : undefined}>
            <select className="form-select" value={f.type} onChange={(e) => { set('type', e.target.value); if (!f.title) set('title', EXAM_TYPES[e.target.value].label); }}>
              {Object.entries(EXAM_TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="col-sm-6"><Field label="Date" required><input type="date" className="form-control" value={f.date ?? ''} onChange={(e) => set('date', e.target.value)} /></Field></div>
        <div className="col-sm-6"><Field label="Weight" hint="Coefficient for averages"><input type="number" min="0" step="0.5" className="form-control" value={f.coefficient ?? 1} onChange={(e) => set('coefficient', e.target.value)} /></Field></div>
        <div className="col-sm-6"><Field label="Graded out of"><input type="number" min="1" className="form-control" value={f.maxScore ?? ''} onChange={(e) => set('maxScore', e.target.value)} /></Field></div>
        <div className="col-sm-6"><Field label="Pass mark"><input type="number" min="0" className="form-control" value={f.passScore ?? ''} onChange={(e) => set('passScore', e.target.value)} /></Field></div>
      </div>
    </Modal>
  );
};

export default ExamFormModal;
