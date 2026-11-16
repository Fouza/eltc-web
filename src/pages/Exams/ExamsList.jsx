import { useState } from 'react';
import dayjs from 'dayjs';
import { Plus } from 'lucide-react';
import { useCampus, useCan } from '@helpers/hooks';
import { Button, PageHeader, Segmented } from '@components';
import { CAN } from '@data/roles';
import ExamsTable from './ExamsTable';
import ExamFormModal from './ExamFormModal';

const ExamsList = () => {
  const campus = useCampus();
  const [view, setView] = useState('todo');
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const canEdit = useCan(CAN.manageExams);
  const today = dayjs().format('YYYY-MM-DD');
  const params = {
    todo: { status: 'scheduled', to: dayjs().subtract(1, 'day').format('YYYY-MM-DD'), sort: 'asc' },
    upcoming: { status: 'scheduled', from: today, sort: 'asc' },
    graded: { status: 'graded' },
    all: {},
  }[view];

  return (
    <>
      <PageHeader title="Exams & grades" subtitle="Schedule exams per group, then type the scores from the teacher's list." actions={canEdit && <Button icon={Plus} onClick={() => setCreating(true)}>Schedule an exam</Button>} />
      <Segmented
        className="mb-3"
        value={view}
        onChange={setView}
        options={[
          { value: 'todo', label: 'Results to type', tone: 'red' },
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'graded', label: 'Graded' },
          { value: 'all', label: 'All' },
        ]}
      />
      <ExamsTable params={{ ...params, campus }} refreshKey={refreshKey} />
      <ExamFormModal open={creating} onClose={() => setCreating(false)} onSaved={() => setRefreshKey((k) => k + 1)} />
    </>
  );
};

export default ExamsList;
