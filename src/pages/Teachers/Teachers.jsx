import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams, Link } from 'react-router';
import { Mail, Pencil, Phone, Plus, UserSquare2 } from 'lucide-react';
import { teachersApi } from '@api/endpoints';
import { reloadRef } from '@store/refsSlice';
import { useApi, useCan } from '@helpers/hooks';
import { fullName, scheduleLabel } from '@helpers/format';
import { toast } from '@helpers/toast';
import { Avatar, Badge, Button, Card, EmptyState, Field, Modal, PageHeader, SearchInput, StatusBadge } from '@components';
import { CAN } from '@data/roles';
import { GROUP_STATUS } from '@data/enums';

const TeacherModal = ({ open, teacher, onClose, onSaved }) => {
  const { languages, campuses } = useSelector((s) => s.refs);
  const [f, setF] = useState({});
  useEffect(() => {
    if (open) setF(teacher?._id ? { ...teacher, languages: teacher.languages.map((l) => l._id), campusIds: teacher.campusIds.map((c) => c._id) } : { firstName: '', lastName: '', phone: '', email: '', languages: [], campusIds: [], active: true, notes: '' });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (k, id) => setF((x) => ({ ...x, [k]: x[k].includes(id) ? x[k].filter((v) => v !== id) : [...x[k], id] }));
  const save = async () => {
    try {
      const { _id, activeGroups, groups, createdAt, updatedAt, __v, ...data } = f;
      if (teacher?._id) await teachersApi.update(teacher._id, data);
      else await teachersApi.create(data);
      toast.success('Teacher saved');
      onSaved();
      onClose();
    } catch (err) { toast.error(err); }
  };
  return (
    <Modal open={open} onClose={onClose} title={teacher?._id ? `Edit ${fullName(teacher)}` : 'New teacher'} subtitle="Teachers don't log in: they are listed here to be assigned to groups." footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!f.firstName || !f.lastName} onClick={save}>Save</Button></>}>
      <div className="row">
        <div className="col-6"><Field label="First name" required><input className="form-control" value={f.firstName ?? ''} onChange={(e) => setF({ ...f, firstName: e.target.value })} /></Field></div>
        <div className="col-6"><Field label="Last name" required><input className="form-control" value={f.lastName ?? ''} onChange={(e) => setF({ ...f, lastName: e.target.value })} /></Field></div>
        <div className="col-6"><Field label="Phone"><input className="form-control" value={f.phone ?? ''} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field></div>
        <div className="col-6"><Field label="Email"><input className="form-control" value={f.email ?? ''} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field></div>
      </div>
      <Field label="Teaches">
        <div className="d-flex gap-2 flex-wrap">
          {languages.map((l) => <label key={l._id} className="d-flex align-items-center gap-1 fs-13"><input type="checkbox" className="form-check-input m-0" checked={f.languages?.includes(l._id) ?? false} onChange={() => toggle('languages', l._id)} /> {l.name}</label>)}
        </div>
      </Field>
      <Field label="Works at">
        <div className="d-flex gap-3 flex-wrap">
          {campuses.map((c) => <label key={c._id} className="d-flex align-items-center gap-1 fs-13"><input type="checkbox" className="form-check-input m-0" checked={f.campusIds?.includes(c._id) ?? false} onChange={() => toggle('campusIds', c._id)} /> {c.name}</label>)}
        </div>
      </Field>
      <Field label="Notes"><textarea className="form-control" rows={2} value={f.notes ?? ''} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      <label className="d-flex align-items-center gap-2 fw-600 fs-13"><input type="checkbox" className="form-check-input m-0" checked={f.active ?? true} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Currently teaching at the school</label>
    </Modal>
  );
};

const TeacherGroups = ({ teacher, onClose }) => {
  const { data } = useApi(() => teachersApi.get(teacher._id), [teacher?._id], { skip: !teacher });
  return (
    <Modal open={Boolean(teacher)} onClose={onClose} title={fullName(teacher)} subtitle={[teacher?.phone, teacher?.email].filter(Boolean).join(' · ')} size="lg">
      {data?.groups?.length ? data.groups.map((g) => (
        <Link key={g._id} to={`/groups/${g._id}`} className="d-flex justify-content-between align-items-center p-2 border-bottom fg-ink">
          <div><div className="fw-700">{g.name}</div><div className="fs-12 fg-muted">{g.program?.name} · {scheduleLabel(g.schedule)} · {g.campus?.name}</div></div>
          <div className="d-flex gap-2 align-items-center"><span className="fs-12 fg-muted">{g.enrolledCount} students</span><StatusBadge map={GROUP_STATUS} value={g.status} /></div>
        </Link>
      )) : <EmptyState compact title="No group assigned" />}
    </Modal>
  );
};

const Teachers = () => {
  const dispatch = useDispatch();
  const [params, setParams] = useSearchParams();
  const teachers = useSelector((s) => s.refs.teachers);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const canEdit = useCan(CAN.manageTeachers);
  const viewing = teachers.find((t) => t._id === params.get('open'));
  const shown = teachers.filter((t) => fullName(t).toLowerCase().includes(q.toLowerCase()));
  const reload = () => dispatch(reloadRef('teachers'));

  return (
    <>
      <PageHeader title="Teachers" subtitle={`${teachers.filter((t) => t.active).length} active teachers`} actions={canEdit && <Button icon={Plus} onClick={() => setEditing({})}>New teacher</Button>} />
      <Card padded={false}>
        <div className="p-3"><SearchInput value={q} onChange={setQ} placeholder="Search a teacher…" style={{ maxWidth: 320 }} /></div>
        {shown.length ? (
          <div className="table-scroll">
            <table className="table-eltc">
              <thead><tr><th>Teacher</th><th>Contact</th><th>Languages</th><th>Campuses</th><th className="num">Groups</th><th>Status</th><th /></tr></thead>
              <tbody>
                {shown.map((t) => (
                  <tr key={t._id} className="clickable" onClick={() => setParams({ open: t._id })}>
                    <td><div className="d-flex align-items-center gap-2"><Avatar person={t} /><span className="fw-700 fg-ink">{fullName(t)}</span></div></td>
                    <td className="fs-13">{t.phone && <div><Phone size={12} className="fg-subtle" /> {t.phone}</div>}{t.email && <div className="fg-muted"><Mail size={12} className="fg-subtle" /> {t.email}</div>}</td>
                    <td><div className="d-flex gap-1 flex-wrap">{t.languages.map((l) => <Badge key={l._id} color={l.color}>{l.name}</Badge>)}</div></td>
                    <td><div className="d-flex gap-1 flex-wrap">{t.campusIds.map((c) => <Badge key={c._id} tone="gray">{c.code}</Badge>)}</div></td>
                    <td className="num fw-700">{t.activeGroups}</td>
                    <td>{t.active ? <Badge tone="green" dot>Active</Badge> : <Badge dot>Inactive</Badge>}</td>
                    <td className="text-end">{canEdit && <Button size="sm" variant="ghost" icon={Pencil} onClick={(e) => { e.stopPropagation(); setEditing(t); }} aria-label="Edit" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState icon={UserSquare2} title="No teacher" />}
      </Card>
      <TeacherModal open={Boolean(editing)} teacher={editing} onClose={() => setEditing(null)} onSaved={reload} />
      <TeacherGroups teacher={viewing} onClose={() => setParams({})} />
    </>
  );
};

export default Teachers;
