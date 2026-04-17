'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setRole, ROLES } from '../lib/mockAuth'

// SUPABASE NOTE: Replace with proper authentication.
// These PINs are temporary and visible in source code.
// Supabase phase: use Supabase Auth with email/password login.
const ROLE_PINS = {
  owner: '1234',
  hr_admin: '2345',
  operations: '3456',
  accounts: '4567'
}

export default function LoginPage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState(null)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [showPinEntry, setShowPinEntry] = useState(false)

  const handlePinSubmit = () => {
    if (pin === ROLE_PINS[selectedRole]) {
      setPinError(false)
      setRole(selectedRole)
      router.push('/dashboard')
    } else {
      setPinError(true)
      setPin('')
    }
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
        <p style={{fontSize:13,color:'#94a3b8',marginTop:4}}>Select your role to continue</p>
      </div>

      {!showPinEntry ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16,width:'100%',maxWidth:540}}>
          {Object.entries(ROLES).map(([key, role]) => {
            const hoverColor = role.badgeColor || '#1d4ed8'
            return (
            <button key={key} onClick={() => { setSelectedRole(key); setShowPinEntry(true); setPin(''); setPinError(false) }} style={{background:'#fff',border:'0.5px solid #e2e8f0',borderRadius:12,padding:'20px 16px',cursor:'pointer',textAlign:'left',transition:'all .15s',display:'flex',flexDirection:'column',gap:6}} onMouseEnter={e=>{e.currentTarget.style.borderColor=hoverColor;e.currentTarget.style.boxShadow=`0 0 0 3px ${hoverColor}1a`}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.boxShadow='none'}}>
              <span style={{fontSize:14,fontWeight:600,color:'#0f172a'}}>{role.label}</span>
              <span style={{fontSize:12,color:'#64748b',lineHeight:1.4}}>{role.description}</span>
            </button>
            )
          })}
        </div>
      ) : (
        <div style={{background:'white',borderRadius:12,padding:24,boxShadow:'0 4px 24px rgba(0,0,0,0.1)',maxWidth:320,width:'100%',margin:'0 auto',textAlign:'center'}}>
          <div style={{fontSize:13,color:'#64748b',marginBottom:4}}>Signing in as</div>
          <div style={{fontSize:16,fontWeight:700,color:'#0f172a',marginBottom:16}}>{roleLabels[selectedRole] || selectedRole}</div>
          <label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:8}}>Enter your PIN</label>
          <input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={e => { setPin(e.target.value.replace(/\D/g,'')); setPinError(false) }} onKeyDown={e => { if (e.key === 'Enter') handlePinSubmit() }} placeholder="• • • •" autoFocus style={{width:'100%',textAlign:'center',fontSize:24,letterSpacing:8,padding:12,borderRadius:8,border:pinError?'2px solid #dc2626':'2px solid #e2e8f0',outline:'none',boxSizing:'border-box',marginBottom:8}} />
          {pinError && <div style={{color:'#dc2626',fontSize:12,marginBottom:8}}>Incorrect PIN — try again</div>}
          <button onClick={handlePinSubmit} disabled={pin.length !== 4} style={{width:'100%',padding:12,background:pin.length===4?'#0d9488':'#e2e8f0',color:pin.length===4?'white':'#94a3b8',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:pin.length===4?'pointer':'not-allowed',marginBottom:10}}>Enter →</button>
          <button onClick={() => { setShowPinEntry(false); setSelectedRole(null); setPin(''); setPinError(false) }} style={{background:'none',border:'none',color:'#94a3b8',fontSize:12,cursor:'pointer',padding:4}}>← Choose different role</button>
        </div>
      )}

      <p style={{marginTop:24,fontSize:12,color:'#94a3b8'}}>PIN-protected access — Supabase authentication in next phase</p>
    </div>
  )
}
