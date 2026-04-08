export default function Spinner() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:48}}>
      <div style={{width:24,height:24,border:'2px solid #e2e8f0',borderTopColor:'#0d9488',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
