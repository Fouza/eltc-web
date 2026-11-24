import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useSelector } from 'react-redux';
import QRCode from 'qrcode';
import { ArrowLeft, Printer } from 'lucide-react';
import { certificatesApi } from '@api/endpoints';
import { useApi } from '@helpers/hooks';
import { formatDate } from '@helpers/format';
import { toast } from '@helpers/toast';
import { Button, EmptyState, Loader } from '@components';
import styles from './CertificatePrint.module.scss';

// The address the QR code opens (the public /verify page of this app).
const verifyUrl = (code) => `${window.location.origin}/verify/${code}`;

const Sheet = ({ c, schoolName, qr }) => (
  <div className={styles.sheet}>
    <div className={styles.frame}>
      <span className={styles.ribbon} />
      <div className={styles.head}>
        <span className={styles.logo}>E</span>
        <div className="text-start">
          <div className={styles.school}>{schoolName}</div>
          <div className={styles.campus}>{[...new Set([c.campus?.name ?? c.campusName, c.campus?.city].filter(Boolean))].join(' · ')}</div>
        </div>
      </div>
      <div className={styles.title}>Certificate of achievement</div>
      <div className={styles.lead}>This is to certify that</div>
      <div className={styles.name}>{c.studentName}</div>
      {(c.birthDate || c.birthPlace) && (
        <div className={styles.born}>
          born{c.birthDate ? ` on ${formatDate(c.birthDate)}` : ''}{c.birthPlace ? ` in ${c.birthPlace}` : ''}
        </div>
      )}
      <div className={styles.level}>
        has successfully completed
        <b>{c.languageName ? `${c.languageName} · ` : ''}Level {c.levelName}</b>
      </div>
      <div className={styles.details}>
        {c.programName}
        {c.startDate && c.endDate && <> · from {formatDate(c.startDate)} to {formatDate(c.endDate)}</>}
        {c.hours ? <> · {c.hours} hours</> : null}
      </div>
      {c.mention && <div><span className={styles.mention}>Final score {c.finalScore}% · {c.mention}</span></div>}
      <div className={styles.foot}>
        <div className={styles.issued}>
          Issued on<b>{formatDate(c.issuedAt)}</b>
          <div className="mt-1">Certificate no.<b>{c.number}</b></div>
        </div>
        <div className={styles.sign}><div>The Director · signature and stamp</div></div>
        <div className={styles.qr}>
          <div>Scan to verify<b>{c.number}</b>{window.location.host}/verify</div>
          {qr && <img src={qr} alt="" />}
        </div>
      </div>
      {c.status === 'revoked' && <div className={styles.revokedStamp}>REVOKED</div>}
    </div>
  </div>
);

const CertificatePrint = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean);
  const settings = useSelector((s) => s.refs.settings);
  const { data: certs, loading } = useApi(() => certificatesApi.forPrint(ids), [params.get('ids')]);
  const [qrs, setQrs] = useState({});

  useEffect(() => {
    if (!certs?.length) return;
    Promise.all(certs.map(async (c) => [c._id, await QRCode.toDataURL(verifyUrl(c.code), { margin: 0, width: 260, errorCorrectionLevel: 'M' })])).then((pairs) => setQrs(Object.fromEntries(pairs)));
  }, [certs]);

  const print = async () => {
    const printable = certs.filter((c) => c.status !== 'revoked').map((c) => c._id);
    window.print();
    try { if (printable.length) await certificatesApi.printed(printable); } catch (err) { toast.error(err); }
  };

  if (loading) return <Loader full />;
  return (
    <>
      {/* A4 landscape for this page only. */}
      <style>{'@page { size: A4 landscape; margin: 0; }'}</style>
      <div className="d-flex justify-content-between align-items-center mb-3 no-print">
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/certificates?tab=ready')}>Certificates</Button>
        <div className="d-flex align-items-center gap-3">
          <span className="fs-13 fg-muted">A4 landscape · one certificate per page</span>
          <Button icon={Printer} disabled={!certs?.length || Object.keys(qrs).length < certs.length} onClick={print}>Print {certs?.length > 1 ? `${certs.length} certificates` : ''}</Button>
        </div>
      </div>
      {!certs?.length ? (
        <EmptyState title="Nothing to print" message="These certificates don't exist or belong to another campus." />
      ) : (
        <div className={styles.sheets}>
          {certs.map((c) => <Sheet key={c._id} c={c} schoolName={settings?.schoolName ?? 'ELTC School'} qr={qrs[c._id]} />)}
        </div>
      )}
    </>
  );
};

export default CertificatePrint;
