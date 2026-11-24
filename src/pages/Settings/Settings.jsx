import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Building2, KeyRound, Pencil, Plus, School, ShieldCheck, Users } from 'lucide-react';
import { campusesApi, settingsApi, usersApi } from '@api/endpoints';
import { reloadRef } from '@store/refsSlice';
import { useApi } from '@helpers/hooks';
import { formatDate, fromNow, fullName, toInputDate } from '@helpers/format';
import { toast } from '@helpers/toast';
import { Avatar, Badge, Button, Card, Field, Modal, PageHeader, StatusBadge, Tabs } from '@components';
import { ALL_ROLES, ROLE_LABELS } from '@data/roles';
import { CAMPUS_STATUS } from '@data/enums';

const ROLE_HELP = {
  admin: 'Everything, including staff accounts, campuses and settings',
  secretary: 'Everything except staff accounts, campuses, settings and deleting students or payments',
};

const SchoolTab = () => {
  const dispatch = useDispatch();
  const settings = useSelector((s) => s.refs.settings);
  const [f, setF] = useState(settings ?? {});
  const [saving, setSaving] = useState(false);
  const num = (k) => ({ value: f[k] ?? '', onChange: (e) => setF({ ...f, [k]: Number(e.target.value) }) });
  const save = async () => {
    setSaving(true);
    try {
      await settingsApi.update(f);
      dispatch(reloadRef('settings'));
      toast.success('Settings saved');
    } catch (err) { toast.error(err); } finally { setSaving(false); }
  };
  return (
    <div className="row g-3">
      <div className="col-lg-6">
        <Card title="School" icon={School}>
          <Field label="School name"><input className="form-control" value={f.schoolName ?? ''} onChange={(e) => setF({ ...f, schoolName: e.target.value })} /></Field>
          <div className="row">
            <div className="col-6"><Field label="Currency" hint="DZD, MAD, EUR…"><input className="form-control" value={f.currency ?? ''} onChange={(e) => setF({ ...f, currency: e.target.value.toUpperCase() })} maxLength={4} /></Field></div>
            <div className="col-6"><Field label="Number format"><select className="form-select" value={f.locale ?? 'fr-FR'} onChange={(e) => setF({ ...f, locale: e.target.value })}><option value="fr-FR">1 234,5</option><option value="en-GB">1,234.5</option></select></Field></div>
            <div className="col-6"><Field label="Default pass mark" hint="Exam scores are in percent"><div className="input-group"><input type="number" min="0" max="100" className="form-control" {...num('defaultPassScore')} /><span className="input-group-text">%</span></div></Field></div>
          </div>
        </Card>
      </div>
      <div className="col-lg-6">
        <Card title="Automatic alerts" subtitle="Checked every morning by the scheduler" icon={ShieldCheck}>
          <Field label="Low attendance alert after" hint="absences in the last 30 days"><input type="number" min="1" className="form-control" {...num('lowAttendanceThreshold')} /></Field>
          <Field label="Group almost full at" hint="share of seats taken (0.9 = 90%)"><input type="number" min="0.5" max="1" step="0.05" className="form-control" value={f.groupAlmostFullRatio ?? ''} onChange={(e) => setF({ ...f, groupAlmostFullRatio: Number(e.target.value) })} /></Field>
        </Card>
        <div className="text-end mt-3"><Button loading={saving} onClick={save}>Save settings</Button></div>
      </div>
    </div>
  );
};

