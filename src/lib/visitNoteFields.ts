// Structured visit-log fields (guide 5.4), shared between NoteReviewScreen
// (where they're set) and anywhere a note is listed (where they're shown).
export const VISIT_TYPES = ['Medication', 'Personal care', 'Social visit', 'Health check'];

export type Tasks = {
  medicationAdministered: boolean;
  mealSupported: boolean;
  mobilityAssisted: boolean;
  personalCareAssisted: boolean;
  fluidsEncouraged: boolean;
};

export const EMPTY_TASKS: Tasks = {
  medicationAdministered: false,
  mealSupported: false,
  mobilityAssisted: false,
  personalCareAssisted: false,
  fluidsEncouraged: false,
};

export const TASK_DEFS: { key: keyof Tasks; label: string }[] = [
  { key: 'medicationAdministered', label: 'Medication administered' },
  { key: 'mealSupported', label: 'Meal supported' },
  { key: 'mobilityAssisted', label: 'Mobility assisted' },
  { key: 'personalCareAssisted', label: 'Personal care assisted' },
  { key: 'fluidsEncouraged', label: 'Fluids encouraged' },
];
