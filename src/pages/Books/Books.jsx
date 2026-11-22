import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { BookOpen, ImagePlus, PackagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { booksApi } from '@api/endpoints';
import { useApi, useCan } from '@helpers/hooks';
import { money, levelName } from '@helpers/format';
import { resizeImage } from '@helpers/image';
import { toast } from '@helpers/toast';
import { useConfirm } from '@context/ConfirmContext';
import { Badge, Button, EmptyState, Field, Loader, Modal, PageHeader, SearchInput } from '@components';
import { CAN } from '@data/roles';
import styles from './Books.module.scss';

const blank = () => ({ title: '', publisher: '', price: '', image: '', levels: [], lowStockAt: 5, active: true, notes: '', stock: {} });
const sameLevel = (a, programId, n) => (a.program?._id ?? a.program) === programId && a.levelNumber === n;

const BookModal = ({ open, book, onClose, onSaved }) => {
  const { programs, campuses } = useSelector((s) => s.refs);
  const [f, setF] = useState(blank());
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setF(book ? { ...blank(), ...book, levels: book.levels.map((l) => ({ program: l.program?._id ?? l.program, levelNumber: l.levelNumber })) } : blank());
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const toggleLevel = (programId, n) =>
    set('levels', f.levels.some((l) => sameLevel(l, programId, n)) ? f.levels.filter((l) => !sameLevel(l, programId, n)) : [...f.levels, { program: programId, levelNumber: n }]);

  const pickImage = async (file) => {
    try {
      set('image', await resizeImage(file));
    } catch (err) {
      toast.error(err);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const data = { title: f.title, publisher: f.publisher, price: Number(f.price), image: f.image || null, levels: f.levels, lowStockAt: Number(f.lowStockAt), active: f.active, notes: f.notes };
      if (!book) data.stock = Object.entries(f.stock).filter(([, q]) => Number(q) > 0).map(([campus, q]) => ({ campus, quantity: Number(q) }));
      const saved = book ? await booksApi.update(book._id, data) : await booksApi.create(data);
      toast.success(book ? 'Book updated' : 'Book added');
      onSaved?.(saved);
      onClose();
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={book ? `Edit ${book.title}` : 'New book'}
      subtitle="Students enrolling in the ticked levels are charged for this book automatically."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} disabled={!f.title || !(Number(f.price) >= 0) || f.price === ''} onClick={save}>Save book</Button></>}
    >
      <div className="d-flex gap-4 flex-wrap">
        <div>
          <div className="form-label">Picture</div>
          <button type="button" className={styles.upload} onClick={() => fileRef.current?.click()}>
            {f.image ? <img src={f.image} alt="" /> : <span><ImagePlus size={22} /><br />Add a picture</span>}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = ''; }} />
          {f.image && <div className="text-center mt-1"><Button size="sm" variant="ghost" icon={X} onClick={() => set('image', '')}>Remove</Button></div>}
        </div>
        <div className="flex-grow-1" style={{ minWidth: 280, flexBasis: 0 }}>
          <div className="row">
            <div className="col-md-6"><Field label="Title" required><input className="form-control" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="English File A1" /></Field></div>
            <div className="col-md-6"><Field label="Publisher / series"><input className="form-control" value={f.publisher ?? ''} onChange={(e) => set('publisher', e.target.value)} /></Field></div>
            <div className="col-md-4"><Field label="Price" required hint="Changing it later does not change invoices already issued."><input type="number" min="0" className="form-control" value={f.price} onChange={(e) => set('price', e.target.value)} /></Field></div>
            <div className="col-md-4"><Field label="Low stock alert at" hint="copies left at a campus"><input type="number" min="0" className="form-control" value={f.lowStockAt} onChange={(e) => set('lowStockAt', e.target.value)} /></Field></div>
            <div className="col-md-4 d-flex align-items-center"><label className="d-flex align-items-center gap-2 fw-600 fs-13 mt-2"><input type="checkbox" className="form-check-input m-0" checked={f.active} onChange={(e) => set('active', e.target.checked)} /> In use (charged on enrollment)</label></div>
          </div>
          {!book && (
            <Field label="Copies in stock now" hint="Leave empty if none yet. Add copies later with “Stock”.">
              <div className="d-flex gap-3 flex-wrap">
                {campuses.filter((c) => c.status !== 'closed').map((c) => (
                  <label key={c._id} className="d-flex align-items-center gap-2 fs-13">
                    {c.name}
                    <input type="number" min="0" className="form-control" style={{ width: 90 }} value={f.stock[c._id] ?? ''} onChange={(e) => set('stock', { ...f.stock, [c._id]: e.target.value })} />
                  </label>
                ))}
              </div>
            </Field>
          )}
        </div>
      </div>
      <Field label="Used in" hint="Tick every level that uses this book, in one or several programs.">
        <div className="border rounded-3 px-3">
          {programs.map((p) => (
            <div key={p._id} className={styles.levelRow}>
              <span className={styles.programName}>{p.name}</span>
              {p.levels.map((l) => {
                const on = f.levels.some((x) => sameLevel(x, p._id, l.number));
                return (
                  <label key={l.number} className={`${styles.levelChip} ${on ? styles.levelOn : ''}`}>
                    <input type="checkbox" className="form-check-input" checked={on} onChange={() => toggleLevel(p._id, l.number)} /> {l.name}
                  </label>
                );
              })}
            </div>
          ))}
        </div>
      </Field>
    </Modal>
  );
};

