import { useEffect, useMemo, useState } from 'react';
import { groupsApi } from '@api/endpoints';
import { Button, Field, Modal, StatusBadge, Badge } from '@components';
import { formatDate, fullName, money, scheduleLabel, levelName } from '@helpers/format';
import { buildMonthlyPlan } from '@helpers/paymentPlan';
import { toast } from '@helpers/toast';
import { FINAL_RESULTS } from '@data/enums';

// End of level: send the students who passed to a next-level group (creates their enrollment + invoices).
const PromoteModal = ({ open, onClose, group, onSaved, onCreateNext }) => {
  const [targets, setTargets] = useState([]);
  const [target, setTarget] = useState('');
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const nextLevel = group ? levelName(group.levelNumber + 1, group.program) : '';
  const candidates = useMemo(() => (group?.roster ?? []).filter((e) => ['active', 'completed'].includes(e.status)), [group]);

  useEffect(() => {
    if (!open || !group) return;
    setSelected(candidates.filter((e) => e.finalResult === 'passed').map((e) => e.student._id));
    groupsApi.list({ program: group.program._id, status: 'planned,ongoing' }).then((gs) => {
      const next = gs.filter((g) => g.levelNumber === group.levelNumber + 1);
      setTargets(next);
      setTarget(next[0]?._id ?? '');
    });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const targetGroup = targets.find((g) => g._id === target);
  const targetPlan = targetGroup
    ? buildMonthlyPlan({ total: targetGroup.fee ?? targetGroup.level?.fee ?? 0, weeks: targetGroup.level?.durationWeeks ?? 0, startDate: targetGroup.startDate }).plan
    : [];
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const save = async () => {
    setSaving(true);
    try {
      const res = await groupsApi.promote(group._id, { targetGroupId: target, studentIds: selected });
      toast.success(`${res.promoted} students moved to the next level`, res.skipped.length ? `${res.skipped.length} skipped` : undefined);
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`Promote to ${nextLevel}`}
      subtitle="Selected students finish this group and are enrolled in the next-level group with new invoices."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!target || !selected.length} loading={saving} onClick={save}>Promote {selected.length} students</Button></>}
    >
      {!targets.length ? (
        <div className="p-3 rounded-4 bg-blue-50 d-flex justify-content-between align-items-center gap-3">
          <div>
            <div className="fw-700">No {nextLevel} group yet</div>
            <div className="fs-13 fg-muted">Create the next group first (same program, level {nextLevel}).</div>
          </div>
          <Button variant="primary" size="sm" onClick={onCreateNext}>Create it</Button>
        </div>
      ) : (
        <>
          <Field label="Next group">
            <select className="form-select" value={target} onChange={(e) => setTarget(e.target.value)}>
              {targets.map((g) => <option key={g._id} value={g._id}>{g.name} · {g.campus?.code} · {scheduleLabel(g.schedule)} · {g.enrolledCount}/{g.capacity}</option>)}
            </select>
          </Field>
          {targetGroup && (
            <div className="p-3 rounded-4 bg-blue-50 fs-13 mb-3">
              Each student is invoiced monthly for the new level:{' '}
              <b>{targetPlan.filter((m) => !m.skipped).map((m) => money(m.amount)).join(' + ')}</b>, the first due {formatDate(targetPlan.find((m) => !m.skipped)?.dueDate)}.
              {' '}The new level's books are charged too.
            </div>
          )}
        </>
      )}
      <div className="ls-up mt-2 mb-2">Students ({selected.length} selected)</div>
      <div className="border rounded-3">
        {candidates.map((e) => (
          <label key={e._id} className="d-flex align-items-center gap-3 px-3 py-2 border-bottom cursor-pointer">
            <input type="checkbox" className="form-check-input m-0" checked={selected.includes(e.student._id)} onChange={() => toggle(e.student._id)} />
            <span className="flex-grow-1 fw-600">{fullName(e.student)}</span>
            {e.finalScore !== undefined && e.finalScore !== null && <Badge tone="gray">{e.finalScore}</Badge>}
            <StatusBadge map={FINAL_RESULTS} value={e.finalResult} />
          </label>
        ))}
      </div>
    </Modal>
  );
};

export default PromoteModal;
