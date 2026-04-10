'use client'
import { useRouter } from 'next/navigation'
import { setRole, ROLES } from '../lib/mockAuth'

export default function LoginPage() {
  const router = useRouter()
  const handleSelect = (role) => {
    setRole(role)
    router.push('/dashboard')
  }
  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#f8fafc',padding:24}}>
      <div style={{marginBottom:32,textAlign:'center'}}>
        <div style={{width:52,height:52,background:'#1d4ed8',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:18,fontWeight:700,margin:'0 auto 16px'}}>IT</div>
        <h1 style={{fontSize:22,fontWeight:600,color:'#0f172a',marginBottom:6}}>Innovation Technologies</h1>
        <p style={{fontSize:14,color:'#64748b'}}>Workforce HR and Payroll System</p>
        <p style={{fontSize:13,color:'#94a3b8',marginTop:4}}>Select your role to continue</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,width:'100%',maxWidth:640}}>
        {Object.entries(ROLES).map(([key, role]) => (
          <button key={key} onClick={() => handleSelect(key)} style={{background:'#fff',border:'0.5px solid #e2e8f0',borderRadius:12,padding:'20px 16px',cursor:'pointer',textAlign:'left',transition:'all .15s',display:'flex',flexDirection:'column',gap:6}} onMouseEnter={e=>{e.currentTarget.style.borderColor='#1d4ed8';e.currentTarget.style.boxShadow='0 0 0 3px rgba(29,78,216,.1)'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.boxShadow='none'}}>
            <span style={{fontSize:14,fontWeight:600,color:'#0f172a'}}>{role.label}</span>
            <span style={{fontSize:12,color:'#64748b',lineHeight:1.4}}>{role.description}</span>
          </button>
        ))}
      </div>
      <p style={{marginTop:24,fontSize:12,color:'#94a3b8'}}>Mock prototype — no real authentication</p>
    </div>
  )
}
