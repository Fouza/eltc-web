import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Plus, X } from 'lucide-react';
import { groupsApi } from '@api/endpoints';
import { Button, Field, Modal } from '@components';
import { toInputDate, money, fullName } from '@helpers/format';
import { toast } from '@helpers/toast';
import { DAYS, WEEK_ORDER } from '@data/days';
import { GROUP_STATUS } from '@data/enums';

const blank = (prefill = {}) => ({
  name: '', program: '', levelNumber: 1, campus: '', teacher: '', room: '', capacity: 12, schedule: [{ day: 0, startTime: '18:00', endTime: '19:30' }],
  startDate: '', endDate: '', fee: '', status: 'planned', notes: '', ...prefill,
});

// Suggested name: "FR-A1" style from language code, audience and level.
const suggestName = (program, level) =>
  program ? `${program.language?.code?.toUpperCase() ?? ''}-${program.audience?.[0]?.toUpperCase() ?? ''}${level}` : '';

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
  const setSlot = (i, k, v) => set('schedule', f.schedule.map((s, j) => (j === i ? { ...s, [k]: k === 'day' ? Number(v) : v } : s)));

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
      delete data._id; delete data.level; delete data.roster; delete data.enrolledCount; delete data.sessions;
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
      subtitle="A group is one level of a program, at one campus, with a teacher and a weekly schedule."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} disabled={!f.name || !f.program || !f.campus} onClick={save}>Save group</Button></>}
    >
      <div className="row">
        <div className="col-sm-6">
          <Field label="Program" required>
            <select className="form-select" value={f.program} onChange={(e) => { const p = programs.find((x) => x._id === e.target.value); setF((x) => ({ ...x, program: e.target.value, name: x.name || suggestName(p, x.levelNumber) })); }}>
              <option value="">Choose…</option>
              {programs.filter((p) => p.active || p._id === f.program).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="col-sm-6">
          <Field label="Level" required hint={level ? `${level.durationWeeks} weeks · ${level.hours} h · ${money(level.fee)}` : undefined}>
            <select className="form-select" value={f.levelNumber} onChange={(e) => set('levelNumber', e.target.value)} disabled={!program}>
              {(program?.levels ?? [{ number: 1, name: 'Level 1' }]).map((l) => <option key={l.number} value={l.number}>{l.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="col-sm-6">
          <Field label="Group name" required hint="Short and recognisable, e.g. FR-A1 Evening">
            <input className="form-control" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder={suggestName(program, f.levelNumber) || 'FR-A1 Evening'} />
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
      <Field label="Weekly schedule">
        <div className="d-flex flex-column gap-2">
          {f.schedule.map((s, i) => (
            <div key={i} className="d-flex gap-2 align-items-center">
              <select className="form-select" value={s.day} onChange={(e) => setSlot(i, 'day', e.target.value)} style={{ maxWidth: 170 }}>
                {WEEK_ORDER.map((d) => <option key={d} value={d}>{DAYS[d]}</option>)}
              </select>
              <input type="time" className="form-control" value={s.startTime} onChange={(e) => setSlot(i, 'startTime', e.target.value)} style={{ maxWidth: 130 }} />
              <span className="fg-subtle">→</span>
              <input type="time" className="form-control" value={s.endTime} onChange={(e) => setSlot(i, 'endTime', e.target.value)} style={{ maxWidth: 130 }} />
              <Button variant="ghost" size="sm" icon={X} onClick={() => set('schedule', f.schedule.filter((_, j) => j !== i))} aria-label="Remove" />
            </div>
          ))}
          <div><Button variant="soft" size="sm" icon={Plus} onClick={() => set('schedule', [...f.schedule, { ...(f.schedule.at(-1) ?? { startTime: '18:00', endTime: '19:30' }), day: ((f.schedule.at(-1)?.day ?? 0) + 2) % 7 }])}>Add a day</Button></div>
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
