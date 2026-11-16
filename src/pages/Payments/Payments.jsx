import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import dayjs from 'dayjs';
import { Download, FilePlus2, Plus, Printer, Receipt, Trash2, Wallet } from 'lucide-react';
import { invoicesApi, paymentsApi } from '@api/endpoints';
import { useApi, useCampus, useCan } from '@helpers/hooks';
import { formatDate, fromNow, fullName, money } from '@helpers/format';
import { downloadFile, toCsv } from '@helpers/csv';
import { toast } from '@helpers/toast';
import { useConfirm } from '@context/ConfirmContext';
import { Badge, Button, Card, EmptyState, Loader, PageHeader, Pagination, Segmented, StatCard, StatusBadge, Tabs } from '@components';
import { CAN } from '@data/roles';
import { INVOICE_STATUS, PAYMENT_METHODS } from '@data/enums';
import RecordPaymentModal from './RecordPaymentModal';
import InvoiceFormModal from './InvoiceFormModal';

const InvoicesTab = ({ onPay }) => {
  const campus = useCampus();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'open';
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const canEdit = useCan(CAN.manageInvoices);
  const confirm = useConfirm();
  const { data, loading, reload } = useApi(() => invoicesApi.list({ status: status === 'all' ? '' : status, campus, page }), [status, campus, page]);

  const cancel = async (inv) => {
    if (!(await confirm({ title: `Cancel ${inv.number}?`, message: 'The student will no longer owe this amount.', danger: true, confirmLabel: 'Cancel invoice' }))) return;
    try {
      await invoicesApi.cancel(inv._id);
      toast.success('Invoice cancelled');
      reload();
    } catch (err) { toast.error(err); }
  };

  const exportCsv = async () => {
    const all = await invoicesApi.list({ status: status === 'all' ? '' : status, campus, limit: 200 });
    downloadFile(
      toCsv(all.items, [
        { label: 'Number', value: (i) => i.number },
        { label: 'Student', value: (i) => fullName(i.student) },
        { label: 'Phone', value: (i) => i.student?.phone ?? i.student?.guardian?.phone },
        { label: 'Label', value: (i) => i.label },
        { label: 'Due date', value: (i) => dayjs(i.dueDate).format('YYYY-MM-DD') },
        { label: 'Amount', value: (i) => i.amount },
        { label: 'Paid', value: (i) => i.paidAmount },
        { label: 'Remaining', value: (i) => i.amount - i.paidAmount },
        { label: 'Status', value: (i) => (i.isOverdue ? 'overdue' : i.status) },
      ]),
      `invoices-${status}-${dayjs().format('YYYY-MM-DD')}.csv`,
    );
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-3">
        <Segmented
          value={status}
          onChange={(v) => { setPage(1); setParams((p) => { p.set('status', v); return p; }); }}
          options={[
            { value: 'open', label: 'To collect' },
            { value: 'overdue', label: 'Overdue', tone: 'red' },
            { value: 'paid', label: 'Paid' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'all', label: 'All' },
          ]}
        />
        <Button variant="secondary" size="sm" icon={Download} onClick={exportCsv}>Export CSV</Button>
      </div>
      {data && (
        <div className="row g-3 mb-3">
          <div className="col-md-4"><StatCard label="Total" value={money(data.totals.amount)} hint={`${data.total} invoices`} icon={Receipt} tone="blue" /></div>
          <div className="col-md-4"><StatCard label="Already paid" value={money(data.totals.paid)} icon={Wallet} tone="green" /></div>
          <div className="col-md-4"><StatCard label="Remaining" value={money(data.totals.remaining)} icon={Wallet} tone={status === 'overdue' ? 'red' : 'amber'} /></div>
        </div>
      )}
      <Card padded={false}>
        {loading && !data ? <Loader /> : data?.items.length ? (
          <>
            <div className="table-scroll">
              <table className="table-eltc">
                <thead>
                  <tr><th>Student</th><th>For</th><th>Due</th><th className="num">Amount</th><th className="num">Remaining</th><th>Status</th><th /></tr>
                </thead>
                <tbody>
                  {data.items.map((inv) => (
                    <tr key={inv._id}>
                      <td>
                        <Link to={`/students/${inv.student?._id}?tab=payments`} className="fw-600 fg-ink">{fullName(inv.student)}</Link>
                        <div className="fs-12 fg-subtle">{inv.student?.phone ?? inv.student?.guardian?.phone ?? inv.student?.studentNumber}</div>
                      </td>
                      <td>
                        <div className="fw-600">{inv.label}</div>
                        <div className="fs-12 fg-subtle">{inv.number}</div>
                      </td>
                      <td>
                        <div>{formatDate(inv.dueDate)}</div>
                        {inv.isOverdue && <div className="fs-12 fg-red fw-600">{fromNow(inv.dueDate)}</div>}
                      </td>
                      <td className="num">{money(inv.amount)}</td>
                      <td className="num fw-700">{money(inv.amount - inv.paidAmount)}</td>
                      <td>{inv.isOverdue ? <StatusBadge map={INVOICE_STATUS} value="overdue" /> : <StatusBadge map={INVOICE_STATUS} value={inv.status} />}</td>
                      <td className="text-end text-nowrap">
                        {['unpaid', 'partial'].includes(inv.status) && <Button size="sm" variant="soft" onClick={() => onPay(inv)}>Collect</Button>}
                        {canEdit && inv.status !== 'cancelled' && inv.status !== 'paid' && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setEditing(inv)}>Edit</Button>
                            {inv.paidAmount === 0 && <Button size="sm" variant="ghost" onClick={() => cancel(inv)}>Cancel</Button>}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} pages={data.pages} total={data.total} limit={data.limit} onChange={setPage} />
          </>
        ) : (
          <EmptyState icon={Receipt} title="No invoice" message={status === 'overdue' ? 'Nobody is late on a payment. 🎉' : 'Nothing matches this filter.'} />
        )}
      </Card>
      <InvoiceFormModal open={Boolean(editing)} invoice={editing} onClose={() => setEditing(null)} onSaved={reload} />
    </>
  );
};

const PaymentsTab = ({ refreshKey }) => {
  const campus = useCampus();
  const [range, setRange] = useState({ from: dayjs().startOf('month').format('YYYY-MM-DD'), to: dayjs().format('YYYY-MM-DD') });
  const [method, setMethod] = useState('');
  const [page, setPage] = useState(1);
  const canDelete = useCan(CAN.deletePayments);
  const confirm = useConfirm();
  const { data, loading, reload } = useApi(() => paymentsApi.list({ ...range, method, campus, page }), [range, method, campus, page, refreshKey]);

  const remove = async (p) => {
    if (!(await confirm({ title: `Delete receipt ${p.receiptNumber}?`, message: 'The invoice will be marked as unpaid again. Use this only to fix a mistake.', danger: true, confirmLabel: 'Delete' }))) return;
    try {
      await paymentsApi.remove(p._id);
      toast.success('Payment deleted');
      reload();
    } catch (err) { toast.error(err); }
  };

  const exportCsv = async () => {
    const all = await paymentsApi.list({ ...range, method, campus, limit: 200 });
    downloadFile(
      toCsv(all.items, [
        { label: 'Receipt', value: (p) => p.receiptNumber },
        { label: 'Date', value: (p) => dayjs(p.paidAt).format('YYYY-MM-DD') },
        { label: 'Student', value: (p) => fullName(p.student) },
        { label: 'For', value: (p) => p.invoice?.label },
        { label: 'Method', value: (p) => PAYMENT_METHODS[p.method] },
        { label: 'Amount', value: (p) => p.amount },
        { label: 'Received by', value: (p) => fullName(p.receivedBy) },
      ]),
      `payments-${range.from}-${range.to}.csv`,
    );
  };

  return (
    <>
      <div className="d-flex gap-2 flex-wrap align-items-end mb-3">
        <div><label className="form-label">From</label><input type="date" className="form-control" value={range.from} onChange={(e) => { setPage(1); setRange({ ...range, from: e.target.value }); }} /></div>
        <div><label className="form-label">To</label><input type="date" className="form-control" value={range.to} onChange={(e) => { setPage(1); setRange({ ...range, to: e.target.value }); }} /></div>
        <div>
          <label className="form-label">Method</label>
          <select className="form-select" value={method} onChange={(e) => { setPage(1); setMethod(e.target.value); }}>
            <option value="">All methods</option>
            {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <Button variant="secondary" icon={Download} className="ms-auto" onClick={exportCsv}>Export CSV</Button>
      </div>
      {data && (
        <div className="row g-3 mb-3">
          <div className="col-md-4"><StatCard label="Collected" value={money(data.totals.amount)} hint={`${data.total} payments`} icon={Wallet} tone="green" /></div>
          {data.totals.byMethod.slice(0, 2).map((m) => (
            <div key={m._id} className="col-md-4"><StatCard label={PAYMENT_METHODS[m._id]} value={money(m.amount)} hint={`${m.count} payments`} icon={Receipt} tone="blue" /></div>
          ))}
        </div>
      )}
      <Card padded={false}>
        {loading && !data ? <Loader /> : data?.items.length ? (
          <>
            <div className="table-scroll">
              <table className="table-eltc">
                <thead><tr><th>Receipt</th><th>Date</th><th>Student</th><th>For</th><th>Method</th><th className="num">Amount</th><th>By</th><th /></tr></thead>
                <tbody>
                  {data.items.map((p) => (
                    <tr key={p._id}>
                      <td className="fw-600">{p.receiptNumber}</td>
                      <td>{formatDate(p.paidAt)}</td>
                      <td><Link to={`/students/${p.student?._id}?tab=payments`} className="fw-600 fg-ink">{fullName(p.student)}</Link></td>
                      <td className="fg-muted">{p.invoice?.label}</td>
                      <td><Badge tone="gray">{PAYMENT_METHODS[p.method]}</Badge></td>
                      <td className="num fw-700">{money(p.amount)}</td>
                      <td className="fg-muted fs-12">{fullName(p.receivedBy)}</td>
                      <td className="text-end text-nowrap">
                        <Link to={`/payments/${p._id}/receipt`}><Button size="sm" variant="ghost" icon={Printer} title="Receipt" /></Link>
                        {canDelete && <Button size="sm" variant="ghost" icon={Trash2} title="Delete" onClick={() => remove(p)} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} pages={data.pages} total={data.total} limit={data.limit} onChange={setPage} />
          </>
        ) : (
          <EmptyState icon={Wallet} title="No payment in this period" />
        )}
      </Card>
    </>
  );
};

const Payments = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'invoices';
  const [paying, setPaying] = useState(null);
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const canPay = useCan(CAN.recordPayments);
  const canInvoice = useCan(CAN.manageInvoices);

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="What students owe, what was collected, and who is late."
        actions={
          <>
            {canInvoice && <Button variant="secondary" icon={FilePlus2} onClick={() => setCreating(true)}>New invoice</Button>}
            {canPay && <Button icon={Plus} onClick={() => setPaying({})}>Record a payment</Button>}
          </>
        }
      />
      <Tabs
        active={tab}
        onChange={(t) => setParams({ tab: t })}
        tabs={[{ key: 'invoices', label: 'Invoices & installments', icon: Receipt }, { key: 'payments', label: 'Payments received', icon: Wallet }]}
      />
      {tab === 'invoices' ? (
        <InvoicesTab key={refreshKey} onPay={(inv) => setPaying({ invoice: inv, student: inv.student })} />
      ) : (
        <PaymentsTab refreshKey={refreshKey} />
      )}
      <RecordPaymentModal
        open={Boolean(paying)}
        student={paying?.student}
        invoice={paying?.invoice}
        onClose={() => setPaying(null)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
      <InvoiceFormModal open={creating} onClose={() => setCreating(false)} onSaved={() => setRefreshKey((k) => k + 1)} />
    </>
  );
};

export default Payments;
