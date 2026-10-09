import { useEffect, useId, useState } from 'react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ChangeUsername() {
  const { user } = useAuth();
  const id = useId();
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [sentFor, setSentFor] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [expiry, setExpiry] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!cooldown && !expiry) return;
    const timer = setTimeout(() => { setCooldown(value => Math.max(0, value - 1)); setExpiry(value => Math.max(0, value - 1)); }, 1000);
    return () => clearTimeout(timer);
  }, [cooldown, expiry]);
  if (!['faculty','hod','coordinator','accounts','principal'].includes(user?.role?.toLowerCase())) return null;
  const target = username.trim();
  const valid = /^[A-Za-z0-9][A-Za-z0-9._-]{2,99}$/.test(target) && target !== user.username;
  const reportError = failure => {
    setError(failure.error || failure.message || 'Account verification is unavailable. Please retry.');
    const wait = failure.details?.retryAfter || failure.retryAfter;
    if (wait) setCooldown(Number(wait));
  };
  const send = async () => {
    setPending(true); setError(''); setMessage('');
    try {
      const result = await authAPI.sendUsernameOtp(target);
      if (!result.message) throw new Error('The server did not confirm OTP delivery.');
      setSentFor(target); setOtp(''); setCooldown(result.cooldownSeconds || 60); setExpiry(result.expirySeconds || 300);
      setMessage('OTP sent to your registered email. It confirms only this new username.');
    } catch (failure) { reportError(failure); }
    finally { setPending(false); }
  };
  const confirm = async event => {
    event.preventDefault(); setPending(true); setError(''); setMessage('');
    try {
      const result = await authAPI.changeUsername(target, otp);
      if (!result.user?.username) throw new Error('The server did not return the saved username.');
      window.dispatchEvent(new CustomEvent('auth:refreshed', { detail: { ...user, ...result.user } }));
      window.dispatchEvent(new Event('staff:updated'));
      setMessage(`Username changed to ${result.user.username}. Use it at your next sign-in.`);
      setUsername(''); setOtp(''); setSentFor(null); setExpiry(0);
    } catch (failure) { reportError(failure); }
    finally { setPending(false); }
  };
  return <section className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
    <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Change login username</h2>
    <p className="mt-2 break-words text-sm text-slate-600">Current username: <strong>{user.username || 'Unavailable'}</strong>. Confirm the change using a code sent to your registered email.</p>
    <form onSubmit={confirm} className="mt-4 space-y-4">
      <div><label htmlFor={`${id}-username`} className="block text-sm font-medium text-slate-700">New username</label>
        <input id={`${id}-username`} value={username} disabled={pending} maxLength={100} autoComplete="username" aria-describedby={`${id}-hint`} onChange={event => { setUsername(event.target.value); setSentFor(null); setOtp(''); setError(''); setMessage(''); }} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-600" />
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-600">3–100 letters, numbers, dots, underscores or hyphens. Start with a letter or number. Your display name stays separate.</p></div>
      <button type="button" onClick={send} disabled={pending || cooldown > 0 || !valid} className="w-full sm:w-auto rounded-lg border border-teal-700 px-4 py-2.5 text-sm font-medium text-teal-800 disabled:cursor-not-allowed disabled:opacity-50">{pending ? 'Working…' : cooldown ? `Resend in ${cooldown}s` : sentFor ? 'Resend username OTP' : 'Send username OTP'}</button>
      {sentFor && <div><label htmlFor={`${id}-otp`} className="block text-sm font-medium text-slate-700">Username verification code</label>
        <input id={`${id}-otp`} value={otp} disabled={pending} maxLength={6} inputMode="numeric" autoComplete="one-time-code" onChange={event => setOtp(event.target.value.replace(/\D/g, ''))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-600" />
        <p className="mt-1 text-xs text-slate-600">{expiry ? `Code expires in ${Math.ceil(expiry / 60)} minutes.` : 'Code expired. Request a new code.'}</p></div>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-teal-50 p-3 text-sm text-teal-900">{message}</p>}
      <button type="submit" disabled={pending || !valid || sentFor !== target || !expiry || otp.length !== 6} className="w-full sm:w-auto rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">Confirm username change</button>
    </form>
  </section>;
}
