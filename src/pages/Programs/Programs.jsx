import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import { Languages, Pencil, Plus, Trash2 } from 'lucide-react';
import { languagesApi } from '@api/endpoints';
import { reloadRef } from '@store/refsSlice';
import { useCan } from '@helpers/hooks';
import { money } from '@helpers/format';
import { toast } from '@helpers/toast';
import { useConfirm } from '@context/ConfirmContext';
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader } from '@components';
import { CAN } from '@data/roles';
import { AUDIENCES } from '@data/enums';
import ProgramFormModal from './ProgramFormModal';

const LanguagesModal = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const confirm = useConfirm();
  const languages = useSelector((s) => s.refs.languages);
  const [draft, setDraft] = useState({ name: '', code: '', color: '#7B3FE4' });
  const add = async () => {
    try {
      await languagesApi.create(draft);
      setDraft({ name: '', code: '', color: '#7B3FE4' });
      dispatch(reloadRef('languages'));
    } catch (err) { toast.error(err); }
  };
  const remove = async (l) => {
    if (!(await confirm({ title: `Delete ${l.name}?`, danger: true, confirmLabel: 'Delete' }))) return;
    try { await languagesApi.remove(l._id); dispatch(reloadRef('languages')); } catch (err) { toast.error(err); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Languages taught" footer={<Button onClick={onClose}>Done</Button>}>
      {languages.map((l) => (
        <div key={l._id} className="d-flex align-items-center gap-2 py-2 border-bottom">
          <Badge color={l.color}>{l.code.toUpperCase()}</Badge>
          <span className="fw-600 flex-grow-1">{l.name}</span>
          <Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove(l)} aria-label="Delete" />
        </div>
      ))}
      <div className="row g-2 mt-2 align-items-end">
        <div className="col-5"><Field label="Name" className="mb-0"><input className="form-control" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="German" /></Field></div>
        <div className="col-3"><Field label="Code" className="mb-0"><input className="form-control" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} placeholder="de" maxLength={5} /></Field></div>
        <div className="col-2"><input type="color" className="form-control form-control-color w-100" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} /></div>
        <div className="col-2"><Button icon={Plus} disabled={!draft.name || !draft.code} onClick={add} aria-label="Add" /></div>
      </div>
    </Modal>
  );
};

const Programs = () => {
  const dispatch = useDispatch();
  const confirm = useConfirm();
  const { programs, languages } = useSelector((s) => s.refs);
  const [editing, setEditing] = useState(null);
  const [langs, setLangs] = useState(false);
  const canEdit = useCan(CAN.managePrograms);
  const reload = () => dispatch(reloadRef('programs'));

  const remove = async (p) => {
    if (!(await confirm({ title: `Delete ${p.name}?`, message: 'Only possible if no group uses it. Otherwise close registrations instead.', danger: true, confirmLabel: 'Delete' }))) return;
    try {
      const { programsApi } = await import('@api/endpoints');
      await programsApi.remove(p._id);
      reload();
    } catch (err) { toast.error(err); }
  };

  return (
    <>
      <PageHeader
        title="Programs & levels"
        subtitle="Each workshop (language × audience) has its own levels, durations and fees."
        actions={canEdit && (
          <>
            <Button variant="secondary" icon={Languages} onClick={() => setLangs(true)}>Languages</Button>
            <Button icon={Plus} onClick={() => setEditing({})}>New program</Button>
          </>
        )}
      />
      {languages.map((lang) => {
        const list = programs.filter((p) => p.language?._id === lang._id);
        if (!list.length) return null;
        return (
          <div key={lang._id} className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-2">
              <Badge color={lang.color}>{lang.code.toUpperCase()}</Badge>
              <h2 className="fs-15 fw-800 m-0">{lang.name}</h2>
            </div>
            <div className="row g-3">
              {list.map((p) => (
                <div key={p._id} className="col-xl-6">
                  <Card
                    title={<span className="d-inline-flex align-items-center gap-2"><i style={{ width: 10, height: 10, borderRadius: 3, background: p.color, display: 'inline-block' }} />{p.name}</span>}
                    subtitle={`${AUDIENCES[p.audience]}${p.minAge ? ` · ${p.minAge}${p.maxAge ? `–${p.maxAge}` : '+'} years` : ''}${p.active ? '' : ' · registrations closed'}`}
                    actions={canEdit && (
                      <>
                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(p)}>Edit</Button>
                        <Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove(p)} aria-label="Delete" />
                      </>
                    )}
                    className={p.active ? '' : 'opacity-75'}
                    padded={false}
                  >
                    <div className="table-scroll mt-3">
                      <table className="table-eltc compact">
                        <thead><tr><th>Level</th><th className="num">Duration</th><th className="num">Hours</th><th className="num">Fee</th><th /></tr></thead>
                        <tbody>
                          {p.levels.map((l) => (
                            <tr key={l.number}>
                              <td className="fw-600">{l.name}</td>
                              <td className="num">{l.durationWeeks} wk</td>
                              <td className="num">{l.hours} h</td>
                              <td className="num fw-700">{money(l.fee)}</td>
                              <td className="text-end"><Link to={`/students?program=${p._id}`} className="fs-12 fw-600 d-none">Students</Link></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {!programs.length && <EmptyState title="No program yet" action={canEdit && <Button icon={Plus} onClick={() => setEditing({})}>New program</Button>} />}
      <ProgramFormModal open={Boolean(editing)} program={editing?._id ? editing : null} onClose={() => setEditing(null)} onSaved={reload} />
      <LanguagesModal open={langs} onClose={() => setLangs(false)} />
    </>
  );
};

export default Programs;
