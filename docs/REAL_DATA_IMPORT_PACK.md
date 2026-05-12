# Real Data Import Pack

Last updated: 2026-05-11

Use this pack to bring existing employees and supplier workers into the clean IWS system.

## Files

- `import-templates/suppliers.csv`
- `import-templates/existing-workers.csv`
- `import-templates/opening-documents.csv`
- `import-templates/opening-balances.csv`

## Import Order

1. Back up database and files.
2. Import supplier companies.
3. Import existing workers.
4. Upload current documents through worker profiles.
5. Enter opening leave, warning, and payroll balances.
6. Run a small payroll test month.
7. Import the rest of the workforce.

## Supplier Import

Dry run:

```powershell
npm run data:import-suppliers -- import-templates/suppliers.csv --dry-run
```

Apply:

```powershell
npm run data:import-suppliers -- import-templates/suppliers.csv --apply
```

Supplier names must be unique. If an initial trade role is supplied, the hourly rate must also be supplied.

## Worker Import

Dry run:

```powershell
npm run data:import-workers -- import-templates/existing-workers.csv --dry-run
```

Apply:

```powershell
npm run data:import-workers -- import-templates/existing-workers.csv --apply
```

Rules:

- Keep existing worker numbers.
- Worker numbers are permanent and cannot be reused.
- Subcontract workers must include `supplier_name`.
- `supplier_name` must exactly match an active supplier already in the system.
- Keep original joining dates for people who have already worked for the company.

## Existing Staff With One Year History

For workers who have already been with the business for a year, do not restart them as new people. Import:

- Original joining date.
- Current worker number.
- Current category.
- Current salary or hourly rate.
- Payment method.
- Current supplier for subcontract workers.
- Current document expiry dates.
- Opening leave balance.
- Current warning level.
- ILOE deduction status.
- Last completed payroll month.

## First Live Test

Use a small mixed sample:

- 3 direct/permanent staff.
- 2 contract/hourly workers.
- 2 subcontract workers from at least one supplier.

Then test:

- Profile opens.
- Documents upload.
- Timesheet entry.
- Payroll calculation.
- Absence deduction.
- Payslip PDF.
- Delivery log.
- Audit log.
- Trash capture on a safe test delete.

Do not import everyone until this controlled test is accepted.
