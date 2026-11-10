export const HOME_THRESHOLD = { sys: 135, dia: 85 };
export const SEVERE_THRESHOLD = { sys: 180, dia: 110 };

export function evaluateBp({ sys, dia }) {
  if (sys >= SEVERE_THRESHOLD.sys || dia >= SEVERE_THRESHOLD.dia) {
    return {
      level: 'danger',
      message: 'Tensión muy alta: 180/110 o más, el umbral de hipertensión grave en consulta (ESH 2023). Repite la medida en 5 min sentada y tranquila; si sigue igual, o tienes dolor de pecho, dolor de cabeza intenso o falta de aire, llama al 112.',
    };
  }
  if (sys >= HOME_THRESHOLD.sys || dia >= HOME_THRESHOLD.dia) {
    return { level: 'warning', message: 'Por encima de 135/85, el umbral de hipertensión con medidas en casa (ESH 2023). Si se repite en varias medidas, coméntalo con tu médico.' };
  }
  return null;
}
