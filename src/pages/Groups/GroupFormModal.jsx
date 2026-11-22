import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { groupsApi } from '@api/endpoints';
import { Button, Field, Modal } from '@components';
import { toInputDate, money, fullName, levelName } from '@helpers/format';
import { toast } from '@helpers/toast';
import { SESSIONS_PER_WEEK, checkSessions, sessionsFor, sessionsLabel } from '@data/sessions';
import { GROUP_STATUS } from '@data/enums';

const blank = (prefill = {}) => ({
  name: '', program: '', levelNumber: 1, campus: '', teacher: '', room: '', capacity: 12, sessions: [],
  startDate: '', endDate: '', fee: '', status: 'planned', notes: '', ...prefill,
});

// Suggested name: language - level, audience, sessions. "EN - A1 Adults Saturday Morning + Evening Tue", "FR - Bounce 2 Kids Friday Morning".
export const suggestName = (program, level, sessions = []) => {
  if (!program) return '';
  const code = program.language?.code?.toUpperCase() ?? '';
  return [`${code} - ${levelName(level, program)}`, program.audience === 'children' ? 'Kids' : 'Adults', sessionsLabel(sessions)].filter(Boolean).join(' ');
};

const GroupFormModal = ({ open, onClose, onSaved, group, prefill }) => {
  const { programs, campuses, teachers } = useSelector((s) => s.refs);
  const [f, setF] = useState(blank());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF(
      group
        ? { ...blank(), ...group, program: group.program?._id, campus: group.campus?._id, teacher: group.teacher?._id ?? '', startDate: toInputDate(group.startDate), endDate: toInputDate(group.endDate), fee: group.fee ?? '' }
        : blank(prefill),
    );
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const program = programs.find((p) => p._id === f.program);
  const level = program?.levels.find((l) => l.number === Number(f.levelNumber));
  const campus = campuses.find((c) => c._id === f.campus);
  const audience = program?.audience ?? 'adults';
  const need = SESSIONS_PER_WEEK[audience];
  const sessionError = program ? checkSessions(f.sessions, audience) : null;

  // The name follows program / level / sessions until the user types their own.
  const autoName = (x) => suggestName(programs.find((p) => p._id === x.program), x.levelNumber, x.sessions);
  const update = (patch) =>
    setF((x) => {
      const next = { ...x, ...patch };
      return { ...next, name: !x.name || x.name === autoName(x) ? autoName(next) : x.name };
    });
  const toggleSession = (key) => {
    const has = f.sessions.includes(key);
    const day = sessionsFor(audience).find((s) => s.key === key)?.day;
    // Picking a session replaces the one on the same day; kids keep only one session.
    const others = need === 1 ? [] : f.sessions.filter((k) => sessionsFor(audience).find((s) => s.key === k)?.day !== day);
    update({ sessions: has ? f.sessions.filter((k) => k !== key) : [...others, key].slice(-need) });
  };

  // End date from the level duration.
  const onStart = (v) => {
    set('startDate', v);
    if (v && level?.durationWeeks && !f.endDate) {
      const d = new Date(v);
      d.setDate(d.getDate() + level.durationWeeks * 7);
      set('endDate', d.toISOString().slice(0, 10));
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const data = { ...f, levelNumber: Number(f.levelNumber), capacity: Number(f.capacity), fee: f.fee === '' ? null : Number(f.fee), teacher: f.teacher || null, startDate: f.startDate || null, endDate: f.endDate || null };
      delete data._id; delete data.level; delete data.roster; delete data.enrolledCount; delete data.sessionsHeld; delete data.schedule;
      const saved = group ? await groupsApi.update(group._id, data) : await groupsApi.create(data);
      toast.success(group ? 'Group updated' : `Group ${saved.name} created`);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  const teachersShown = teachers.filter((t) => t.active && (!program || !t.languages.length || t.languages.some((l) => l._id === program.language?._id)));
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={group ? `Edit ${group.name}` : 'New group'}
      subtitle="A group is one level of a program, at one campus, with a teacher and its weekly sessions."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} disabled={!f.name || !f.program || !f.campus || Boolean(sessionError)} onClick={save}>Save group</Button></>}
    >
      <div className="row">
        <div className="col-sm-6">
          <Field label="Program" required>
            <select className="form-select" value={f.program} onChange={(e) => update({ program: e.target.value, levelNumber: 1, sessions: [] })}>
              <option value="">Choose…</option>
              {programs.filter((p) => p.active || p._id === f.program).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="col-sm-6">
          <Field label="Level" required hint={level ? `${level.durationWeeks} weeks · ${level.hours} h · ${money(level.fee)}` : undefined}>
            <select className="form-select" value={f.levelNumber} onChange={(e) => update({ levelNumber: e.target.value })} disabled={!program}>
              {(program?.levels ?? [{ number: 1, name: levelName(1) }]).map((l) => <option key={l.number} value={l.number}>{l.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="col-sm-6">
          <Field label="Group name" required hint="Filled in from the level and sessions. You can change it.">
            <input className="form-control" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder={suggestName(program, f.levelNumber, f.sessions) || 'EN - A1 Adults Saturday Morning + Evening Tue'} />
          </Field>
        </div>
        <div className="col-sm-6">
          <Field label="Campus" required>
            <select className="form-select" value={f.campus} onChange={(e) => set('campus', e.target.value)}>
              <option value="">Choose…</option>
              {campuses.filter((c) => c.status !== 'closed').map((c) => <option key={c._id} value={c._id}>{c.name}{c.status === 'opening' ? ' (opening soon)' : ''}</option>)}
            </select>
          </Field>
        </div>
        <div className="col-sm-6">
          <Field label="Teacher">
            <select className="form-select" value={f.teacher} onChange={(e) => set('teacher', e.target.value)}>
              <option value="">Not assigned yet</option>
              {teachersShown.map((t) => <option key={t._id} value={t._id}>{fullName(t)}</option>)}
            </select>
          </Field>
        </div>
        <div className="col-sm-3">
          <Field label="Room">
            <select className="form-select" value={f.room} onChange={(e) => set('room', e.target.value)}>
              <option value="">—</option>
              {campus?.rooms?.map((r) => <option key={r.name}>{r.name}</option>)}
              {f.room && !campus?.rooms?.some((r) => r.name === f.room) && <option>{f.room}</option>}
            </select>
          </Field>
        </div>
        <div className="col-sm-3"><Field label="Seats"><input type="number" min="1" className="form-control" value={f.capacity} onChange={(e) => set('capacity', e.target.value)} /></Field></div>
      </div>
      <Field
        label={`Sessions · ${audience === 'children' ? 'kids: 1 a week' : 'adults: 2 a week, on different days'}`}
        required
        hint={!program ? 'Choose the program first.' : f.sessions.length < need ? `Pick ${need - f.sessions.length} more.` : sessionError ?? undefined}
      >
        <div className="row g-2">
          {(program ? sessionsFor(audience) : []).map((s) => {
            const on = f.sessions.includes(s.key);
            return (
              <div key={s.key} className="col-sm-6 col-lg-3">
                <label className={`d-flex gap-2 p-2 px-3 rounded-3 border h-100 cursor-pointer ${on ? 'border-primary bg-blue-50' : ''}`}>
                  <input type={need === 1 ? 'radio' : 'checkbox'} name="session" className="form-check-input mt-1" checked={on} onChange={() => toggleSession(s.key)} />
                  <div><div className="fw-700 fs-13">{s.label}</div><div className="fs-12 fg-muted">{s.startTime}–{s.endTime}</div></div>
                </label>
              </div>
            );
          })}
        </div>
      </Field>
      <div className="row">
        <div className="col-sm-4"><Field label="Start date"><input type="date" className="form-control" value={f.startDate} onChange={(e) => onStart(e.target.value)} /></Field></div>
        <div className="col-sm-4"><Field label="End date"><input type="date" className="form-control" value={f.endDate} onChange={(e) => set('endDate', e.target.value)} /></Field></div>
        <div className="col-sm-4">
          <Field label="Status">
            <select className="form-select" value={f.status} onChange={(e) => set('status', e.target.value)}>
              {Object.entries(GROUP_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="col-sm-6"><Field label="Specific fee" hint={level ? `Leave empty to use the level fee (${money(level.fee)})` : undefined}><input type="number" min="0" className="form-control" value={f.fee} onChange={(e) => set('fee', e.target.value)} /></Field></div>
        <div className="col-sm-6"><Field label="Notes"><input className="form-control" value={f.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field></div>
      </div>
    </Modal>
  );
};

export default GroupFormModal;
