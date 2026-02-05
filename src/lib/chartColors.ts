// Improved chart color palettes with better contrast and visual appeal

export const CHART_COLORS = {
  primary: [
    'hsl(217, 91%, 60%)',   // Vibrant blue
    'hsl(142, 71%, 45%)',   // Green
    'hsl(38, 92%, 50%)',    // Orange/Gold
    'hsl(339, 82%, 51%)',   // Pink/Magenta
    'hsl(262, 83%, 58%)',   // Purple
    'hsl(187, 85%, 43%)',   // Cyan/Teal
    'hsl(4, 90%, 58%)',     // Red
    'hsl(45, 93%, 47%)',    // Yellow
  ],
  
  categorical: [
    '#3b82f6', // blue-500
    '#22c55e', // green-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#8b5cf6', // violet-500
    '#06b6d4', // cyan-500
    '#ec4899', // pink-500
    '#84cc16', // lime-500
  ],

  sequential: [
    'hsl(217, 91%, 25%)',
    'hsl(217, 91%, 40%)',
    'hsl(217, 91%, 55%)',
    'hsl(217, 91%, 70%)',
    'hsl(217, 91%, 85%)',
  ],

  gender: {
    'Femenino': '#ec4899',      // pink-500
    'Masculino': '#3b82f6',      // blue-500
    'No especificado': '#9ca3af', // gray-400
    'Otro': '#8b5cf6',           // violet-500
  },

  boolean: {
    positive: '#22c55e', // green-500
    negative: '#ef4444', // red-500
    neutral: '#9ca3af',  // gray-400
  },

  levels: {
    'Starter': '#22c55e',    // green
    'Growth': '#f59e0b',     // amber
    'Scale': '#3b82f6',      // blue
    'Sin nivel': '#9ca3af',  // gray
  },

  practices: {
    'No está en planes': '#ef4444', // red
    'En planes': '#f59e0b',          // amber
    'Ya lo implementa': '#22c55e',   // green
  },
};

export const getColorByIndex = (index: number): string => {
  return CHART_COLORS.categorical[index % CHART_COLORS.categorical.length];
};

export const getGenderColor = (gender: string): string => {
  return CHART_COLORS.gender[gender as keyof typeof CHART_COLORS.gender] || CHART_COLORS.gender['No especificado'];
};

export const getLevelColor = (level: string): string => {
  return CHART_COLORS.levels[level as keyof typeof CHART_COLORS.levels] || CHART_COLORS.levels['Sin nivel'];
};
