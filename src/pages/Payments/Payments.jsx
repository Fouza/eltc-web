import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import dayjs from 'dayjs';
import { BookCheck, Download, FilePlus2, Plus, Printer, Receipt, Trash2, Undo2, Wallet } from 'lucide-react';
import { booksApi, groupsApi, invoicesApi, paymentsApi } from '@api/endpoints';
import { useApi, useCampus, useCan, useGroupName } from '@helpers/hooks';
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
  const kind = params.get('kind') ?? 'all';
  const group = params.get('group') ?? '';
  const book = params.get('book') ?? '';
  const setParam = (k, v) => { setPage(1); setParams((p) => { if (v) p.set(k, v); else p.delete(k); return p; }); };
  const groupName = useGroupName();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const canEdit = useCan(CAN.manageInvoices);
  const confirm = useConfirm();
  const filters = { status: status === 'all' ? '' : status, kind: kind === 'all' ? '' : kind, group, book: kind === 'book' ? book : '', campus };
  const { data, loading, reload } = useApi(() => invoicesApi.list({ ...filters, page }), [status, kind, group, book, campus, page]);
  const { data: groups } = useApi(() => groupsApi.list({ status: 'ongoing,planned,completed', campus }), [campus]);
  const { data: books } = useApi(() => booksApi.list({ withImage: 'false' }), []);

  const handover = async (inv, handedOver) => {
    try {
      await invoicesApi.handover(inv._id, handedOver);
      toast.success(handedOver ? 'Book handed over' : 'Hand-over undone', handedOver ? 'One copy taken out of the campus stock.' : 'The copy is back in stock.');
      reload();
    } catch (err) { toast.error(err); }
  };

  const cancel = async (inv) => {
    if (!(await confirm({ title: `Cancel ${inv.number}?`, message: 'The student will no longer owe this amount.', danger: true, confirmLabel: 'Cancel invoice' }))) return;
    try {
      await invoicesApi.cancel(inv._id);
      toast.success('Invoice cancelled');
      reload();
    } catch (err) { toast.error(err); }
  };

  const exportCsv = async () => {
    const all = await invoicesApi.list({ ...filters, limit: 200 });
    downloadFile(
      toCsv(all.items, [
        { label: 'Number', value: (i) => i.number },
        { label: 'Student', value: (i) => fullName(i.student) },
        { label: 'Phone', value: (i) => i.student?.phone ?? i.student?.guardian?.phone },
        { label: 'Type', value: (i) => i.kind ?? 'course' },
        { label: 'Label', value: (i) => i.label },
        { label: 'Group', value: (i) => i.group?.name ?? '' },
        { label: 'Due date', value: (i) => dayjs(i.dueDate).format('YYYY-MM-DD') },
        { label: 'Amount', value: (i) => i.amount },
        { label: 'Paid', value: (i) => i.paidAmount },
        { label: 'Remaining', value: (i) => i.amount - i.paidAmount },
        { label: 'Status', value: (i) => (i.isOverdue ? 'overdue' : i.status) },
        { label: 'Handed over', value: (i) => (i.kind === 'book' ? (i.handedOverAt ? dayjs(i.handedOverAt).format('YYYY-MM-DD') : 'no') : '') },
      ]),
      `invoices-${kind}-${status}-${dayjs().format('YYYY-MM-DD')}.csv`,
    );
  };

  return (
    <>
      <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
        <Segmented
          value={kind}
          onChange={(v) => { setPage(1); setParams((p) => { p.delete('book'); if (v === 'all') p.delete('kind'); else p.set('kind', v); return p; }); }}
          options={[{ value: 'all', label: 'All' }, { value: 'course', label: 'Courses' }, { value: 'book', label: 'Books' }]}
        />
        <select className="form-select" style={{ maxWidth: 320 }} value={group} onChange={(e) => setParam('group', e.target.value)} aria-label="Group">
          <option value="">All groups</option>
          {[...(groups ?? [])].sort((a, b) => a.name.localeCompare(b.name)).map((g) => <option key={g._id} value={g._id}>{groupName(g)}</option>)}
        </select>
        {kind === 'book' && (
          <select className="form-select" style={{ maxWidth: 240 }} value={book} onChange={(e) => setParam('book', e.target.value)} aria-label="Book">
            <option value="">All books</option>
            {(books ?? []).map((b) => <option key={b._id} value={b._id}>{b.title}</option>)}
          </select>
        )}
      </div>
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
                  <tr><th>Student</th><th>For</th><th>Due</th><th className="num">Amount</th><th className="num">Remaining</th><th>Status</th>{kind === 'book' && <th>Book given</th>}<th /></tr>
                </thead>
                <tbody>
                  {data.items.map((inv) => (
                    <tr key={inv._id}>
                      <td>
                        <Link to={`/students/${inv.student?._id}?tab=payments`} className="fw-600 fg-ink">{fullName(inv.student)}</Link>
                        <div className="fs-12 fg-subtle">{inv.student?.phone ?? inv.student?.guardian?.phone ?? inv.student?.studentNumber}</div>
                      </td>
                      <td>
                        <div className="fw-600">{inv.kind === 'book' && <Badge tone="purple" className="me-1">Book</Badge>}{inv.label}</div>
                        <div className="fs-12 fg-subtle">{inv.number}{inv.group ? ` · ${inv.group.name}` : ''}</div>
                      </td>
                      <td>
                        <div>{formatDate(inv.dueDate)}</div>
                        {inv.isOverdue && <div className="fs-12 fg-red fw-600">{fromNow(inv.overdueAt ?? inv.dueDate)}</div>}
                        {!inv.isOverdue && inv.kind === 'book' && ['unpaid', 'partial'].includes(inv.status) && inv.overdueAt && <div className="fs-12 fg-subtle">Overdue after {formatDate(inv.overdueAt)}</div>}
                      </td>
                      <td className="num">{money(inv.amount)}</td>
                      <td className="num fw-700">{money(inv.amount - inv.paidAmount)}</td>
                      <td>{inv.isOverdue ? <StatusBadge map={INVOICE_STATUS} value="overdue" /> : <StatusBadge map={INVOICE_STATUS} value={inv.status} />}</td>
                      {kind === 'book' && (
                        <td className="text-nowrap">
                          {inv.status === 'cancelled' ? <span className="fg-subtle">—</span> : inv.handedOverAt ? (
                            <span className="d-inline-flex align-items-center gap-1">
                              <Badge tone="green" dot>{formatDate(inv.handedOverAt)}</Badge>
                              {canEdit && <Button size="sm" variant="ghost" icon={Undo2} onClick={() => handover(inv, false)} aria-label="Undo" title="Undo (puts the copy back in stock)" />}
                            </span>
                          ) : canEdit ? <Button size="sm" variant="secondary" icon={BookCheck} onClick={() => handover(inv, true)}>Hand over</Button> : <Badge tone="amber">Not yet</Badge>}
                        </td>
                      )}
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
    if (!(await confirm({ title: `Delete receipt ${p.receipt ?? p.receiptNumber}?`, message: 'The whole receipt is deleted (every invoice it paid) and those invoices are unpaid again. Use this only to fix a mistake.', danger: true, confirmLabel: 'Delete' }))) return;
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
