import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { CalendarDays, Layers, Plus, UserRound } from 'lucide-react';
import { fetchGroups, groupsQueryChanged } from '@store/groupsSlice';
import { useCampus, useCan } from '@helpers/hooks';
import { formatDate, fullName, scheduleLabel } from '@helpers/format';
import { Badge, Button, EmptyState, Loader, PageHeader, ProgressBar, Segmented, StatusBadge } from '@components';
import { CAN } from '@data/roles';
import { GROUP_STATUS } from '@data/enums';
import GroupFormModal from './GroupFormModal';
import styles from './Groups.module.scss';

const GroupsList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const campus = useCampus();
  const { items, loading, query } = useSelector((s) => s.groups);
  const { programs, languages } = useSelector((s) => s.refs);
  const [creating, setCreating] = useState(false);
  const canEdit = useCan(CAN.manageGroups);

  useEffect(() => {
    dispatch(fetchGroups());
  }, [dispatch, query, campus]);

  return (
    <>
      <PageHeader
        title="Groups"
        subtitle={`${items.length} groups · ${items.reduce((s, g) => s + g.enrolledCount, 0)} students placed`}
        actions={canEdit && <Button icon={Plus} onClick={() => setCreating(true)}>New group</Button>}
      />
      <div className="d-flex gap-2 flex-wrap mb-3">
        <Segmented
          value={query.status}
          onChange={(status) => dispatch(groupsQueryChanged({ status }))}
          options={[
            { value: 'ongoing,planned', label: 'Current' },
            { value: 'ongoing', label: 'Ongoing' },
            { value: 'planned', label: 'Planned' },
            { value: 'completed', label: 'Completed' },
            { value: '', label: 'All' },
          ]}
        />
        <select className="form-select w-auto" value={query.language} onChange={(e) => dispatch(groupsQueryChanged({ language: e.target.value, program: '' }))}>
          <option value="">All languages</option>
          {languages.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
        </select>
        <select className="form-select w-auto" value={query.program} onChange={(e) => dispatch(groupsQueryChanged({ program: e.target.value }))}>
          <option value="">All programs</option>
          {programs.filter((p) => !query.language || p.language?._id === query.language).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
      </div>
      {loading && !items.length ? (
        <Loader />
      ) : items.length ? (
        <div className="row g-3">
          {items.map((g) => (
            <div key={g._id} className="col-xxl-3 col-xl-4 col-md-6">
              <div className={styles.groupCard} onClick={() => navigate(`/groups/${g._id}`)} role="button" style={{ '--c': g.program?.color ?? '#064CA5' }}>
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <div className="min-w-0">
                    <div className={styles.groupName}>{g.name}</div>
                    <div className="fs-13 fg-muted text-ellipsis">{g.program?.name} · {g.campus?.name}</div>
                  </div>
                  <StatusBadge map={GROUP_STATUS} value={g.status} />
                </div>
                <div className={styles.level}>{g.level?.name ?? `Level ${g.levelNumber}`}</div>
                <div className={styles.facts}>
                  <span><UserRound size={14} /> {fullName(g.teacher) || <i className="fg-subtle">No teacher</i>}</span>
                  <span><CalendarDays size={14} /> {scheduleLabel(g.schedule)}</span>
                </div>
                <div className="d-flex justify-content-between fs-12 mt-3 mb-1">
                  <span className="fg-muted fw-600">{g.enrolledCount} / {g.capacity} students</span>
                  <Badge color={g.campus?.color}>{g.campus?.code}</Badge>
                </div>
                <ProgressBar value={g.enrolledCount} max={g.capacity} />
                <div className="fs-12 fg-subtle mt-2">{formatDate(g.startDate)} → {formatDate(g.endDate)}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Layers} title="No group" message="Create a group to start placing students." action={canEdit && <Button icon={Plus} onClick={() => setCreating(true)}>New group</Button>} />
      )}
      <GroupFormModal open={creating} onClose={() => setCreating(false)} onSaved={(g) => navigate(`/groups/${g._id}`)} />
    </>
  );
};

export default GroupsList;
