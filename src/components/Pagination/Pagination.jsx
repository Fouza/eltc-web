import { ChevronLeft, ChevronRight } from 'lucide-react';
import { number } from '@helpers/format';
import styles from './Pagination.module.scss';

const Pagination = ({ page, pages, total, limit, onChange }) => {
  if (!total) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <div className={styles.bar}>
      <span>
        {number(from)}–{number(to)} of <b>{number(total)}</b>
      </span>
      <div className="d-flex gap-1">
        <button type="button" className={styles.btn} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <ChevronLeft size={16} />
        </button>
        <span className={styles.page}>
          {page} / {pages}
        </span>
        <button type="button" className={styles.btn} disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