const CampusModal = ({ campus, onClose }) => {
  const dispatch = useDispatch();
  const [f, setF] = useState({});
  useEffect(() => {
    if (campus) setF(campus._id ? { ...campus, openingDate: toInputDate(campus.openingDate), roomsText: campus.rooms.map((r) => r.name).join(', ') } : { name: '', code: '', city: '', address: '', phone: '', email: '', color: '#064CA5', status: 'opening', roomsText: 'Room 1, Room 2, Room 3' });
  }, [campus]);
  const save = async () => {
    try {
      const { roomsText, _id, createdAt, updatedAt, __v, ...data } = f;
      data.rooms = roomsText.split(',').map((s) => s.trim()).filter(Boolean).map((name) => ({ name, capacity: campus?.rooms?.find((r) => r.name === name)?.capacity ?? 12 }));
      data.openingDate = data.openingDate || null;
      if (campus._id) await campusesApi.update(campus._id, data);
      else await campusesApi.create(data);
      dispatch(reloadRef('campuses'));
      toast.success('Campus saved');
      onClose();
    } catch (err) { toast.error(err); }
  };
  return (
    <Modal open={Boolean(campus)} onClose={onClose} title={campus?._id ? `Edit ${campus.name}` : 'New campus'} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!f.name || !f.code} onClick={save}>Save</Button></>}>
      <div className="row">
        <div className="col-8"><Field label="Name" required><input className="form-control" value={f.name ?? ''} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field></div>
        <div className="col-4"><Field label="Short code" required><input className="form-control" value={f.code ?? ''} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} maxLength={5} /></Field></div>
        <div className="col-6"><Field label="City / district"><input className="form-control" value={f.city ?? ''} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field></div>
        <div className="col-6"><Field label="Phone"><input className="form-control" value={f.phone ?? ''} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field></div>
        <div className="col-12"><Field label="Address" hint="Printed on receipts"><input className="form-control" value={f.address ?? ''} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field></div>
        <div className="col-5"><Field label="Status"><select className="form-select" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{Object.entries(CAMPUS_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}</select></Field></div>
        <div className="col-5"><Field label="Opening date"><input type="date" className="form-control" value={f.openingDate ?? ''} onChange={(e) => setF({ ...f, openingDate: e.target.value })} /></Field></div>
        <div className="col-2"><Field label="Colour"><input type="color" className="form-control form-control-color w-100" value={f.color ?? '#064CA5'} onChange={(e) => setF({ ...f, color: e.target.value })} /></Field></div>
        <div className="col-12"><Field label="Rooms" hint="Comma separated"><input className="form-control" value={f.roomsText ?? ''} onChange={(e) => setF({ ...f, roomsText: e.target.value })} /></Field></div>
      </div>
    </Modal>
  );
};

const CampusesTab = () => {
  const campuses = useSelector((s) => s.refs.campuses);
  const [editing, setEditing] = useState(null);
  return (
    <>
      <div className="text-end mb-3"><Button icon={Plus} onClick={() => setEditing({})}>New campus</Button></div>
      <div className="row g-3">
        {campuses.map((c) => (
          <div key={c._id} className="col-lg-4 col-md-6">
            <Card title={c.name} subtitle={[c.city, c.address].filter(Boolean).join(' · ')} icon={Building2} actions={<Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(c)} aria-label="Edit" />} className="h-100">
              <div className="d-flex gap-2 flex-wrap">
                <StatusBadge map={CAMPUS_STATUS} value={c.status} />
                <Badge color={c.color}>{c.code}</Badge>
                <Badge tone="gray">{c.rooms.length} rooms</Badge>
              </div>
              {c.status === 'opening' && c.openingDate && <div className="fs-13 fg-purple fw-600 mt-2">Opens {formatDate(c.openingDate)} · {fromNow(c.openingDate)}</div>}
            </Card>
          </div>
        ))}
      </div>
      <CampusModal campus={editing} onClose={() => setEditing(null)} />
    </>
  );
};

const UserModal = ({ user, onClose, onSaved }) => {
  const campuses = useSelector((s) => s.refs.campuses);
  const [f, setF] = useState({});
  useEffect(() => {
    if (user) setF(user._id ? { ...user, campusIds: user.campusIds.map((c) => c._id ?? c) } : { firstName: '', lastName: '', email: '', phone: '', password: '', roles: ['secretary'], campusIds: [], active: true });
  }, [user]);
  const toggle = (k, v) => setF((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }));
  const save = async () => {
    try {
      const { _id, createdAt, updatedAt, __v, lastLoginAt, passwordChangedAt, ...data } = f;
      if (user._id) await usersApi.update(user._id, data);
      else await usersApi.create(data);
      toast.success(user._id ? 'Account updated' : 'Account created', user._id ? undefined : `Give ${f.email} their password.`);
      onSaved();
      onClose();
    } catch (err) { toast.error(err); }
  };
  return (
    <Modal open={Boolean(user)} onClose={onClose} size="lg" title={user?._id ? `Edit ${fullName(user)}` : 'New staff account'} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!f.firstName || !f.email || !f.roles?.length || (!user?._id && (f.password?.length ?? 0) < 8)} onClick={save}>Save</Button></>}>
      <div className="row">
        <div className="col-6"><Field label="First name" required><input className="form-control" value={f.firstName ?? ''} onChange={(e) => setF({ ...f, firstName: e.target.value })} /></Field></div>
        <div className="col-6"><Field label="Last name" required><input className="form-control" value={f.lastName ?? ''} onChange={(e) => setF({ ...f, lastName: e.target.value })} /></Field></div>
        <div className="col-6"><Field label="Email (login)" required><input type="email" className="form-control" value={f.email ?? ''} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field></div>
        <div className="col-6">
          {user?._id ? <Field label="Phone"><input className="form-control" value={f.phone ?? ''} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
            : <Field label="Password" required hint="At least 8 characters. They can change it later."><input className="form-control" value={f.password ?? ''} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>}
        </div>
      </div>
      <Field label="Role">
        <div className="row g-2">
          {ALL_ROLES.map((r) => (
            <div key={r} className="col-sm-6">
              <label className={`d-flex gap-2 p-2 px-3 rounded-3 border h-100 cursor-pointer ${f.roles?.includes(r) ? 'border-primary bg-blue-50' : ''}`}>
                <input type="radio" name="role" className="form-check-input mt-1" checked={f.roles?.includes(r) ?? false} onChange={() => setF({ ...f, roles: [r] })} />
                <div><div className="fw-700 fs-13">{ROLE_LABELS[r]}</div><div className="fs-12 fg-muted">{ROLE_HELP[r]}</div></div>
              </label>
            </div>
          ))}
        </div>
      </Field>
      <Field label="Campuses" hint="Leave all unchecked to give access to every campus.">
        <div className="d-flex gap-3 flex-wrap">
          {campuses.map((c) => <label key={c._id} className="d-flex align-items-center gap-1 fs-13"><input type="checkbox" className="form-check-input m-0" checked={f.campusIds?.includes(c._id) ?? false} onChange={() => toggle('campusIds', c._id)} /> {c.name}</label>)}
        </div>
      </Field>
      {user?._id && <label className="d-flex align-items-center gap-2 fw-600 fs-13"><input type="checkbox" className="form-check-input m-0" checked={f.active ?? true} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Account active (uncheck to block access immediately)</label>}
    </Modal>
  );
};

