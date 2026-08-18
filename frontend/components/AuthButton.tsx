'use client';
import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';

declare global { interface Window { google?: any; } }

export default function AuthButton() {
  const { user, loading, login, register, googleLogin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'login'|'register'>('login');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);

  const GCID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    if (!open || !GCID) return;
    const exists = document.querySelector('script[data-google-gsi]');
    const setup = () => {
      if (!window.google?.accounts) return;
      try {
        window.google.accounts.id.initialize({
          client_id: GCID,
          callback: async (resp: any) => {
            setBusy(true);
            const r = await googleLogin(resp.credential);
            setBusy(false);
            if (r.ok) setOpen(false); else setError(r.error || 'Google girişi başarısız');
          },
        });
        const el = document.getElementById('g-btn');
        if (el) window.google.accounts.id.renderButton(el, { theme:'filled_black', size:'large', text:'continue_with', shape:'pill', width:280 });
      } catch { /* Google GSI script kullanılamıyorsa sessizce atla — kullanıcı email+şifre ile giriş yapabilir */ }
    };
    if (!exists) {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true; s.defer = true; s.setAttribute('data-google-gsi','1');
      document.body.appendChild(s);
      s.onload = setup;
    } else setup();
  }, [open, GCID, googleLogin]);

  const submit = async () => {
    setError(''); setBusy(true);
    const res = mode === 'login' ? await login(email, password) : await register(email, password, name || email.split('@')[0]);
    setBusy(false);
    if (res.ok) { setOpen(false); setEmail(''); setPassword(''); setName(''); }
    else setError(res.error || 'Hata oluştu');
  };

  if (loading) return <span className="notif-toggle" data-testid="auth-loading" style={{opacity:0.5}}>…</span>;

  if (user) {
    return (
      <div style={{display:'flex', alignItems:'center', gap:8}} data-testid="user-pill">
        <span className="notif-toggle" title={user.email} style={{cursor:'default'}}>
          {user.picture && <img src={user.picture} style={{width:18, height:18, borderRadius:'50%', objectFit:'cover'}} alt=""/>}
          <span>{user.name}</span>
        </span>
        <button onClick={logout} className="notif-toggle" data-testid="logout-btn">ÇIKIŞ</button>
      </div>
    );
  }

  return (
    <>
      <button onClick={() => { setOpen(true); setError(''); }} className="notif-toggle" data-testid="open-auth" style={{borderColor:'var(--cyan)'}}>
        <span style={{color:'var(--cyan)', letterSpacing:2}}>GİRİŞ</span>
      </button>
      {open && (
        <div onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
             style={{position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:12}}
             data-testid="auth-modal">
          <div style={{background:'linear-gradient(180deg, #0f0818 0%, #1a0e2b 100%)', border:'1px solid var(--pink)', boxShadow:'0 0 40px rgba(255,0,170,0.4), inset 0 0 60px rgba(170,0,255,0.1)', borderRadius:10, padding:24, width:'92%', maxWidth:420}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20}}>
              <h3 style={{fontFamily:'Orbitron', fontSize:22, letterSpacing:3, color:'var(--cyan)', textShadow:'0 0 14px var(--cyan)', margin:0}}>
                {mode === 'login' ? 'GİRİŞ YAP' : 'KAYIT OL'}
              </h3>
              <button onClick={() => setOpen(false)} style={{background:'none', border:'1px solid var(--pink)', color:'var(--pink)', width:32, height:32, cursor:'pointer'}} aria-label="Kapat">✕</button>
            </div>

            {GCID && (
              <>
                <div id="g-btn" style={{display:'flex', justifyContent:'center', marginBottom:12}} data-testid="google-btn"/>
                <div style={{textAlign:'center', color:'var(--text-dim)', fontSize:11, margin:'10px 0', letterSpacing:2}}>— YA DA E-POSTA İLE —</div>
              </>
            )}

            <div style={{display:'flex', flexDirection:'column', gap:10}}>
              {mode === 'register' && (
                <input type="text" placeholder="Adın" value={name} onChange={e=>setName(e.target.value)} className="input-neon" data-testid="auth-name"/>
              )}
              <input type="email" placeholder="E-posta" value={email} onChange={e=>setEmail(e.target.value)} className="input-neon" data-testid="auth-email"/>
              <input type="password" placeholder="Parola (min 6)" value={password} onChange={e=>setPassword(e.target.value)}
                     onKeyDown={e => { if (e.key === 'Enter') submit(); }}
                     className="input-neon" data-testid="auth-password"/>
              {error && <div style={{color:'var(--red)', fontFamily:'VT323', fontSize:15}} data-testid="auth-error">{error}</div>}
              <button onClick={submit} disabled={busy || !email || !password}
                      style={{padding:'10px', borderRadius:6, fontFamily:'Orbitron', letterSpacing:3, fontSize:13, fontWeight:700, color:'#000', background:'linear-gradient(135deg, var(--cyan), var(--pink))', border:'none', cursor:'pointer', opacity:(busy||!email||!password)?0.5:1, boxShadow:'0 0 20px rgba(255,0,170,0.3)'}}
                      data-testid="auth-submit">
                {busy ? '...' : (mode === 'login' ? 'GİRİŞ YAP' : 'KAYIT OL')}
              </button>
              <button type="button" onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
                      style={{background:'none', border:'none', color:'var(--text-dim)', fontFamily:'VT323', fontSize:15, cursor:'pointer'}}
                      data-testid="auth-toggle">
                {mode === 'login' ? 'Hesabın yok mu? Kayıt ol' : 'Zaten üye misin? Giriş yap'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
