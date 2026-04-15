'use client'
import DocumentUploadForm from '../DocumentUploadForm'
import PassportCopyForm   from './PassportCopyForm'
import PassportPhotoUpload from './PassportPhotoUpload'
import UAEVisaForm        from './UAEVisaForm'
import EmiratesIDForm     from './EmiratesIDForm'
import MedicalFitnessToggle from './MedicalFitnessToggle'
import LabourCardForm     from './LabourCardForm'
import HealthInsuranceForm from './HealthInsuranceForm'
import WorkmensCompForm   from './WorkmensCompForm'

// Picks the correct per-doc-type form for the onboarding checklist.
// Falls back to the generic DocumentUploadForm for optional / legacy
// doc types that don't need bespoke metadata capture (offer_letter,
// employment_contract, iloe_certificate, worker_policy_manual, etc.).
export default function OnboardingDocSection({ worker, template, existing, onCancel, onSaved }) {
  const commonProps = { worker, template, existing, onCancel, onSaved }

  switch (template.kind || template.doc_type) {
    case 'passport_copy':
      return <PassportCopyForm   {...commonProps} />
    case 'passport_photo':
      return <PassportPhotoUpload {...commonProps} />
    case 'uae_visa':
      return <UAEVisaForm        {...commonProps} />
    case 'emirates_id':
      return <EmiratesIDForm     {...commonProps} />
    case 'toggle':
    case 'medical_fitness':
      return <MedicalFitnessToggle {...commonProps} />
    case 'labour_card':
      return <LabourCardForm     {...commonProps} />
    case 'health_insurance':
      return <HealthInsuranceForm {...commonProps} />
    case 'workmen_compensation':
      return <WorkmensCompForm   {...commonProps} />
    default:
      return (
        <DocumentUploadForm
          docType={template.doc_type}
          docLabel={template.label}
          isBlocking={template.is_blocking}
          worker={worker}
          onCancel={onCancel}
          onSaved={onSaved}
        />
      )
  }
}