const UsersTab = () => {
  const me = useSelector((s) => s.auth.user);
  const { data: users, reload } = useApi(() => usersApi.list(), []);
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [password, setPassword] = useState('');
  const reset = async () => {
    try {
      await usersApi.resetPassword(resetting._id, password);
      toast.success('Password changed', `Give the new password to ${fullName(resetting)}.`);
      setResetting(null);
      setPassword('');
    } catch (err) { toast.error(err); }
  };
  return (
    <>
      <div className="text-end mb-3"><Button icon={Plus} onClick={() => setEditing({})}>New staff account</Button></div>
      <Card padded={false}>
        <div className="table-scroll">
          <table className="table-eltc">
            <thead><tr><th>Staff member</th><th>Role</th><th>Campuses</th><th>Last login</th><th>Status</th><th /></tr></thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u._id}>
                  <td><div className="d-flex align-items-center gap-2"><Avatar person={u} /><div><div className="fw-700 fg-ink">{fullName(u)} {u._id === me._id && <Badge tone="blue">You</Badge>}</div><div className="fs-12 fg-subtle">{u.email}</div></div></div></td>
                  <td><div className="d-flex gap-1 flex-wrap">{u.roles.map((r) => <Badge key={r} tone={r === 'admin' ? 'purple' : 'blue'}>{ROLE_LABELS[r]}</Badge>)}</div></td>
                  <td>{u.campusIds.length ? u.campusIds.map((c) => <Badge key={c._id} color={c.color} className="me-1">{c.code}</Badge>) : <span className="fg-muted fs-13">All</span>}</td>
                  <td className="fg-muted fs-13">{u.lastLoginAt ? fromNow(u.lastLoginAt) : 'Never'}</td>
                  <td>{u.active ? <Badge tone="green" dot>Active</Badge> : <Badge tone="red" dot>Blocked</Badge>}</td>
                  <td className="text-end text-nowrap">
                    <Button size="sm" variant="ghost" icon={KeyRound} onClick={() => setResetting(u)}>Password</Button>
                    <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(u)} aria-label="Edit" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <UserModal user={editing} onClose={() => setEditing(null)} onSaved={reload} />
      <Modal open={Boolean(resetting)} size="sm" onClose={() => setResetting(null)} title={`New password for ${fullName(resetting)}`} footer={<><Button variant="secondary" onClick={() => setResetting(null)}>Cancel</Button><Button disabled={password.length < 8} onClick={reset}>Set password</Button></>}>
        <Field label="New password" hint="At least 8 characters"><input className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus /></Field>
      </Modal>
    </>
  );
};

const Settings = () => {
  const [tab, setTab] = useState('school');
  return (
    <>
      <PageHeader title="Settings" subtitle="School settings, campuses and staff accounts." />
      <Tabs active={tab} onChange={setTab} tabs={[{ key: 'school', label: 'School', icon: School }, { key: 'campuses', label: 'Campuses', icon: Building2 }, { key: 'users', label: 'Staff & roles', icon: Users }]} />
      {tab === 'school' && <SchoolTab />}
      {tab === 'campuses' && <CampusesTab />}
      {tab === 'users' && <UsersTab />}
    </>
  );
};

export default Settings;
