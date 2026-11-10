export const SEVERITY_LABELS = ['Nada', 'Leve', 'Moderado', 'Intenso'];

export const SYMPTOMS = [
  { id: 'nausea', label: 'Náuseas', group: 'digestive' },
  { id: 'vomiting', label: 'Vómitos', group: 'digestive' },
  { id: 'diarrhea', label: 'Diarrea', group: 'digestive' },
  { id: 'constipation', label: 'Estreñimiento', group: 'digestive' },
  { id: 'reflux', label: 'Ardor o reflujo', group: 'digestive' },
  { id: 'abdominalPain', label: 'Dolor abdominal', group: 'digestive' },
  { id: 'fatigue', label: 'Cansancio', group: 'general' },
  { id: 'dizziness', label: 'Mareo', group: 'general' },
  { id: 'palpitations', label: 'Palpitaciones', group: 'thyroid' },
  { id: 'tremor', label: 'Temblor', group: 'thyroid' },
  { id: 'insomnia', label: 'Insomnio o nerviosismo', group: 'thyroid' },
  { id: 'heatIntolerance', label: 'Calor excesivo o sudoración', group: 'thyroid' },
  { id: 'tingling', label: 'Hormigueo en labios o dedos', group: 'calcium' },
  { id: 'cramps', label: 'Calambres musculares', group: 'calcium' },
];

export const SYMPTOM_GROUPS = {
  digestive: 'Digestivos',
  general: 'Generales',
  thyroid: 'Posible exceso de levotiroxina',
  calcium: 'Posible calcio bajo',
};

const level = (items, id) => items?.[id] ?? 0;

export function evaluateSymptoms(entry) {
  const items = entry.items ?? {};
  const alerts = [];
  if (level(items, 'abdominalPain') >= 3) {
    alerts.push({
      id: 'abdominal',
      level: 'danger',
      message:
        'Dolor abdominal intenso: si es persistente o se extiende a la espalda, contacta con tu médico o acude a urgencias. La ficha técnica de Wegovy lo describe como posible signo de pancreatitis o de problemas de vesícula.',
    });
  }
  if (entry.noFluids24h) {
    alerts.push({
      id: 'dehydration',
      level: 'danger',
      message:
        'Más de 24 h sin retener líquidos: contacta con tu médico. La deshidratación por vómitos o diarrea puede dañar el riñón (ficha técnica de Wegovy).',
    });
  }
  if (level(items, 'vomiting') >= 3 || level(items, 'diarrhea') >= 3) {
    alerts.push({
      id: 'digestive',
      level: 'warning',
      message: 'Vómitos o diarrea intensos: bebe a sorbos y usa suero oral de farmacia. Si no mejora o te mareas, contacta con tu médico.',
    });
  }
  if (['palpitations', 'tremor', 'insomnia', 'heatIntolerance'].some((id) => level(items, id) >= 2)) {
    alerts.push({
      id: 'thyroid',
      level: 'warning',
      message: 'Estos síntomas pueden indicar exceso de levotiroxina, que es más probable al perder peso. Coméntalo con tu endocrino; puede pedir una TSH.',
    });
  }
  if (['tingling', 'cramps'].some((id) => level(items, id) >= 2)) {
    const severe = level(items, 'tingling') >= 3;
    alerts.push({
      id: 'calcium',
      level: severe ? 'danger' : 'warning',
      message: severe
        ? 'Hormigueo intenso en labios o dedos: puede ser calcio bajo. Contacta con tu médico hoy mismo o acude a urgencias.'
        : 'Hormigueo o calambres pueden indicar calcio bajo tras la cirugía de tiroides. Contacta con tu médico.',
    });
  }
  return alerts;
}
