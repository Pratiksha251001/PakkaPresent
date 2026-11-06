# Native Control Policy

PakkaPresent uses shared, theme-aware controls for visible form interactions.

## Prohibited in `frontend/src/**/*.tsx`

- Native lowercase `<select>` elements
- `<datalist>` elements
- Native `input type="date"`
- Native `input type="checkbox"`
- Native `input type="radio"`
- Visible native `input type="file"`

Use the shared `Select`, `DatePicker`, `Checkbox`, `RadioGroup`, `Switch`, and `FileUploadSurface` components instead.

## Approved native file-input exceptions

Exactly two hidden native file inputs are approved because browser file selection requires them:

1. `frontend/src/components/ui/file-upload-surface.tsx`
   - Shared bulk-import upload primitive
   - Must remain screen-reader-hidden with `className="sr-only"`

2. `frontend/src/pages/InstitutionSettings.tsx`
   - Institution-logo picker owned by the logo preview overlay
   - Must remain screen-reader-hidden with `className="sr-only"`
   - Must accept only PNG, JPEG, and WebP

No other TSX file may contain `input type="file"` without updating this policy and the prevention test in the same reviewed change.

## Case-sensitivity rule

The prevention scan is case-sensitive. `<Select>` is the approved React component and must not be confused with a lowercase native `<select>` element.

## Validation

Run:

```text
npm run test:control-prevention
```

The test reports each violating file and line number and fails immediately when an unapproved native control is introduced.
