'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { setRole, ROLES } from '../lib/mockAuth'
import { supabase } from '../lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled || !data.session) return
      const role = data.session.user?.app_metadata?.role || 'owner'
      setRole(role)
      router.replace('/dashboard')
    })
    return () => { cancelled = true }
  }, [router])

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoading(true)
    setAuthError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) {
      setAuthError(error.message || 'Login failed')
      return
    }
    const role = data.user?.app_metadata?.role || 'owner'
    setRole(role)
    router.push('/dashboard')
  }

  const roleLabels = {
    owner: 'Management',
    hr_admin: 'HR Admin',
    operations: 'Operations',
    accounts: 'Accounts & Finance'
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#f8fafc',padding:24}}>
      <div style={{marginBottom:32,textAlign:'center'}}>
        <img src="/logo.png" alt="Innovation Technologies" style={{width:72,height:72,objectFit:'contain',margin:'0 auto 16px',display:'block'}} />
        <h1 style={{fontSize:22,fontWeight:600,color:'#0f172a',marginBottom:6}}>Innovation Technologies</h1>
        <p style={{fontSize:14,color:'#64748b'}}>Workforce HR and Payroll System</p>
        <p style={{fontSize:13,color:'#94a3b8',marginTop:4}}>Sign in with your IWS account</p>
      </div>

      <form onSubmit={handleLogin} style={{background:'white',borderRadius:12,padding:24,boxShadow:'0 4px 24px rgba(0,0,0,0.1)',maxWidth:360,width:'100%',margin:'0 auto',display:'flex',flexDirection:'column',gap:12}}>
        <div className="form-field">
          <label className="form-label">Email</label>
          <input className="form-input" type="text" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="form-field">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {authError && <div className="notice danger" style={{fontSize:12,padding:'8px 10px'}}>{authError}</div>}
        <button className="btn btn-primary" type="submit" disabled={loading || !email || !password} style={{justifyContent:'center',padding:12}}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10,width:'100%',maxWidth:540,marginTop:24}}>
        {Object.entries(ROLES).map(([key, role]) => (
          <div key={key} style={{background:'#fff',border:'0.5px solid #e2e8f0',borderRadius:10,padding:'12px 14px'}}>
            <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{role.label}</div>
            <div style={{fontSize:11,color:'#64748b',lineHeight:1.4,marginTop:3}}>{role.description}</div>
          </div>
        ))}
      </div>

      <p style={{marginTop:20,fontSize:12,color:'#94a3b8'}}>Protected by Supabase Auth</p>
    </div>
  )
}
