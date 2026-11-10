const CM_PER_INCH = 2.54;

export function idealWeightDevine(heightCm, sex = 'f') {
  const base = sex === 'm' ? 50 : 45.5;
  return base + 2.3 * (heightCm / CM_PER_INCH - 60);
}

export function adjustedWeight(actualKg, idealKg) {
  return actualKg > idealKg ? idealKg + 0.4 * (actualKg - idealKg) : actualKg;
}

export function proteinTarget({ weightKg, heightCm, sex, gPerKg, useAdjustedWeight }) {
  if (!weightKg || !gPerKg) return null;
  const reference = useAdjustedWeight && heightCm ? adjustedWeight(weightKg, idealWeightDevine(heightCm, sex)) : weightKg;
  return Math.round(reference * gPerKg);
}

export const QUICK_FOODS = [
  { id: 'egg', label: 'Huevo (1 unidad)', grams: 6 },
  { id: 'chicken', label: 'Pechuga de pollo (100 g)', grams: 22 },
  { id: 'white-fish', label: 'Pescado blanco (100 g)', grams: 18 },
  { id: 'tuna', label: 'Atún en lata escurrido (1 lata pequeña)', grams: 13 },
  { id: 'legumes', label: 'Legumbre cocida (1 plato, 200 g)', grams: 16 },
  { id: 'skyr', label: 'Skyr o yogur proteico (150 g)', grams: 15 },
  { id: 'yogurt', label: 'Yogur natural (125 g)', grams: 5 },
  { id: 'milk', label: 'Leche (1 vaso, 250 ml)', grams: 8 },
  { id: 'fresh-cheese', label: 'Queso fresco (100 g)', grams: 12 },
  { id: 'tofu', label: 'Tofu (100 g)', grams: 13 },
  { id: 'ham', label: 'Jamón o pavo (30 g)', grams: 8 },
];

export const QUICK_FOODS_NOTE =
  'Valores aproximados por ración. Varían según marca y preparación: si el envase indica la proteína, usa ese dato.';
