import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Eye, EyeOff, Lock, Mail, CalendarCheck2, Wallet, Users } from 'lucide-react';
import { login } from '@store/authSlice';
import { Button, Field } from '@components';
import styles from './Login.module.scss';

const Login = () => {
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);

  // On the free hosting plan the API sleeps when unused: start waking it while the user types.
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/health`).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => setSlow(true), 4000);
    const res = await dispatch(login({ email, password }));
    clearTimeout(timer);
    setSlow(false);
    setLoading(false);
    if (res.error) setError(res.error.message);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.formSide}>
        <form className={styles.form} onSubmit={submit}>
          <div className={styles.logo}>E</div>
          <h1 className={styles.title}>Welcome back</h1>
          <p className="fg-muted mb-4">Sign in to the ELTC School back office.</p>
          {error && <div className={styles.error}>{error}</div>}
          <Field label="Email">
            <div className={styles.inputIcon}>
              <Mail size={17} />
              <input className="form-control" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@eltc.school" required autoFocus />
            </div>
          </Field>
          <Field label="Password">
            <div className={styles.inputIcon}>
              <Lock size={17} />
              <input className="form-control" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              <button type="button" className={styles.eye} onClick={() => setShow((s) => !s)} aria-label="Show password">
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </Field>
          <Button type="submit" size="lg" block loading={loading} className="mt-2">
            Sign in
          </Button>
          {slow && <p className="fs-13 fg-muted mt-2 text-center">The server is waking up. This can take up to a minute the first time.</p>}
          <p className="fs-12 fg-subtle mt-4 text-center">Accounts are created by the school manager. Forgot your password? Ask them to reset it.</p>
        </form>
      </div>
      <div className={styles.visual}>
        <div className={styles.visualInner}>
          <div className={styles.kicker}>ELTC School</div>
          <h2 className={styles.visualTitle}>Every student, class and payment in one place.</h2>
          <p className={styles.visualText}>From the paper registration form to the end-of-level exam, across every campus.</p>
          <div className={styles.cards}>
            <div className={styles.floatCard}><Users size={18} /> <div><b>Registrations</b><span>Waiting list & groups</span></div></div>
            <div className={styles.floatCard}><CalendarCheck2 size={18} /> <div><b>Attendance</b><span>Typed in a minute</span></div></div>
            <div className={styles.floatCard}><Wallet size={18} /> <div><b>Payments</b><span>Overdue alerts</span></div></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
