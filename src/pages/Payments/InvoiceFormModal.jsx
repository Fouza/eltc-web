import { useEffect, useState } from 'react';
import { invoicesApi } from '@api/endpoints';
import { Button, Field, Modal, StudentPicker } from '@components';
import { todayInput, toInputDate } from '@helpers/format';
import { toast } from '@helpers/toast';

// New manual invoice (registration fee, books, exam fee…) or edit an existing one.
const InvoiceFormModal = ({ open, onClose, onSaved, student: fixedStudent, invoice }) => {
  const [student, setStudent] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStudent(fixedStudent ?? invoice?.student ?? null);
    setForm(invoice ? { label: invoice.label, amount: invoice.amount, dueDate: toInputDate(invoice.dueDate), notes: invoice.notes ?? '' } : { label: 'Registration fee', amount: '', dueDate: todayInput(), notes: '' });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setSaving(true);
    try {
      const data = { ...form, amount: Number(form.amount) };
      const saved = invoice ? await invoicesApi.update(invoice._id, data) : await invoicesApi.create({ ...data, student: student._id });
      toast.success(invoice ? 'Invoice updated' : 'Invoice created');
      onSaved?.(saved);
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
      title={invoice ? `Edit ${invoice.number}` : 'New invoice'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={saving} disabled={!student || !form.label || !(Number(form.amount) >= 0) || !form.dueDate} onClick={save}>Save</Button>
        </>
      }
    >
      {!invoice && (
        <Field label="Student" required>
          <StudentPicker value={student} onChange={fixedStudent ? () => {} : setStudent} />
        </Field>
      )}
      <Field label="Label" required>
        <input className="form-control" value={form.label ?? ''} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Registration fee, books, exam fee…" />
      </Field>
      <div className="row g-3">
        <div className="col-6">
          <Field label="Amount" required>
            <input className="form-control" type="number" min="0" value={form.amount ?? ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
        </div>
        <div className="col-6">
          <Field label="Due date" required>
            <input className="form-control" type="date" value={form.dueDate ?? ''} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </Field>
        </div>
      </div>
      <Field label="Notes">
        <textarea className="form-control" rows={2} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </Field>
    </Modal>
  );
};

export default InvoiceFormModal;
