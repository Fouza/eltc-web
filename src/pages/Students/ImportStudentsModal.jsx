import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { studentsApi } from '@api/endpoints';
import { Button, Field, Modal, Badge } from '@components';
import { parseCsv, downloadFile } from '@helpers/csv';
import { toast } from '@helpers/toast';

// Import the school's existing spreadsheets (exported as CSV).
const FIELDS = [
  ['firstName', 'First name', ['prenom', 'prénom', 'first name', 'firstname']],
  ['lastName', 'Last name', ['nom', 'last name', 'lastname', 'surname']],
  ['phone', 'Phone', ['telephone', 'téléphone', 'tel', 'tél', 'tél.', 'phone', 'mobile', 'portable']],
  ['phone2', 'Phone 2', ['phone 2', 'telephone 2', 'téléphone 2', 'tel 2', 'tél 2', 'mobile 2', 'phone2']],
  ['email', 'Email', ['email', 'mail', 'e-mail']],
  ['birthDate', 'Birth date (YYYY-MM-DD)', ['date de naissance', 'birth date', 'birthdate', 'naissance']],
  ['birthPlace', 'Place of birth', ['lieu de naissance', 'lieu naissance', 'place of birth', 'birthplace', 'birth place', 'né à', 'née à', 'né(e) à']],
  ['gender', 'Gender', ['sexe', 'gender', 'genre']],
  ['address', 'Address', ['adresse', 'address']],
  ['city', 'City', ['ville', 'city']],
  ['occupation', 'Occupation', ['profession', 'occupation', 'job']],
  ['guardianName', 'Guardian name', ['parent', 'tuteur', 'guardian', 'nom du parent', 'nom parent']],
  ['guardianPhone', 'Guardian phone', ['tel parent', 'tél parent', 'téléphone parent', 'téléphone du parent']],
  ['notes', 'Notes', ['notes', 'remarques', 'observations']],
];

// A column matches a field by one of its aliases or by the field's own label (the downloaded template uses the labels).
const guess = (header) => {
  const h = header.toLowerCase().trim();
  return FIELDS.find(([, label, aliases]) => aliases.includes(h) || label.toLowerCase() === h)?.[0] ?? '';
};

const ImportStudentsModal = ({ open, onClose, onDone }) => {
  const campuses = useSelector((s) => s.refs.campuses);
  const [parsed, setParsed] = useState(null);
  const [mapping, setMapping] = useState([]);
  const [campus, setCampus] = useState('');
  const [status, setStatus] = useState('active');
  const [report, setReport] = useState(null);
  const [saving, setSaving] = useState(false);

  const reset = () => { setParsed(null); setReport(null); setMapping([]); };
  const onFile = async (file) => {
    const result = parseCsv(await file.text());
    setParsed(result);
    setMapping(result.headers.map(guess));
    setReport(null);
  };
  const rows = parsed ? parsed.rows.map((r) => Object.fromEntries(mapping.map((f, i) => [f, r[i]]).filter(([f]) => f))) : [];

  const run = async () => {
    setSaving(true);
    try {
      const res = await studentsApi.import({ rows, campus, status });
      setReport(res);
      toast.success(`${res.created} students imported`, res.skipped ? `${res.skipped} duplicates skipped` : undefined);
      onDone?.();
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  const template = () =>
    downloadFile(`${FIELDS.map(([, label]) => label).join(';')}\nMarie;Dupont;0550123456;marie@mail.com;1995-04-12;Alger;F;12 rue Didouche;Centre;Engineer;;;\n`, 'students-template.csv');

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      size="lg"
      title="Import students from a spreadsheet"
      subtitle="In Excel: File → Save as → CSV. Columns are matched automatically; adjust if needed."
      footer={
        report ? (
          <Button onClick={() => { reset(); onClose(); }}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" icon={Download} onClick={template} className="me-auto">Download template</Button>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button icon={Upload} disabled={!rows.length || !campus || !mapping.includes('firstName') || !mapping.includes('lastName')} loading={saving} onClick={run}>
              Import {rows.length || ''} students
            </Button>
          </>
        )
      }
    >
      {report ? (
        <div>
          <div className="d-flex gap-2 mb-3">
            <Badge tone="green">{report.created} created</Badge>
            <Badge tone="amber">{report.skipped} duplicates skipped</Badge>
            <Badge tone="red">{report.errors.length} errors</Badge>
          </div>
          {report.errors.slice(0, 20).map((e) => <div key={e.row} className="fs-13 fg-red">Row {e.row}: {e.error}</div>)}
        </div>
      ) : !parsed ? (
        <label className="d-block border border-2 rounded-4 p-5 text-center cursor-pointer" style={{ borderStyle: 'dashed' }}>
          <FileSpreadsheet size={32} className="fg-blue mb-2" />
          <div className="fw-700">Choose a CSV file</div>
          <div className="fs-13 fg-muted">Separator “,” or “;” · first line = column names</div>
          <input type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />
        </label>
      ) : (
        <>
          <div className="row g-3">
            <div className="col-sm-6">
              <Field label="Campus" required>
                <select className="form-select" value={campus} onChange={(e) => setCampus(e.target.value)}>
                  <option value="">Choose…</option>
                  {campuses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="col-sm-6">
              <Field label="Import as">
                <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="active">Active students</option>
                  <option value="prospect">Waiting list</option>
                  <option value="inactive">Former students</option>
                </select>
              </Field>
            </div>
          </div>
          <div className="ls-up mb-2">Columns ({parsed.rows.length} rows found)</div>
          <div className="table-scroll border rounded-3">
            <table className="table-eltc compact">
              <thead>
                <tr><th>Column in your file</th><th>Example</th><th>Goes to</th></tr>
              </thead>
              <tbody>
                {parsed.headers.map((h, i) => (
                  <tr key={h + i}>
                    <td className="fw-600">{h}</td>
                    <td className="fg-muted">{parsed.rows[0]?.[i]}</td>
                    <td>
                      <select className="form-select form-select-sm" value={mapping[i]} onChange={(e) => setMapping((m) => m.map((v, j) => (j === i ? e.target.value : v)))}>
                        <option value="">— ignore —</option>
                        {FIELDS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
};

export default ImportStudentsModal;
