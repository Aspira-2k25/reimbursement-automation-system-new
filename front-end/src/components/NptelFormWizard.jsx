import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, FileText, Loader2 } from 'lucide-react';
import { nptelSteps, previewDocuments } from '../utils/nptelReview';

function DocumentPreview({ document }) {
  const [fileUrl, setFileUrl] = useState('');
  useEffect(() => {
    if (!document.file) { setFileUrl(''); return; }
    const url = URL.createObjectURL(document.file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [document.file]);
  const url = fileUrl || document.url;
  return <div className="min-w-0 rounded-xl border border-slate-200 p-4">
    <p className="font-medium text-slate-900">{document.label}</p>
    <p className="mt-1 break-all text-sm text-slate-600">{document.file?.name || (document.publicId ? 'Existing uploaded document' : 'No file selected')}</p>
    {document.file && <p className="mt-1 text-xs text-slate-500">New upload · {(document.file.size / 1024).toFixed(1)} KB</p>}
    {document.file?.type.startsWith('image/') && fileUrl && <img src={fileUrl} alt={`${document.label} preview`} className="mt-3 max-h-48 w-full rounded-lg object-contain" />}
    {url && <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-teal-700 px-3 py-2 text-sm font-medium text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600"><FileText size={16} />Preview {document.label}</a>}
  </div>;
}
function Review({ values, applicantType, documents, onEdit, busy }) {
  const [showAccount, setShowAccount] = useState(false);
  const display = value => value === undefined || value === null || value === '' ? 'Not provided' : String(value);
  const groups = [
    { title: 'Applicant details', fields: [['Name', values.name],['Applicant type', applicantType],['Institutional ID', values.studentId || values.facultyId],['Division', values.division],['Department', values.department],['Email', values.email]] },
    { title: 'Course & reimbursement', fields: [['Course', values.courseName],['Academic year', values.academicYear],['Marks', `${display(values.marks)}%`],['Reimbursement', `₹${Number(values.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],['Category', 'NPTEL']] },
    { title: 'Bank details', fields: [['Account holder', values.accountName],['IFSC', values.ifscCode],['Account number', showAccount ? values.accountNumber : `•••• ${String(values.accountNumber || '').slice(-4)}`]] },
  ];
  return <div className="space-y-4">
    <p className="rounded-xl bg-teal-50 p-4 text-sm text-teal-900">Review every section and preview the documents before confirming. You can return to a section without losing your entries or selected files.</p>
    {groups.map((group, index) => <section key={group.title} className="rounded-xl border border-slate-200 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-semibold text-slate-900">{group.title}</h3><button type="button" disabled={busy} onClick={() => onEdit(index)} aria-label={`Edit ${group.title}`} className="rounded-lg px-3 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-600">Edit</button></div>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">{group.fields.filter(([label,value]) => label !== 'Division' || value).map(([label,value]) => <div key={label} className="min-w-0"><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm text-slate-900">{display(value)}</dd></div>)}</dl>
      {index === 2 && <button type="button" aria-pressed={showAccount} onClick={() => setShowAccount(value => !value)} className="mt-3 rounded px-2 py-1 text-sm text-teal-800 underline focus:outline-none focus:ring-2 focus:ring-teal-600">{showAccount ? 'Hide full account number' : 'Show full account number'}</button>}
    </section>)}
    <section className="rounded-xl border border-slate-200 p-4 sm:p-5"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-slate-900">Supporting documents</h3><button type="button" disabled={busy} onClick={() => onEdit(3)} aria-label="Edit Supporting documents" className="rounded-lg px-3 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50">Edit</button></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{documents.map((document,index) => <DocumentPreview key={document.kind || index} document={document} />)}</div></section>
  </div>;
}

export default function NptelFormWizard({ sections, values, applicantType = 'Faculty', existingDocuments = [], validate, onSubmit, busy = false, editing = false, onCancel }) {
  const [step, setStep] = useState(0);
  const [visited, setVisited] = useState(0);
  const [uploads, setUploads] = useState({});
  const focusTarget = useRef(null);
  const region = useRef(null);
  const submitting = useRef(false);
  const reviewIndex = nptelSteps.length;
  const focusPending = useRef(false);
  useEffect(() => {
    if (focusPending.current) {
      focusPending.current = false;
      (region.current?.querySelector('[aria-invalid="true"]') || focusTarget.current)?.focus();
    }
  }, [step, visited]);
  const move = index => {
    focusPending.current = true;
    setStep(index);
    setVisited(previous => Math.max(previous, index));
  };
  const validateThrough = target => {
    for (let index = 0; index < target; index++) {
      if (!validate(nptelSteps[index].fields)) {
        move(index);
        requestAnimationFrame(() => document.querySelector(`[data-nptel-step="${index}"] [aria-invalid="true"]`)?.focus());
        return false;
      }
    }
    return true;
  };
  const goTo = target => {
    if (busy || submitting.current) return;
    if (target > step && !validateThrough(target)) return;
    move(target);
  };
  const submit = async event => {
    event.preventDefault();
    if (busy || submitting.current) return;
    if (step < reviewIndex) { goTo(step + 1); return; }
    if (!validateThrough(reviewIndex)) return;
    submitting.current = true;
    try { await onSubmit(event); }
    finally { submitting.current = false; }
  };
  return <form noValidate onSubmit={submit} onChange={event => {
    if (event.target.type === 'file') setUploads(previous => ({ ...previous, [event.target.name]: event.target.files?.[0] || null }));
  }} className="space-y-5">
    <p className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900"><strong>NPTEL reimbursement</strong> · Maximum ₹1,500 · Review before {editing ? 'saving' : 'submitting'}.</p>
    <nav aria-label="Application steps" className="grid grid-cols-5 gap-1 sm:gap-2">
      {[...nptelSteps.map(item => item.title), 'Review'].map((title,index) => <button key={title} type="button" disabled={busy || index > visited} aria-current={step === index ? 'step' : undefined} aria-label={`Step ${index + 1}: ${title}`} onClick={() => goTo(index)} className={`flex min-w-0 flex-col items-center gap-2 rounded-xl px-1 py-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 disabled:cursor-not-allowed ${step === index ? 'bg-teal-700 font-semibold text-white' : index < step ? 'bg-teal-50 text-teal-800' : 'bg-slate-50 text-slate-600'}`}>
        <span className={`flex h-7 w-7 items-center justify-center rounded-full border ${step === index ? 'border-white/50' : 'border-slate-300'}`}>{index < step ? <Check size={15} aria-hidden="true" /> : index + 1}</span><span className="text-center leading-tight">{title}</span>
      </button>)}
    </nav>
    <div className="border-b border-slate-200 pb-3"><p className="text-xs font-medium text-teal-700">Step {step + 1} of 5</p><h2 ref={focusTarget} tabIndex={-1} className="mt-1 text-xl font-semibold text-slate-900 focus:outline-none">{step === reviewIndex ? (editing ? 'Review changes' : 'Review your application') : nptelSteps[step].title}</h2><p className="mt-1 text-sm text-slate-600">{step === reviewIndex ? 'Confirm the details below. Nothing is sent until you confirm.' : nptelSteps[step].description}</p></div>
    <fieldset disabled={busy} className="min-w-0">
      {sections.map((content,index) => <section key={nptelSteps[index].title} data-nptel-step={index} hidden={step !== index} ref={step === index ? region : undefined}>{content}</section>)}
      {step === reviewIndex && <Review values={values} applicantType={applicantType} documents={previewDocuments(existingDocuments, uploads, applicantType)} onEdit={goTo} busy={busy} />}
    </fieldset>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
      <div className="flex items-center gap-2"><button type="button" disabled={busy || step === 0} onClick={() => goTo(step - 1)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"><ArrowLeft size={16} />Previous</button>{onCancel && <button type="button" disabled={busy} onClick={onCancel} className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>}</div>
      <button type="submit" disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <><Loader2 size={16} className="animate-spin" />{editing ? 'Saving…' : 'Submitting…'}</> : step === reviewIndex ? (editing ? 'Confirm & save changes' : 'Confirm & submit application') : <>{step === 3 ? 'Preview application' : 'Continue'}<ArrowRight size={16} /></>}</button>
    </div>
  </form>;
}
