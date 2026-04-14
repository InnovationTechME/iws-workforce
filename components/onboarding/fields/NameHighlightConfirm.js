'use client'

export default function NameHighlightConfirm({ checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '8px 10px' }}>
      <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} style={{ marginTop: 2 }} />
      <span style={{ fontSize: 12, color: '#92400e' }}>I confirm the worker&rsquo;s name is highlighted on this document</span>
    </label>
  )
}
