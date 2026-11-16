import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Printer } from 'lucide-react';
import { invoicesApi, paymentsApi } from '@api/endpoints';
import { Button, Field, Modal, StudentPicker, Badge } from '@components';
import { formatDate, money, todayInput } from '@helpers/format';
import { toast } from '@helpers/toast';
import { PAYMENT_METHODS } from '@data/enums';

// Pick a student (or get one passed in) → one of their open invoices → amount, method, date.
const RecordPaymentModal = ({ open, onClose, onSaved, student: fixedStudent, invoice: fixedInvoice }) => {
  const navigate = useNavigate();
  const [student, setStudent] = useState(fixedStudent ?? null);
  const [invoices, setInvoices] = useState([]);
  const [invoiceId, setInvoiceId] = useState('');
  const [form, setForm] = useState({ amount: '', method: 'cash', paidAt: todayInput(), reference: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStudent(fixedStudent ?? null);
    setInvoiceId(fixedInvoice?._id ?? '');
    setForm({ amount: '', method: 'cash', paidAt: todayInput(), reference: '', notes: '' });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || !student) return setInvoices([]);
    invoicesApi.list({ student: student._id, status: 'open', limit: 50 }).then((r) => {
      setInvoices(r.items);
      const first = fixedInvoice ? r.items.find((i) => i._id === fixedInvoice._id) : r.items[0];
      if (first) {
        setInvoiceId(first._id);
        setForm((f) => ({ ...f, amount: String(first.amount - first.paidAmount) }));
      }
    });
  }, [open, student]); // eslint-disable-line react-hooks/exhaustive-deps

  const invoice = invoices.find((i) => i._id === invoiceId);
  const remaining = invoice ? invoice.amount - invoice.paidAmount : 0;

  const save = async (print) => {
    setSaving(true);
    try {
      const payment = await paymentsApi.create({ invoiceId, ...form, amount: Number(form.amount) });
      toast.success('Payment recorded', `${money(payment.amount)} · receipt ${payment.receiptNumber}`);
      onSaved?.(payment);
      onClose();
      if (print) navigate(`/payments/${payment._id}/receipt`);
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  const valid = invoice && Number(form.amount) > 0 && Number(form.amount) <= remaining;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record a payment"
      subtitle="A receipt number is generated automatically."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="soft" icon={Printer} disabled={!valid} loading={saving} onClick={() => save(true)}>Save & print receipt</Button>
          <Button disabled={!valid} loading={saving} onClick={() => save(false)}>Save payment</Button>
        </>
      }
    >
      <Field label="Student" required>
        {fixedStudent ? <StudentPicker value={student} onChange={() => {}} /> : <StudentPicker value={student} onChange={setStudent} autoFocus />}
      </Field>
      {student && (
        <Field label="What is being paid" required hint={!invoices.length ? 'This student has nothing left to pay.' : undefined}>
          <div className="d-flex flex-column gap-2">
            {invoices.map((inv) => (
              <label key={inv._id} className={`d-flex align-items-center gap-3 p-2 px-3 rounded-3 border cursor-pointer ${invoiceId === inv._id ? 'border-primary bg-blue-50' : ''}`}>
                <input
                  type="radio"
                  className="form-check-input m-0"
                  checked={invoiceId === inv._id}
                  onChange={() => { setInvoiceId(inv._id); setForm((f) => ({ ...f, amount: String(inv.amount - inv.paidAmount) })); }}
                />
                <div className="flex-grow-1 min-w-0">
                  <div className="fw-600 text-ellipsis">{inv.label}</div>
                  <div className="fs-12 fg-muted">{inv.number} · due {formatDate(inv.dueDate)}</div>
                </div>
                {inv.isOverdue && <Badge tone="red">Overdue</Badge>}
                <b className="tabular">{money(inv.amount - inv.paidAmount)}</b>
              </label>
            ))}
          </div>
        </Field>
      )}
      {invoice && (
        <div className="row g-3">
          <div className="col-sm-6">
            <Field label="Amount" required hint={`Remaining: ${money(remaining)}`} error={Number(form.amount) > remaining ? 'Higher than what remains' : undefined}>
              <input className="form-control" type="number" min="0" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
          </div>
          <div className="col-sm-6">
            <Field label="Date">
              <input className="form-control" type="date" value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} />
            </Field>
          </div>
          <div className="col-sm-6">
            <Field label="Method">
              <select className="form-select" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
          <div className="col-sm-6">
            <Field label="Reference" hint="Cheque or transfer number">
              <input className="form-control" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </Field>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default RecordPaymentModal;
