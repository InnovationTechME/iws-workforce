'use client'
import FileField from './FileField'

export default function DualFileField({ frontLabel = 'Front side', backLabel = 'Back side', frontFile, backFile, onFrontChange, onBackChange, required = false }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <FileField label={frontLabel} file={frontFile} onChange={onFrontChange} required={required} />
      <FileField label={backLabel}  file={backFile}  onChange={onBackChange}  required={required} />
    </div>
  )
}