const StockModal = ({ book, onClose, onSaved }) => {
  const campuses = useSelector((s) => s.refs.campuses);
  const [campus, setCampus] = useState('');
  const [mode, setMode] = useState('in');
  const [qty, setQty] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (book) { setCampus(campuses.find((c) => c.status === 'active')?._id ?? ''); setMode('in'); setQty(''); }
  }, [book]); // eslint-disable-line react-hooks/exhaustive-deps
  const current = (id) => book?.stock.find((s) => (s.campus?._id ?? s.campus) === id)?.quantity ?? 0;
  const save = async () => {
    setSaving(true);
    try {
      await booksApi.stock(book._id, { campus, change: (mode === 'in' ? 1 : -1) * Number(qty) });
      toast.success('Stock updated');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={Boolean(book)} onClose={onClose} size="sm" title={`Stock · ${book?.title ?? ''}`} subtitle="Copies go down by themselves when a book is marked as handed over."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} disabled={!campus || !(Number(qty) > 0)} onClick={save}>Save</Button></>}>
      <Field label="Campus">
        <select className="form-select" value={campus} onChange={(e) => setCampus(e.target.value)}>
          {campuses.filter((c) => c.status !== 'closed').map((c) => <option key={c._id} value={c._id}>{c.name} · {current(c._id)} in stock</option>)}
        </select>
      </Field>
      <div className="row">
        <div className="col-7">
          <Field label="Change">
            <select className="form-select" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="in">Copies received (+)</option>
              <option value="out">Copies removed (−) · lost, damaged</option>
            </select>
          </Field>
        </div>
        <div className="col-5"><Field label="How many"><input type="number" min="1" className="form-control" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus /></Field></div>
      </div>
      {campus && Number(qty) > 0 && <div className="fs-13 fg-muted">New stock at this campus: <b className="fg-ink">{current(campus) + (mode === 'in' ? 1 : -1) * Number(qty)}</b></div>}
    </Modal>
  );
};

const Books = () => {
  const programs = useSelector((s) => s.refs.programs);
  const confirm = useConfirm();
  const canEdit = useCan(CAN.manageBooks);
  const canDelete = useCan(CAN.deleteBooks);
  const [program, setProgram] = useState('');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [stocking, setStocking] = useState(null);
  const { data: books, loading, reload } = useApi(() => booksApi.list({ program }), [program]);
  const shown = useMemo(() => (books ?? []).filter((b) => !q || `${b.title} ${b.publisher ?? ''}`.toLowerCase().includes(q.toLowerCase())), [books, q]);

  const remove = async (b) => {
    if (!(await confirm({ title: `Delete ${b.title}?`, message: 'Only possible if no student was charged for it. Otherwise untick “In use”.', danger: true, confirmLabel: 'Delete' }))) return;
    try {
      await booksApi.remove(b._id);
      toast.success('Book deleted');
      reload();
    } catch (err) { toast.error(err); }
  };

  const levelsOf = (b) => b.levels.map((l) => `${l.program?.name?.split(' – ')[0] ?? ''} ${l.program?.audience === 'children' ? 'Kids ' : ''}${levelName(l.levelNumber, l.program)}`.trim());

  return (
    <>
      <PageHeader
        title="Books"
        subtitle="Books sold with each level. Students are charged when they enroll; track payments in Payments → Books."
        actions={canEdit && <Button icon={Plus} onClick={() => setEditing({})}>New book</Button>}
      />
      <div className="d-flex gap-2 flex-wrap mb-3">
        <SearchInput value={q} onChange={setQ} placeholder="Title or series…" />
        <select className="form-select" style={{ maxWidth: 240 }} value={program} onChange={(e) => setProgram(e.target.value)}>
          <option value="">All programs</option>
          {programs.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
      </div>
      {loading && !books ? <Loader /> : shown.length ? (
        <div className="row g-3">
          {shown.map((b) => (
            <div key={b._id} className="col-md-6 col-xl-4">
              <div className={`${styles.card} ${b.active ? '' : styles.inactive}`}>
                {b.image ? <img src={b.image} alt="" className={styles.cover} /> : <div className={styles.cover}><BookOpen size={24} /></div>}
                <div className="flex-grow-1 min-w-0">
                  <div className="d-flex justify-content-between gap-2">
                    <div className="min-w-0">
                      <div className={styles.title}>{b.title}</div>
                      <div className="fs-12 fg-subtle">{b.publisher}{b.active ? '' : ' · not in use'}</div>
                    </div>
                    <div className={styles.price}>{money(b.price)}</div>
                  </div>
                  <div className={styles.levels}>
                    {levelsOf(b).map((l) => <Badge key={l} tone="gray">{l}</Badge>)}
                    {!b.levels.length && <span className="fs-12 fg-muted">Not linked to a level yet</span>}
                  </div>
                  <div className={styles.stock}>
                    {b.stock.filter((s) => s.campus).map((s) => (
                      <span key={s.campus._id} className={`${styles.stockItem} ${s.quantity <= 0 ? styles.out : s.quantity <= b.lowStockAt ? styles.low : ''}`} title={s.campus.name}>
                        {s.campus.code} · {s.quantity}
                      </span>
                    ))}
                    {!b.stock.length && <span className="fs-12 fg-muted">No stock yet</span>}
                  </div>
                  {canEdit && (
                    <div className="d-flex gap-1 mt-2">
                      <Button size="sm" variant="soft" icon={PackagePlus} onClick={() => setStocking(b)}>Stock</Button>
                      <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(b)}>Edit</Button>
                      {canDelete && <Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove(b)} aria-label="Delete" />}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={BookOpen} title="No book yet" message="Add the books used in each level, with their price and stock." />
      )}
      <BookModal open={Boolean(editing)} book={editing?._id ? editing : null} onClose={() => setEditing(null)} onSaved={reload} />
      <StockModal book={stocking} onClose={() => setStocking(null)} onSaved={reload} />
    </>
  );
};

export default Books;
