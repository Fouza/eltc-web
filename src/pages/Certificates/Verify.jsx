import { useParams } from 'react-router';
import { BadgeCheck, ShieldX } from 'lucide-react';
import { certificatesApi } from '@api/endpoints';
import { useApi } from '@helpers/hooks';
import { formatDate } from '@helpers/format';
import { Loader } from '@components';
import styles from './Certificates.module.scss';

// Public page opened by the QR code on a certificate: says whether it is genuine. No login, no personal contact details.
const Verify = () => {
  const { code } = useParams();
  const { data: c, loading, error } = useApi(() => certificatesApi.verify(code), [code]);
  if (loading) return <Loader full />;
  return (
    <div className={styles.verifyWrap}>
      <div className={styles.verifyCard}>
        <div className="d-flex align-items-center gap-2">
          <span className="d-inline-grid rounded-3 text-white fw-800" style={{ width: 36, height: 36, placeItems: 'center', background: 'linear-gradient(135deg,#064CA5,#7B3FE4)' }}>E</span>
          <div className="fw-800 fs-17">{c?.schoolName ?? 'Certificate check'}</div>
        </div>
        {error || !c ? (
          <div className={`${styles.verdict} ${styles.unknown}`}><ShieldX size={22} /> No certificate matches this code.</div>
        ) : (
          <>
            {c.status === 'valid' ? (
              <div className={`${styles.verdict} ${styles.valid}`}><BadgeCheck size={22} /> Genuine certificate, issued by {c.schoolName}.</div>
            ) : (
              <div className={`${styles.verdict} ${styles.revoked}`}><ShieldX size={22} /> This certificate was revoked on {formatDate(c.revokedAt)}. It is no longer valid.</div>
            )}
            <dl className={styles.facts}>
              <dt>Holder</dt><dd>{c.studentName}</dd>
              <dt>Level</dt><dd>{[c.languageName, c.levelName && `Level ${c.levelName}`].filter(Boolean).join(' · ')}</dd>
              <dt>Course</dt><dd>{c.programName}{c.campusName ? ` · ${c.campusName}` : ''}</dd>
              {c.startDate && <><dt>Dates</dt><dd>{formatDate(c.startDate)} → {formatDate(c.endDate)}{c.hours ? ` · ${c.hours} h` : ''}</dd></>}
              {c.mention && <><dt>Mention</dt><dd>{c.mention}</dd></>}
              <dt>Number</dt><dd>{c.number}</dd>
              <dt>Issued on</dt><dd>{formatDate(c.issuedAt)}</dd>
            </dl>
          </>
        )}
      </div>
    </div>
  );
};

export default Verify;
