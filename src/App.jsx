import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import FamilyFinanceApp from './FamilyFinanceApp';

function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(e) {
    e.preventDefault(); setBusy(true); setMessage('');
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else setMessage(mode === 'login' ? '' : 'Đăng ký thành công. Nếu Supabase yêu cầu xác nhận email, hãy mở email rồi đăng nhập.');
  }

  return <div className="auth-shell">
    <div className="auth-card">
      <div className="auth-logo">₫</div>
      <h1>Quản lý chi tiêu gia đình</h1>
      <p>Hai vợ chồng dùng chung một tài khoản</p>
      <form onSubmit={submit}>
        <input className="input" type="email" required placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input" type="password" required minLength={6} placeholder="Mật khẩu" value={password} onChange={e=>setPassword(e.target.value)} style={{marginTop:10}} />
        <button className="btn-primary" disabled={busy} style={{width:'100%', marginTop:12}}>{busy ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</button>
      </form>
      {message && <div style={{fontSize:12, marginTop:12, lineHeight:1.5}}>{message}</div>}
      <button className="auth-switch" onClick={()=>{setMode(mode==='login'?'signup':'login');setMessage('')}}>{mode==='login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}</button>
    </div>
  </div>
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);
  if (loading) return <div className="loading">Đang tải…</div>;
  if (!session) return <AuthScreen />;
  return <FamilyFinanceApp userId={session.user.id} onSignOut={() => supabase.auth.signOut()} />;
}
