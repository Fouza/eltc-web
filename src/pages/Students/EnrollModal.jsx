import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { groupsApi, enrollmentsApi } from '@api/endpoints';
import { Button, Field, Modal, ProgressBar, StudentPicker, Badge } from '@components';
import { money, scheduleLabel, todayInput, fullName, formatDate } from '@helpers/format';
import { toast } from '@helpers/toast';

// Put a student in a group: fee comes from the level (or the group), discount, installments.
const EnrollModal = ({ open, onClose, onSaved, student: fixedStudent, group: fixedGroup }) => {
  const settings = useSelector((s) => s.refs.settings);
  const [student, setStudent] = useState(null);
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStudent(fixedStudent ?? null);
    setGroupId(fixedGroup?._id ?? '');
    setForm({ discount: '', discountReason: '', installments: settings?.defaultInstallments ?? 1, firstDueDate: todayInput(), fee: '' });
    groupsApi.list({ status: 'ongoing,planned' }).then(setGroups);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Suggest the groups matching what the student asked for on the form.
  const sorted = useMemo(() => {
    const wanted = (g) => (student?.desiredProgram && (g.program?._id === (student.desiredProgram?._id ?? student.desiredProgram)) ? 2 : 0) + (student?.desiredLevel === g.levelNumber ? 1 : 0);
    return [...groups].sort((a, b) => wanted(b) - wanted(a) || a.name.localeCompare(b.name));
  }, [groups, student]);
  const group = groups.find((g) => g._id === groupId);
  const defaultFee = group ? group.fee ?? group.level?.fee ?? 0 : 0;
  const fee = form.fee === '' ? defaultFee : Number(form.fee);
  const net = Math.max(0, fee - Number(form.discount || 0));
  const full = group && group.enrolledCount >= group.capacity;

  const save = async () => {
    setSaving(true);
    try {
      const res = await enrollmentsApi.create({
        studentId: student._id,
        groupId,
        fee,
        discount: Number(form.discount || 0),
        discountReason: form.discountReason || undefined,
        installments: Number(form.installments),
        firstDueDate: form.firstDueDate,
        force: full,
      });
      toast.success(`${fullName(student)} enrolled in ${group.name}`, res.invoices.length ? `${res.invoices.length} installment(s) created` : undefined);
      onSaved?.(res);
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
      title="Enroll in a group"
      subtitle="Invoices are created automatically from the level fee."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={!student || !group} loading={saving} onClick={save}>{full ? 'Enroll anyway (group full)' : 'Enroll'}</Button>
        </>
      }
    >
      {!fixedStudent && (
        <Field label="Student" required>
          <StudentPicker value={student} onChange={setStudent} autoFocus />
        </Field>
      )}
      <Field label="Group" required hint={student?.desiredProgram ? 'Groups matching what the student asked for are listed first.' : undefined}>
        <select className="form-select" value={groupId} onChange={(e) => { setGroupId(e.target.value); setForm((f) => ({ ...f, fee: '' })); }} disabled={Boolean(fixedGroup)}>
          <option value="">Choose a group…</option>
          {sorted.map((g) => (
            <option key={g._id} value={g._id}>
              {g.name} — {g.program?.name} L{g.levelNumber} · {g.campus?.code} · {g.enrolledCount}/{g.capacity}
              {g.status === 'planned' ? ' · starts ' + formatDate(g.startDate) : ''}
            </option>
          ))}
        </select>
      </Field>
      {group && (
        <div className="p-3 rounded-4 bg-blue-50 mb-3">
          <div className="d-flex justify-content-between flex-wrap gap-2">
            <div>
              <div className="fw-700">{group.program?.name} · {group.level?.name ?? `Level ${group.levelNumber}`}</div>
              <div className="fs-12 fg-muted">{scheduleLabel(group.schedule)} · {fullName(group.teacher)} · {group.campus?.name}</div>
            </div>
            {full ? <Badge tone="red">Full</Badge> : <Badge tone="green">{group.capacity - group.enrolledCount} seats left</Badge>}
          </div>
          <div className="mt-2"><ProgressBar value={group.enrolledCount} max={group.capacity} /></div>
        </div>
      )}
      {group && (
        <div className="row g-3">
          <div className="col-sm-4">
            <Field label="Fee" hint={`Level fee: ${money(defaultFee)}`}>
              <input className="form-control" type="number" min="0" value={form.fee === '' ? defaultFee : form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} />
            </Field>
          </div>
          <div className="col-sm-4">
            <Field label="Discount">
              <input className="form-control" type="number" min="0" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} placeholder="0" />
            </Field>
          </div>
          <div className="col-sm-4">
            <Field label="Discount reason">
              <input className="form-control" value={form.discountReason} onChange={(e) => setForm({ ...form, discountReason: e.target.value })} placeholder="Sibling, staff…" />
            </Field>
          </div>
          <div className="col-sm-6">
            <Field label="Pay in" hint={Number(form.installments) > 1 ? `${form.installments} × ~${money(net / Number(form.installments))}, monthly` : 'One payment'}>
              <select className="form-select" value={form.installments} onChange={(e) => setForm({ ...form, installments: e.target.value })}>
                {[1, 2, 3, 4, 6].map((n) => <option key={n} value={n}>{n === 1 ? 'One payment' : `${n} installments`}</option>)}
              </select>
            </Field>
          </div>
          <div className="col-sm-6">
            <Field label="First payment due">
              <input className="form-control" type="date" value={form.firstDueDate} onChange={(e) => setForm({ ...form, firstDueDate: e.target.value })} />
            </Field>
          </div>
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center p-3 rounded-4 border">
              <span className="fw-600">Total to pay</span>
              <b className="fs-20 fg-blue tabular">{money(net)}</b>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default EnrollModal;
