/** Plan inputs the user can edit in place (outputs stay read-only). */
export type EditableField = 'goal' | 'targetDate' | 'start' | 'holidayShare' | 'christmasShare';

/** Shared editing contract: one field edits at a time; the parent parses and recalculates. */
export interface FieldEditing {
  editing?: EditableField | null;
  onEdit?: (field: EditableField) => void;
  onSave?: (field: EditableField, raw: string) => void;
  onCancel?: () => void;
}
