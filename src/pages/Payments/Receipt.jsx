import { useParams, useNavigate } from 'react-router';
import { useSelector } from 'react-redux';
import { ArrowLeft, Printer } from 'lucide-react';
import { paymentsApi } from '@api/endpoints';
import { useApi } from '@helpers/hooks';
import { formatDate, formatDateTime, fullName, money } from '@helpers/format';
import { Button, Loader } from '@components';
import { PAYMENT_METHODS } from '@data/enums';
import styles from './Receipt.module.scss';

const Receipt = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const settings = useSelector((s) => s.refs.settings);
  const { data: p, loading } = useApi(() => paymentsApi.get(id), [id]);
  if (loading) return <Loader full />;
  if (!p) return null;
  const remaining = p.invoice ? p.invoice.amount - p.invoice.paidAmount : 0;

  return (
    <>
      <div className="d-flex justify-content-between mb-3 no-print">
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(-1)}>Back</Button>
        <Button icon={Printer} onClick={() => window.print()}>Print</Button>
      </div>
      <div className={styles.paper}>
        <div className="d-flex justify-content-between align-items-start">
          <div className="d-flex gap-3 align-items-center">
            <span className={styles.logo}>E</span>
            <div>
              <div className="fw-800 fs-20">{settings?.schoolName}</div>
              <div className="fs-12 fg-muted">{p.campus?.name} · {[p.campus?.address, p.campus?.city].filter(Boolean).join(', ')}</div>
              {p.campus?.phone && <div className="fs-12 fg-muted">{p.campus.phone}</div>}
            </div>
          </div>
          <div className="text-end">
            <div className="ls-up">Receipt</div>
            <div className="fw-800 fs-20">{p.receiptNumber}</div>
            <div className="fs-13 fg-muted">{formatDate(p.paidAt)}</div>
          </div>
        </div>
        <div className="divider" />
        <div className="row g-3">
          <div className="col-6">
            <div className="ls-up mb-1">Received from</div>
            <div className="fw-700">{fullName(p.student)}</div>
            <div className="fs-13 fg-muted">{p.student?.studentNumber}</div>
            {p.student?.guardian?.name && <div className="fs-13 fg-muted">Guardian: {p.student.guardian.name}</div>}
          </div>
          <div className="col-6 text-end">
            <div className="ls-up mb-1">Payment method</div>
            <div className="fw-700">{PAYMENT_METHODS[p.method]}</div>
            {p.reference && <div className="fs-13 fg-muted">Ref. {p.reference}</div>}
          </div>
        </div>
        <table className={`table-eltc mt-4 ${styles.table}`}>
          <thead><tr><th>Description</th><th className="num">Invoice total</th><th className="num">Paid now</th></tr></thead>
          <tbody>
            <tr>
              <td>
                <div className="fw-600">{p.invoice?.label}</div>
                <div className="fs-12 fg-subtle">{p.invoice?.number} · due {formatDate(p.invoice?.dueDate)}</div>
              </td>
              <td className="num">{money(p.invoice?.amount)}</td>
              <td className="num fw-700">{money(p.amount)}</td>
            </tr>
          </tbody>
        </table>
        <div className={styles.total}>
          <span>Amount received</span>
          <b>{money(p.amount)}</b>
        </div>
        <div className="d-flex justify-content-between fs-13 fg-muted mt-2">
          <span>Remaining on this invoice</span>
          <span className="fw-700 fg-ink">{money(remaining)}</span>
        </div>
        <div className={styles.footer}>
          <div>Received by {fullName(p.receivedBy)} · {formatDateTime(p.createdAt)}</div>
          <div className={styles.sign}>Signature & stamp</div>
        </div>
      </div>
    </>
  );
};

export default Receipt;
