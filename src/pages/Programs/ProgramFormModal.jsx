import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Plus, X } from 'lucide-react';
import { programsApi } from '@api/endpoints';
import { Button, Field, Modal } from '@components';
import { toast } from '@helpers/toast';
import { AUDIENCES, defaultLevelNames } from '@data/enums';

// Adults start with A1, A2, B1, B1+, B2, C1; children with Bounce 1 → 6. Names stay editable.
const defaultLevels = (audience, fee = 0) => {
  const kids = audience === 'children';
  return defaultLevelNames(audience).map((name, i) => ({ number: i + 1, name, durationWeeks: kids ? 10 : 12, hours: kids ? 30 : 36, fee }));
};
// True while the level names are still the untouched defaults of that audience.
const isDefault = (levels, audience) => {
  const names = defaultLevelNames(audience);
  return levels?.length === names.length && levels.every((l, i) => l.name === names[i]);
};

// A program ("workshop") = language + audience + its levels (6 by default, each with duration and fee).
const ProgramFormModal = ({ open, onClose, onSaved, program }) => {
  const languages = useSelector((s) => s.refs.languages);
  const [f, setF] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF(program
      ? { ...program, language: program.language?._id, levels: program.levels.map((l) => ({ ...l })) }
      : { name: '', language: languages[0]?._id ?? '', audience: 'adults', color: '#064CA5', description: '', active: true, levels: defaultLevels('adults') });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setLevel = (i, k, v) => set('levels', f.levels.map((l, j) => (j === i ? { ...l, [k]: ['durationWeeks', 'hours', 'fee'].includes(k) ? Number(v) : v } : l)));
  // Switching audience swaps in that audience's default levels, unless the levels were already edited.
  const setAudience = (audience) =>
    setF((x) => ({ ...x, audience, ...(isDefault(x.levels, x.audience) ? { levels: defaultLevels(audience, x.levels[0]?.fee ?? 0) } : {}) }));
  const autoName = () => {
    const lang = languages.find((l) => l._id === f.language);
    if (lang && !f.name) set('name', `${lang.name} – ${AUDIENCES[f.audience]}`);
  };
  const save = async () => {
    setSaving(true);
    try {
      const { _id, createdAt, updatedAt, __v, ...data } = f;
      const saved = program ? await programsApi.update(program._id, data) : await programsApi.create(data);
      toast.success(program ? 'Program updated' : 'Program created');
      onSaved?.(saved);
      onClose();
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="xl" title={program ? `Edit ${program.name}` : 'New program'} subtitle="E.g. French for adults, English for children. Each has its own levels and fees." footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} disabled={!f.name || !f.language || !f.levels?.length} onClick={save}>Save program</Button></>}>
      <div className="row">
        <div className="col-md-3">
          <Field label="Language" required>
            <select className="form-select" value={f.language ?? ''} onChange={(e) => set('language', e.target.value)} onBlur={autoName}>
              {languages.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="col-md-3">
          <Field label="For" required>
            <select className="form-select" value={f.audience ?? 'adults'} onChange={(e) => setAudience(e.target.value)} onBlur={autoName}>
              {Object.entries(AUDIENCES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
        <div className="col-md-4"><Field label="Name" required><input className="form-control" value={f.name ?? ''} onChange={(e) => set('name', e.target.value)} onFocus={autoName} /></Field></div>
        <div className="col-md-2"><Field label="Colour"><input type="color" className="form-control form-control-color w-100" value={f.color ?? '#064CA5'} onChange={(e) => set('color', e.target.value)} /></Field></div>
        <div className="col-md-3"><Field label="Min age"><input type="number" className="form-control" value={f.minAge ?? ''} onChange={(e) => set('minAge', e.target.value ? Number(e.target.value) : null)} /></Field></div>
        <div className="col-md-3"><Field label="Max age"><input type="number" className="form-control" value={f.maxAge ?? ''} onChange={(e) => set('maxAge', e.target.value ? Number(e.target.value) : null)} /></Field></div>
        <div className="col-md-6"><Field label="Description"><input className="form-control" value={f.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field></div>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="ls-up">Levels ({f.levels?.length ?? 0})</div>
        <Button size="sm" variant="soft" icon={Plus} onClick={() => set('levels', [...f.levels, { ...(f.levels.at(-1) ?? {}), number: f.levels.length + 1, name: defaultLevelNames(f.audience)[f.levels.length] ?? `Level ${f.levels.length + 1}` }])}>Add a level</Button>
      </div>
      <div className="table-scroll border rounded-3">
        <table className="table-eltc compact">
          <thead><tr><th>#</th><th>Name</th><th>Weeks</th><th>Hours</th><th>Fee</th><th /></tr></thead>
          <tbody>
            {f.levels?.map((l, i) => (
              <tr key={i}>
                <td className="fw-700">{i + 1}</td>
                <td><input className="form-control form-control-sm" value={l.name ?? ''} onChange={(e) => setLevel(i, 'name', e.target.value)} /></td>
                <td><input type="number" className="form-control form-control-sm" style={{ width: 80 }} value={l.durationWeeks ?? ''} onChange={(e) => setLevel(i, 'durationWeeks', e.target.value)} /></td>
                <td><input type="number" className="form-control form-control-sm" style={{ width: 80 }} value={l.hours ?? ''} onChange={(e) => setLevel(i, 'hours', e.target.value)} /></td>
                <td><input type="number" className="form-control form-control-sm" style={{ width: 120 }} value={l.fee ?? ''} onChange={(e) => setLevel(i, 'fee', e.target.value)} /></td>
                <td><Button size="sm" variant="ghost" icon={X} onClick={() => set('levels', f.levels.filter((_, j) => j !== i))} aria-label="Remove level" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <label className="d-flex align-items-center gap-2 mt-3 fw-600 fs-13">
        <input type="checkbox" className="form-check-input m-0" checked={f.active ?? true} onChange={(e) => set('active', e.target.checked)} /> Open for registration
      </label>
    </Modal>
  );
};

export default ProgramFormModal;
