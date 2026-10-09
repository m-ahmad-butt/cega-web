import { useState } from 'react';
import { adminAPI } from '../utils/api';
import { useWarn } from './GuideModal';
import { Upload, X, Loader2 } from 'lucide-react';

const HINTS = {
  branches: 'Columns: name, code, city, address, contact, status',
  courses: 'Columns: code, title, credit hours, department, status',
  students: 'Columns: name, roll, discipline, email, password',
  slots: 'Columns: course code, date, start time, end time, capacity',
};

const ImportSheet = ({ kind, onClose, onDone }) => {
  const warn = useWarn();
  const [rows, setRows] = useState(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setReading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await adminAPI.previewImport(kind, form);
      setRows(data.data?.rows || []);
    } catch (err) {
      warn(err.response?.data?.message || 'Could not read that file');
    } finally {
      setReading(false);
    }
  };

  const setSend = (index, value) => {
    setRows((current) => current.map((row) => (row.index === index ? { ...row, sendEmail: value } : row)));
  };

  const sendAll = (value) => {
    setRows((current) => current.map((row) => (row.ok ? { ...row, sendEmail: value } : row)));
  };

  const confirm = async () => {
    const ready = (rows || []).filter((row) => row.ok);
    if (!ready.length) return warn('Nothing valid to add');
    setSaving(true);
    try {
      const { data } = await adminAPI.commitImport(kind, { rows: ready });
      onDone(data.data || data);
    } catch (err) {
      warn(err.response?.data?.message || 'Import failed');
    } finally {
      setSaving(false);
    }
  };

  const headers = kind === 'students'
    ? ['Name', 'Roll', 'Discipline', 'Email', 'Password']
    : kind === 'branches'
      ? ['Name', 'Code', 'City', 'Status']
      : kind === 'courses'
        ? ['Code', 'Title', 'Credits', 'Department']
        : ['Course', 'Date', 'Start', 'End', 'Capacity'];

  const cells = (row) => {
    if (kind === 'students') return [row.fullName, row.registrationNumber, row.program, row.email, row.password];
    if (kind === 'branches') return [row.name, row.code, row.city, row.status];
    if (kind === 'courses') return [row.courseCode, row.title, row.creditHours, row.department];
    return [row.courseCode, row.date, row.startTime, row.endTime, row.capacity];
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <div className="n-card flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-notion-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Upload {kind}</h2>
            <p className="text-xs text-notion-muted">{HINTS[kind]}. CSV or Excel.</p>
          </div>
          <button type="button" onClick={onClose} className="n-btn-ghost p-2"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          {!rows ? (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-notion-lg border border-dashed border-notion-border bg-notion-surface px-6 py-12 text-sm text-notion-muted">
              {reading ? <Loader2 size={20} className="mb-2 animate-spin" /> : <Upload size={20} className="mb-2" />}
              {reading ? 'Reading file…' : 'Choose a CSV or XLSX file'}
              <input type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={onFile} />
            </label>
          ) : (
            <>
              {kind === 'students' && (
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-notion-muted">Tick a row to email that password, or send them all.</p>
                  <button type="button" onClick={() => sendAll(true)} className="n-btn-secondary py-1.5 text-xs">Send all</button>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="bg-notion-surface">
                      {headers.map((header) => <th key={header} className="n-th">{header}</th>)}
                      {kind === 'students' && <th className="n-th">Email password</th>}
                      <th className="n-th">Check</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.index}>
                        {cells(row).map((value, i) => <td key={i} className="n-td">{value || '—'}</td>)}
                        {kind === 'students' && (
                          <td className="n-td">
                            <input
                              type="checkbox"
                              checked={!!row.sendEmail}
                              disabled={!row.ok}
                              onChange={(e) => setSend(row.index, e.target.checked)}
                            />
                          </td>
                        )}
                        <td className={`n-td text-xs ${row.ok ? 'text-notion-green' : 'text-notion-red'}`}>
                          {row.ok ? 'Ready' : row.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-notion-border px-5 py-4">
          {rows && <button type="button" onClick={() => setRows(null)} className="n-btn-secondary">Choose another file</button>}
          <button type="button" onClick={onClose} className="n-btn-ghost">Cancel</button>
          <button type="button" onClick={confirm} disabled={!rows || saving} className="n-btn">
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            Confirm and add
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportSheet;
