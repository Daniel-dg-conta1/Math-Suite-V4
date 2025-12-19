import { DEG_TO_RAD, RAD_TO_DEG } from './math';
import { TriangleData, TriangleMode } from '../types';

const toRad = (deg: number) => deg * DEG_TO_RAD;
const toDeg = (rad: number) => rad * RAD_TO_DEG;

// Helper to clean precision issues based on user requirement:
// "Use uma casa depois da vírgula se o número for maior do que 1"
const clean = (num: number) => {
  if (Math.abs(num) < 1) return parseFloat(num.toFixed(3));
  return parseFloat(num.toFixed(1));
};

const invalidResult = (msg: string): TriangleData => ({
  a: 0, b: 0, c: 0, 
  A: 0, B: 0, C: 0, 
  area: 0, perimeter: 0, height: 0, 
  heights: { a: 0, b: 0, c: 0 },
  medians: { a: 0, b: 0, c: 0 },
  bisectors: { a: 0, b: 0, c: 0 },
  valid: false, 
  error: msg
});

export const solveTriangle = (
  mode: TriangleMode, 
  v1: number, 
  v2: number, 
  v3: number
): TriangleData => {
  // 1. Limit Check
  const MAX_VAL = 1000000;
  if (v1 > MAX_VAL || v2 > MAX_VAL || (!mode.startsWith('Right') && v3 > MAX_VAL)) {
    return invalidResult("Valores muito altos. O limite de segurança é 1.000.000.");
  }

  // 2. Positive Check
  if (v1 <= 0 || v2 <= 0) return invalidResult("Os valores devem ser maiores que zero.");
  if (!mode.startsWith('Right') && v3 <= 0) return invalidResult("Os valores devem ser maiores que zero.");

  let a = 0, b = 0, c = 0;
  let A = 0, B = 0, C = 0;

  try {
    switch (mode) {
      case 'SSS': // Lado-Lado-Lado (v1=a, v2=b, v3=c)
        a = v1; b = v2; c = v3;
        // Validity Check: Triangle Inequality
        if (a + b <= c || a + c <= b || b + c <= a) {
           return invalidResult("Impossível formar triângulo: a soma de dois lados deve ser maior que o terceiro.");
        }
        // Law of Cosines
        A = toDeg(Math.acos((b**2 + c**2 - a**2) / (2 * b * c)));
        B = toDeg(Math.acos((a**2 + c**2 - b**2) / (2 * a * c)));
        C = 180 - A - B;
        break;

      case 'SAS': // Lado-Ângulo-Lado (v1=b, v2=AngA, v3=c)
        b = v1; A = v2; c = v3;
        if (A <= 0 || A >= 180) return invalidResult("O ângulo deve estar entre 0° e 180°.");
        // Law of Cosines for 'a'
        a = Math.sqrt(b**2 + c**2 - 2*b*c*Math.cos(toRad(A)));
        // Law of Sines/Cosines for B
        B = toDeg(Math.acos((a**2 + c**2 - b**2) / (2 * a * c)));
        C = 180 - A - B;
        break;

      case 'ASA': // Ângulo-Lado-Ângulo (v1=AngA, v2=c, v3=AngB)
        // Correcting mapping based on App inputs: Inputs: ['Ângulo A', 'Lado c', 'Ângulo B']
        A = v1; c = v2; B = v3;
        if (A <= 0 || A >= 180 || B <= 0 || B >= 180) return invalidResult("Os ângulos devem estar entre 0° e 180°.");
        if (A + B >= 180) return invalidResult("A soma dos ângulos fornecidos deve ser menor que 180°.");
        C = 180 - A - B;
        // Law of Sines
        a = (c * Math.sin(toRad(A))) / Math.sin(toRad(C));
        b = (c * Math.sin(toRad(B))) / Math.sin(toRad(C));
        break;

      case 'AAS': // Lado-Ângulo-Ângulo (v1=AngA, v2=AngB, v3=a)
        A = v1; B = v2; a = v3;
        if (A <= 0 || A >= 180 || B <= 0 || B >= 180) return invalidResult("Os ângulos devem estar entre 0° e 180°.");
        if (A + B >= 180) return invalidResult("A soma dos ângulos fornecidos deve ser menor que 180°.");
        C = 180 - A - B;
        // Law of Sines
        b = (a * Math.sin(toRad(B))) / Math.sin(toRad(A));
        c = (a * Math.sin(toRad(C))) / Math.sin(toRad(A));
        break;
      
      case 'Right': // Triângulo Retângulo (v1=cateto1, v2=cateto2)
        a = v1; b = v2;
        C = 90;
        c = Math.sqrt(a**2 + b**2);
        A = toDeg(Math.atan(a/b));
        B = 90 - A;
        break;
      
      case 'Right_HypCat': // Triângulo Retângulo (v1=Hipotenusa, v2=Cateto)
        c = v1; a = v2;
        if (a >= c) return invalidResult("O cateto deve ser menor que a hipotenusa.");
        C = 90;
        b = Math.sqrt(c**2 - a**2);
        // sin(A) = a/c -> A is angle opposite to side 'a'
        A = toDeg(Math.asin(a/c));
        B = 90 - A;
        break;

      case 'Right_CatAng': // Triângulo Retângulo (v1=Cateto(a), v2=Ângulo(A))
        a = v1; A = v2;
        if (A <= 0 || A >= 90) return invalidResult("O ângulo deve ser agudo (entre 0° e 90°).");
        C = 90;
        B = 90 - A;
        c = a / Math.sin(toRad(A));
        b = a / Math.tan(toRad(A));
        break;

      case 'Right_HypAng': // Triângulo Retângulo (v1=Hipotenusa(c), v2=Ângulo(A))
        c = v1; A = v2;
        if (A <= 0 || A >= 90) return invalidResult("O ângulo deve ser agudo (entre 0° e 90°).");
        if (c <= 0) return invalidResult("A hipotenusa deve ser maior que zero.");
        C = 90;
        B = 90 - A;
        a = c * Math.sin(toRad(A));
        b = c * Math.cos(toRad(A));
        break;
    }
  } catch (e) {
    return invalidResult("Erro numérico durante o cálculo.");
  }

  // Final validation for NaNs (e.g. acos domain error)
  if (!isFinite(a) || !isFinite(b) || !isFinite(c) || !isFinite(A) || !isFinite(B) || !isFinite(C)) {
     return invalidResult("Combinação de valores inválida para um triângulo real.");
  }
  
  // Extra safety check for angles
  if (A <= 0 || B <= 0 || C <= 0 || A >= 180 || B >= 180 || C >= 180) {
     return invalidResult("Ângulos calculados inválidos. Verifique as entradas.");
  }
  
  if (Math.abs((A + B + C) - 180) > 0.5) {
     return invalidResult("Soma dos ângulos não é 180°. Triângulo impossível.");
  }

  if (a <= 0 || b <= 0 || c <= 0) return invalidResult("Os lados calculados resultaram em valores nulos ou negativos.");

  // Metadata
  const s = (a + b + c) / 2;
  const area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c))); // Ensure non-negative
  const height = c > 0 ? (2 * area) / c : 0; // Height relative to side c (base)

  // Detailed calculations
  const heights = {
    a: a > 0 ? clean((2 * area) / a) : 0,
    b: b > 0 ? clean((2 * area) / b) : 0,
    c: c > 0 ? clean((2 * area) / c) : 0
  };

  const medians = {
    a: clean(0.5 * Math.sqrt(Math.max(0, 2*b*b + 2*c*c - a*a))),
    b: clean(0.5 * Math.sqrt(Math.max(0, 2*a*a + 2*c*c - b*b))),
    c: clean(0.5 * Math.sqrt(Math.max(0, 2*a*a + 2*b*b - c*c)))
  };

  const bisectors = {
    a: clean((2 * b * c * Math.cos(toRad(A/2))) / (b + c)),
    b: clean((2 * a * c * Math.cos(toRad(B/2))) / (a + c)),
    c: clean((2 * a * b * Math.cos(toRad(C/2))) / (a + b))
  };

  return {
    a: clean(a), b: clean(b), c: clean(c),
    A: clean(A), B: clean(B), C: clean(C),
    area: clean(area),
    perimeter: clean(a + b + c),
    height: clean(height),
    heights,
    medians,
    bisectors,
    valid: true
  };
};

export const getTriangleCoords = (t: TriangleData) => {
  // Strategy: Side c on X axis
  // A at (0,0), B at (c,0)
  // C calculated from Angle A and Side b
  
  const Ax = 0;
  const Ay = 0;
  
  const Bx = t.c;
  const By = 0;
  
  const Cx = t.b * Math.cos(toRad(t.A));
  const Cy = t.b * Math.sin(toRad(t.A));
  
  return { Ax, Ay, Bx, By, Cx, Cy };
};

export const getCircumcircle = (t: TriangleData, coords: {Ax:number, Ay:number, Bx:number, By:number, Cx:number, Cy:number}) => {
   // R = a*b*c / 4*Area
   if (t.area <= 0.0001) return { Ox: 0, Oy: 0, R: 0 };
   const R = (t.a * t.b * t.c) / (4 * t.area);
   
   // Circumcenter O
   if (Math.abs(coords.Cy) < 0.0001) return { Ox: coords.Bx/2, Oy: 0, R: t.c/2 };

   const Ox = coords.Bx / 2;
   const Oy = (coords.Cy / 2) - (coords.Cx / coords.Cy) * (Ox - coords.Cx / 2);
   
   return { Ox, Oy, R };
};