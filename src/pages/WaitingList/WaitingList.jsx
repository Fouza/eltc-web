import { useState } from 'react';
import { Link } from 'react-router';
import { Hourglass, Phone, Plus, UserPlus } from 'lucide-react';
import { studentsApi } from '@api/endpoints';
import { useApi, useCampus, useCan } from '@helpers/hooks';
import { fromNow, fullName, levelName } from '@helpers/format';
import { Avatar, Badge, Button, Card, EmptyState, Loader, PageHeader } from '@components';
import { CAN } from '@data/roles';
import { AUDIENCES } from '@data/enums';
import GroupFormModal from '@pages/Groups/GroupFormModal';
import EnrollModal from '@pages/Students/EnrollModal';

// Prospects grouped by what they asked for: tells the school when there are enough people to open a group.
const WaitingList = () => {
  const campus = useCampus();
  const canGroup = useCan(CAN.manageGroups);
  const canEnroll = useCan(CAN.manageEnrollments);
  const [creating, setCreating] = useState(null);
  const [enrolling, setEnrolling] = useState(null);
  const { data, loading, reload } = useApi(() => studentsApi.waitingList({ campus }), [campus]);
  const total = data?.reduce((s, b) => s + b.students.length, 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Waiting list"
        subtitle={`${total} registered students not placed in a group yet, grouped by the course they want.`}
        actions={<Link to="/students/new"><Button icon={Plus}>Register a student</Button></Link>}
      />
      {loading && !data ? <Loader /> : data?.length ? (
        <div className="row g-3">
          {data.map((b) => (
            <div key={b.key} className="col-xl-4 col-md-6">
              <Card
                className="h-100"
                title={b.program ? `${b.program.name}` : 'No course chosen'}
                subtitle={
                  <span className="d-flex gap-1 mt-1 flex-wrap">
                    {b.levelNumber && <Badge tone="purple">{levelName(b.levelNumber, b.program)}</Badge>}
                    <Badge color={b.campus?.color}>{b.campus?.name}</Badge>
                    {b.program && <Badge tone="gray">{AUDIENCES[b.program.audience]}</Badge>}
                  </span>
                }
                actions={<div className="text-end"><div className="fs-24 fw-800 lh-sm fg-blue">{b.students.length}</div><div className="fs-11 fg-subtle">waiting</div></div>}
              >
                <div className="d-flex flex-column gap-1">
                  {b.students.map((s) => (
                    <div key={s._id} className="d-flex align-items-center gap-2 py-1">
                      <Avatar person={s} size={30} />
                      <div className="flex-grow-1 min-w-0">
                        <Link to={`/students/${s._id}`} className="fw-600 fg-ink">{fullName(s)}</Link>
                        <div className="fs-12 fg-subtle text-ellipsis">{s.preferredSlots ?? '—'} · {fromNow(s.registeredAt)}</div>
                      </div>
                      {s.phone && <a href={`tel:${s.phone}`} title={s.phone}><Button size="sm" variant="ghost" icon={Phone} /></a>}
                      {canEnroll && <Button size="sm" variant="soft" icon={UserPlus} title="Enroll" onClick={() => setEnrolling(s)} />}
                    </div>
                  ))}
                </div>
                {canGroup && b.program && (
                  <Button
                    variant={b.students.length >= 5 ? 'primary' : 'secondary'}
                    size="sm"
                    block
                    className="mt-3"
                    icon={Plus}
                    onClick={() => setCreating({ program: b.program._id, levelNumber: b.levelNumber ?? 1, campus: b.campus?._id })}
                  >
                    Open a group{b.students.length >= 5 ? ' — enough students!' : ''}
                  </Button>
                )}
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Hourglass} title="Nobody is waiting" message="Every registered student is in a group." />
      )}
      <GroupFormModal open={Boolean(creating)} prefill={creating ?? {}} onClose={() => setCreating(null)} onSaved={reload} />
      <EnrollModal open={Boolean(enrolling)} student={enrolling ? { ...enrolling } : null} onClose={() => setEnrolling(null)} onSaved={reload} />
    </>
  );
};

export default WaitingList;
