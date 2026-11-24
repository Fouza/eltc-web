import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { booksApi, groupsApi, enrollmentsApi } from '@api/endpoints';
import { Button, Field, Modal, ProgressBar, StudentPicker, Badge, Segmented } from '@components';
import { money, scheduleLabel, todayInput, fullName, formatDate, levelName } from '@helpers/format';
import { toast } from '@helpers/toast';
import { buildMonthlyPlan, weeksLabel } from '@helpers/paymentPlan';

// Put a student in a group: fee comes from the level (or the group), discount, then the payment plan.
// Every 4 weeks (default): the fee paid in 4-week blocks, each due on its first day. Custom: a hand-made split.
const EnrollModal = ({ open, onClose, onSaved, student: fixedStudent, group: fixedGroup }) => {
  const [student, setStudent] = useState(null);
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [levelBooks, setLevelBooks] = useState([]);
  const [skipped, setSkipped] = useState([]); // books the student already has

  useEffect(() => {
    if (!open) return;
    setStudent(fixedStudent ?? null);
    setGroupId(fixedGroup?._id ?? '');
    setForm({ discount: '', discountReason: '', plan: 'monthly', installments: 2, firstDueDate: todayInput(), fee: '' });
    groupsApi.list({ status: 'ongoing,planned' }).then(setGroups);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Suggest the groups matching what the student asked for on the form.
  const sorted = useMemo(() => {
    const wanted = (g) => (student?.desiredProgram && (g.program?._id === (student.desiredProgram?._id ?? student.desiredProgram)) ? 2 : 0) + (student?.desiredLevel === g.levelNumber ? 1 : 0);
    return [...groups].sort((a, b) => wanted(b) - wanted(a) || a.name.localeCompare(b.name));
  }, [groups, student]);
  const group = groups.find((g) => g._id === groupId);
  useEffect(() => {
    setSkipped([]);
    if (!group) { setLevelBooks([]); return; }
    booksApi.list({ program: group.program?._id, level: group.levelNumber, active: 'true', withImage: 'false' }).then(setLevelBooks);
  }, [groupId, groups.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const charged = levelBooks.filter((b) => !skipped.includes(b._id));
  const booksTotal = charged.reduce((s, b) => s + b.price, 0);
  const defaultFee = group ? group.fee ?? group.level?.fee ?? 0 : 0;
  const fee = form.fee === '' ? defaultFee : Number(form.fee);
  const net = Math.max(0, fee - Number(form.discount || 0));
  const full = group && group.enrolledCount >= group.capacity;
  const weeks = group ? group.level?.durationWeeks ?? (group.startDate && group.endDate ? dayjs(group.endDate).diff(group.startDate, 'week') : 0) : 0;
  const monthly = group ? buildMonthlyPlan({ total: net, weeks, startDate: group.startDate }) : null;
  const toPay = form.plan === 'custom' ? net : (monthly?.plan ?? []).reduce((s, m) => s + (m.amount ?? 0), 0);

  const save = async () => {
    setSaving(true);
    try {
      const res = await enrollmentsApi.create({
        studentId: student._id,
        groupId,
        fee,
        discount: Number(form.discount || 0),
        discountReason: form.discountReason || undefined,
        plan: form.plan,
        ...(form.plan === 'custom' ? { installments: Number(form.installments), firstDueDate: form.firstDueDate } : {}),
        force: full,
        books: charged.map((b) => b._id),
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
              {g.name} — {g.program?.name} {levelName(g.levelNumber, g.program)} · {g.campus?.code} · {g.enrolledCount}/{g.capacity}
              {g.status === 'planned' ? ' · starts ' + formatDate(g.startDate) : ''}
            </option>
          ))}
        </select>
      </Field>
      {group && (
        <div className="p-3 rounded-4 bg-blue-50 mb-3">
          <div className="d-flex justify-content-between flex-wrap gap-2">
            <div>
              <div className="fw-700">{group.program?.name} · {group.level?.name ?? levelName(group.levelNumber, group.program)}</div>
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
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
              <span className="form-label m-0">Payment plan</span>
              <Segmented
                size="sm"
                value={form.plan}
                onChange={(plan) => setForm({ ...form, plan })}
                options={[{ value: 'monthly', label: 'Every 4 weeks' }, { value: 'custom', label: 'Custom' }]}
              />
            </div>
            {form.plan === 'monthly' ? (
              <div className="border rounded-4">
                <div className="px-3 py-2 fs-12 fg-muted border-bottom">
                  {monthly.weeks} weeks = {monthly.blocks} block{monthly.blocks > 1 ? 's' : ''} of 4 weeks · {money(monthly.perBlock)} per block, due on its first day. Overdue when the next block starts unpaid.
                </div>
                {monthly.plan.map((m) => (
                  <div key={m.index} className={`d-flex justify-content-between align-items-center px-3 py-2 border-bottom fs-13 ${m.skipped ? 'fg-subtle' : ''}`}>
                    <span className="fw-600">{weeksLabel(m)}</span>
                    <span>{m.skipped ? 'Already over: not charged' : `Due ${formatDate(m.dueDate)} · overdue from ${formatDate(m.overdueAt)}`}</span>
                    <b className="tabular">{m.skipped ? '—' : money(m.amount)}</b>
                  </div>
                ))}
              </div>
            ) : (
              <div className="row g-3">
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
              </div>
            )}
          </div>
          {levelBooks.length > 0 && (
            <div className="col-12">
              <div className="form-label">Books for this level</div>
              <div className="border rounded-4">
                {levelBooks.map((b) => {
                  const on = !skipped.includes(b._id);
                  return (
                    <label key={b._id} className={`d-flex align-items-center gap-2 px-3 py-2 border-bottom fs-13 cursor-pointer ${on ? '' : 'fg-subtle'}`}>
                      <input type="checkbox" className="form-check-input m-0" checked={on} onChange={() => setSkipped((s) => (on ? [...s, b._id] : s.filter((x) => x !== b._id)))} />
                      <span className="fw-600 flex-grow-1">{b.title}</span>
                      <span>{on ? 'Due now · overdue at the end of the level' : 'Already has it'}</span>
                      <b className="tabular ms-3">{on ? money(b.price) : '—'}</b>
                    </label>
                  );
                })}
              </div>
              <div className="form-text">Untick a book the student already has. Discounts don't apply to books.</div>
            </div>
          )}
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center p-3 rounded-4 border">
              <span className="fw-600">
                Total to pay{form.plan === 'monthly' && toPay < net ? ` (weeks left, out of ${money(net)})` : ''}
                {booksTotal > 0 && <span className="d-block fs-12 fg-muted fw-500">{money(toPay)} course + {money(booksTotal)} books</span>}
              </span>
              <b className="fs-20 fg-blue tabular">{money(toPay + booksTotal)}</b>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default EnrollModal;
