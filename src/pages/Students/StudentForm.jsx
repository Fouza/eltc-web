import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useSelector } from 'react-redux';
import { Baby, BookOpen, Contact, School, UserRound } from 'lucide-react';
import { studentsApi } from '@api/endpoints';
import { useForm, compact } from '@helpers/forms';
import { age, fullName, toInputDate, todayInput } from '@helpers/format';
import { toast } from '@helpers/toast';
import { Button, Card, Field, Loader, PageHeader } from '@components';
import { SOURCES, STUDENT_STATUS } from '@data/enums';

const EMPTY = {
  firstName: '', lastName: '', gender: '', birthDate: '', phone: '', email: '', address: '', city: '', occupation: '',
  guardian: { name: '', relation: '', phone: '', email: '' },
  campus: '', status: 'prospect', registeredAt: todayInput(), desiredProgram: '', desiredLevel: '', preferredSlots: '', source: '', notes: '',
};

// Same sections as the paper registration form, so typing it is quick.
const StudentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { campuses, programs } = useSelector((s) => s.refs);
  const selectedCampus = useSelector((s) => s.ui.campus);
  const { values, bind, setValues, set } = useForm({ ...EMPTY, campus: selectedCampus || campuses[0]?._id || '' });
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!id) return;
    studentsApi.get(id).then(({ student: s }) => {
      setValues({
        ...EMPTY,
        ...s,
        guardian: { ...EMPTY.guardian, ...s.guardian },
        campus: s.campus?._id ?? '',
        desiredProgram: s.desiredProgram?._id ?? '',
        desiredLevel: s.desiredLevel ?? '',
        birthDate: toInputDate(s.birthDate),
        registeredAt: toInputDate(s.registeredAt),
      });
      setLoading(false);
    });
  }, [id, setValues]);

  const years = age(values.birthDate);
  const isMinor = years !== null && years < 18;
  const program = programs.find((p) => p._id === values.desiredProgram);

  const submit = async (e, enrollAfter = false) => {
    e?.preventDefault();
    const errs = {};
    if (!values.firstName.trim()) errs.firstName = 'Required';
    if (!values.lastName.trim()) errs.lastName = 'Required';
    if (!values.campus) errs.campus = 'Required';
    if (!values.phone && !values.guardian.phone) errs.phone = 'Give at least one phone number (student or guardian)';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const { _id, studentNumber, createdBy, createdAt, updatedAt, __v, ...data } = values;
      const payload = compact({ ...data, desiredLevel: values.desiredLevel ? Number(values.desiredLevel) : '' });
      if (!values.desiredProgram) payload.desiredProgram = null;
      const saved = id ? await studentsApi.update(id, payload) : await studentsApi.create(payload);
      toast.success(id ? 'Student updated' : `${fullName(saved)} registered`, saved.studentNumber);
      navigate(`/students/${saved._id}${enrollAfter ? '?enroll=1' : ''}`);
    } catch (err) {
      toast.error(err);
      if (err.details) setErrors(err.details);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader full />;
  return (
    <form onSubmit={submit}>
      <PageHeader
        breadcrumb={[{ label: 'Students', to: '/students' }, { label: id ? fullName(values) : 'New registration' }]}
        title={id ? `Edit ${fullName(values)}` : 'Register a student'}
        subtitle={id ? values.studentNumber : 'Fill in the registration form. A student number is given on save.'}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
            {!id && <Button variant="soft" loading={saving} onClick={(e) => submit(e, true)}>Save & enroll in a group</Button>}
            <Button type="submit" loading={saving}>Save</Button>
          </>
        }
      />
      <div className="row g-3">
        <div className="col-xl-8">
          <Card title="Identity" icon={UserRound} className="mb-3">
            <div className="row g-x-3">
              <div className="col-sm-6"><Field label="First name" required error={errors.firstName}><input className="form-control" {...bind('firstName')} autoFocus={!id} /></Field></div>
              <div className="col-sm-6"><Field label="Last name" required error={errors.lastName}><input className="form-control" {...bind('lastName')} /></Field></div>
              <div className="col-sm-4">
                <Field label="Gender">
                  <select className="form-select" {...bind('gender')}>
                    <option value="">—</option><option value="female">Female</option><option value="male">Male</option>
                  </select>
                </Field>
              </div>
              <div className="col-sm-4"><Field label="Birth date" hint={years !== null ? `${years} years old` : undefined}><input type="date" className="form-control" {...bind('birthDate')} /></Field></div>
              <div className="col-sm-4"><Field label="Occupation / school"><input className="form-control" {...bind('occupation')} placeholder="Engineer, pupil, student…" /></Field></div>
            </div>
          </Card>
          <Card title="Contact" icon={Contact} className="mb-3">
            <div className="row">
              <div className="col-sm-6"><Field label="Phone" error={errors.phone}><input className="form-control" type="tel" {...bind('phone')} placeholder="+213 …" /></Field></div>
              <div className="col-sm-6"><Field label="Email"><input className="form-control" type="email" {...bind('email')} /></Field></div>
              <div className="col-sm-8"><Field label="Address"><input className="form-control" {...bind('address')} /></Field></div>
              <div className="col-sm-4"><Field label="City / district"><input className="form-control" {...bind('city')} /></Field></div>
            </div>
          </Card>
          <Card title="Parent / guardian" subtitle={isMinor ? 'Required for children: they are the contact for payments and absences.' : 'Optional for adults'} icon={Baby} className={isMinor ? 'border-primary' : ''}>
            <div className="row">
              <div className="col-sm-6"><Field label="Full name"><input className="form-control" {...bind('guardian.name')} /></Field></div>
              <div className="col-sm-6">
                <Field label="Relation">
                  <select className="form-select" {...bind('guardian.relation')}>
                    <option value="">—</option>{['Mother', 'Father', 'Guardian', 'Other'].map((r) => <option key={r}>{r}</option>)}
                  </select>
                </Field>
              </div>
              <div className="col-sm-6"><Field label="Phone"><input className="form-control" type="tel" {...bind('guardian.phone')} /></Field></div>
              <div className="col-sm-6"><Field label="Email"><input className="form-control" type="email" {...bind('guardian.email')} /></Field></div>
            </div>
          </Card>
        </div>
        <div className="col-xl-4">
          <Card title="School" icon={School} className="mb-3">
            <Field label="Campus" required error={errors.campus}>
              <select className="form-select" {...bind('campus')}>
                <option value="">Choose…</option>
                {campuses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className="form-select" {...bind('status')}>
                {Object.entries(STUDENT_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Registration date"><input type="date" className="form-control" {...bind('registeredAt')} /></Field>
            <Field label="How did they hear about us?">
              <select className="form-select" {...bind('source')}>
                <option value="">—</option>{SOURCES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </Card>
          <Card title="Wanted course" subtitle="Puts the student on the waiting list until enrolled" icon={BookOpen} className="mb-3">
            <Field label="Program">
              <select className="form-select" value={values.desiredProgram} onChange={(e) => { set('desiredProgram', e.target.value); set('desiredLevel', ''); }}>
                <option value="">—</option>
                {programs.filter((p) => p.active).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </Field>
            {program && (
              <Field label="Level" hint="From the placement test, or the first level (A1 or Bounce 1) for beginners">
                <select className="form-select" {...bind('desiredLevel')}>
                  <option value="">—</option>
                  {program.levels.map((l) => <option key={l.number} value={l.number}>{l.name}</option>)}
                </select>
              </Field>
            )}
            <Field label="Preferred times"><input className="form-control" {...bind('preferredSlots')} placeholder="Weekday evenings, Saturday…" /></Field>
          </Card>
          <Card title="Notes">
            <textarea className="form-control" rows={4} {...bind('notes')} placeholder="Anything useful: allergies, special needs, payment arrangement…" />
          </Card>
        </div>
      </div>
    </form>
  );
};

export default StudentForm;
