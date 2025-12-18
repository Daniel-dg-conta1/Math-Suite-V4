import { jsPDF } from 'jspdf';
import { TrigoExercise, TriangleData } from '../types';
import { getTriangleCoords } from './trigoMath';

// Formatter to match the rule: 1 decimal place if > 1, replace dot with comma, remove trailing zeros
const fmt = (num: number | undefined) => {
  if (num === undefined) return '';
  const abs = Math.abs(num);
  let str = '';
  // Use parseFloat to strip trailing zeros (e.g. "10.0" -> 10 -> "10")
  if (abs < 1) str = parseFloat(num.toFixed(3)).toString();
  else str = parseFloat(num.toFixed(1)).toString();
  return str.replace('.', ',');
};

const getModeLabel = (m: string) => {
    switch(m) {
        case 'SSS': return 'Lado-Lado-Lado';
        case 'SAS': return 'Lado-Ângulo-Lado';
        case 'ASA': return 'Ângulo-Lado-Ângulo';
        case 'AAS': return 'Lado-Ângulo-Ângulo';
        case 'Right': return 'Triângulo Retângulo';
        case 'Right_HypCat': return 'Triângulo Retângulo';
        case 'Right_CatAng': return 'Triângulo Retângulo';
        case 'Right_HypAng': return 'Triângulo Retângulo';
        default: return m;
    }
};

// Generates educational step-by-step text
const getStepByStepText = (mode: string): string[] => {
    switch(mode) {
        case 'Right':
            return [
                "1. Identifique os catetos e a hipotenusa.",
                "2. Use o Teorema de Pitágoras (c² = a² + b²) para encontrar o lado desconhecido.",
                "3. Use as relações trigonométricas (seno, cosseno, tangente) para encontrar os ângulos."
            ];
        case 'Right_HypCat':
            return [
                "1. Você tem a hipotenusa e um cateto.",
                "2. Use o Teorema de Pitágoras (c² = a² + b²) para encontrar o outro cateto.",
                "3. Use a função inversa do seno (arcsen) para encontrar o ângulo oposto ao cateto dado."
            ];
        case 'Right_CatAng':
            return [
                "1. Você tem um cateto e um ângulo agudo.",
                "2. Use a soma dos ângulos internos (90° + A + B = 180°) para encontrar o outro ângulo.",
                "3. Use as funções trigonométricas (seno, cosseno, tangente) para encontrar os lados restantes."
            ];
        case 'Right_HypAng':
            return [
                "1. Você tem a hipotenusa e um ângulo agudo.",
                "2. Use a soma dos ângulos internos para encontrar o outro ângulo.",
                "3. Use seno e cosseno para encontrar os catetos (a = c.senA, b = c.cosA)."
            ];
        case 'SSS':
            return [
                "1. Como você tem os 3 lados, comece pela Lei dos Cossenos.",
                "2. Encontre o ângulo oposto ao maior lado primeiro para evitar ambiguidade.",
                "3. Use a Lei dos Senos para encontrar o segundo ângulo.",
                "4. A soma dos ângulos internos é 180° para achar o terceiro."
            ];
        case 'SAS':
            return [
                "1. Use a Lei dos Cossenos para encontrar o lado oposto ao ângulo conhecido.",
                "2. Agora você tem 3 lados. Use a Lei dos Senos para encontrar o menor ângulo desconhecido.",
                "3. Use a soma dos ângulos (180°) para encontrar o último ângulo."
            ];
        case 'ASA':
            return [
                "1. Encontre o terceiro ângulo sabendo que a soma é 180°.",
                "2. Use a Lei dos Senos para encontrar os dois lados desconhecidos."
            ];
        case 'AAS':
            return [
                "1. Encontre o terceiro ângulo sabendo que a soma é 180°.",
                "2. Use a Lei dos Senos para encontrar os dois lados desconhecidos."
            ];
        default:
            return ["Use a Lei dos Senos ou Cossenos conforme os dados disponíveis."];
    }
};

export const generateTrigoPDF = (
  exercises: TrigoExercise[], 
  isTeacher: boolean,
  mode: 'full' | 'simple',
  itemsPerPage: number,
  includeSteps: boolean = false
) => {
  const doc = new jsPDF();
  
  // --- HEADER ---
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const mainTitle = isTeacher ? 'Gabarito - Trigonometria' : 'Lista de Exercícios - Trigonometria';
  doc.text(mainTitle, 15, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 195, 20, { align: 'right' });

  // Page Constants
  const pageHeight = 297;
  const pageWidth = 210;
  const margin = 15;
  const usableWidth = pageWidth - margin * 2;
  const startY = 35;

  if (mode === 'full') {
    // --- FULL MODE (Standard List with Calculation Space) ---
    let yPos = startY;
    const itemHeight = 70; // mm

    exercises.forEach((ex, i) => {
      // Check pagination
      if (yPos + itemHeight > pageHeight - margin) {
         doc.addPage();
         yPos = margin + 10;
      }

      doc.setTextColor(0,0,0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`Questão ${i+1} (${getModeLabel(ex.mode)})`, margin, yPos);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`Dados: ${ex.given.label1}=${fmt(ex.given.val1)}, ${ex.given.label2}=${fmt(ex.given.val2)}` + (ex.given.val3 ? `, ${ex.given.label3}=${fmt(ex.given.val3)}` : ''), margin, yPos + 6);
      
      doc.setFontSize(10);
      doc.setTextColor(80,80,80);
      const prompt = isTeacher ? '' : 'Calcule os lados e ângulos restantes.';
      doc.text(prompt, margin, yPos + 12);

      // Draw Triangle
      drawTriangleInPDF(doc, ex.solution, margin + 20, yPos + 35, 40);

      // Solution Box / Space
      if (isTeacher) {
         doc.setFillColor(245, 245, 245);
         doc.rect(margin + 60, yPos, usableWidth - 60, 45, 'F');
         doc.setTextColor(0,0,0);
         doc.setFontSize(11);
         doc.setFont('helvetica', 'bold');
         doc.text('Solução Completa:', margin + 65, yPos + 8);
         
         doc.setFont('helvetica', 'normal');
         doc.setFontSize(10);
         const col1X = margin + 65;
         const col2X = margin + 110;
         
         doc.text(`a = ${fmt(ex.solution.a)}`, col1X, yPos + 16);
         doc.text(`b = ${fmt(ex.solution.b)}`, col1X, yPos + 22);
         doc.text(`c = ${fmt(ex.solution.c)}`, col1X, yPos + 28);
         
         doc.text(`Âng. A = ${fmt(ex.solution.A)}°`, col2X, yPos + 16);
         doc.text(`Âng. B = ${fmt(ex.solution.B)}°`, col2X, yPos + 22);
         doc.text(`Âng. C = ${fmt(ex.solution.C)}°`, col2X, yPos + 28);
         
         doc.text(`Área = ${fmt(ex.solution.area)}`, col1X, yPos + 38);
         doc.text(`Perímetro = ${fmt(ex.solution.perimeter)}`, col2X, yPos + 38);
      } else {
         doc.setDrawColor(200);
         doc.rect(margin + 60, yPos, usableWidth - 60, 45);
         
         if (includeSteps) {
             // Render Step-by-Step
             doc.setFillColor(255, 255, 255); // White background
             doc.setFontSize(10);
             doc.setTextColor(60, 60, 60);
             doc.setFont('helvetica', 'bold');
             doc.text('Guia de Resolução:', margin + 65, yPos + 8);
             
             doc.setFont('helvetica', 'italic');
             doc.setFontSize(9);
             const steps = getStepByStepText(ex.mode);
             let stepY = yPos + 14;
             steps.forEach(step => {
                 // Split long text
                 const lines = doc.splitTextToSize(step, usableWidth - 70);
                 doc.text(lines, margin + 65, stepY);
                 stepY += (lines.length * 4) + 2;
             });
             
             doc.setFont('helvetica', 'normal');
             doc.setTextColor(150);
             doc.text('(Use o espaço restante para cálculos)', margin + 65, yPos + 42);

         } else {
             doc.setTextColor(150);
             doc.text('Espaço para cálculos', margin + 65, yPos + 8);
         }
      }
      
      doc.setDrawColor(220);
      doc.line(margin, yPos + 55, pageWidth - margin, yPos + 55);

      yPos += 60;
    });

  } else {
    // --- SIMPLE MODE (Grid System) ---
    // Max 8 items per page, 2 columns.
    const cols = 2;
    const safeItemsPerPage = Math.min(Math.max(1, itemsPerPage), 8);
    const rows = Math.ceil(safeItemsPerPage / cols);
    const usableHeight = pageHeight - margin * 2 - 20;
    
    // Calculate Grid Dimensions
    const cellW = usableWidth / cols;
    const cellH = usableHeight / rows;
    
    // Drawing area inside cell (keep padding)
    const drawSize = Math.min(cellW * 0.5, cellH * 0.6); 

    const totalPages = Math.ceil(exercises.length / safeItemsPerPage);
    
    for (let p = 0; p < totalPages; p++) {
        if (p > 0) doc.addPage();
        
        const pageStartIdx = p * safeItemsPerPage;
        for (let k = 0; k < safeItemsPerPage; k++) {
            const idx = pageStartIdx + k;
            if (idx >= exercises.length) break;

            const ex = exercises[idx];
            
            const col = k % cols;
            const row = Math.floor(k / cols);
            
            // Cell Coordinates
            const cellX = margin + col * cellW;
            const cellY = startY + row * cellH;

            // Header of Question
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text(`Q${idx+1} (${getModeLabel(ex.mode)})`, cellX + 2, cellY + 5);
            
            // Given Values
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            const givenText = `${ex.given.label1}=${fmt(ex.given.val1)}, ${ex.given.label2}=${fmt(ex.given.val2)}` + (ex.given.val3 ? `, ${ex.given.label3}=${fmt(ex.given.val3)}` : '');
            doc.text(givenText, cellX + 2, cellY + 10);
            
            // Draw Triangle Centered in Cell
            const drawCx = cellX + cellW / 2;
            const drawCy = cellY + 15 + drawSize / 2;
            drawTriangleInPDF(doc, ex.solution, drawCx, drawCy, drawSize);

            // Answer Key (Teacher Only)
            if (isTeacher) {
                doc.setFontSize(9);
                doc.setTextColor(50, 50, 50);
                const ansY = cellY + cellH - 12;
                doc.text(`Resp: a=${fmt(ex.solution.a)}, b=${fmt(ex.solution.b)}, c=${fmt(ex.solution.c)}`, cellX + 2, ansY);
                doc.text(`Ângs: A=${fmt(ex.solution.A)}°, B=${fmt(ex.solution.B)}°, C=${fmt(ex.solution.C)}°`, cellX + 2, ansY + 4);
                doc.text(`Área: ${fmt(ex.solution.area)}`, cellX + 2, ansY + 8);
            } else if (includeSteps) {
                // In Simple mode, steps might overlap if too long, so we put a brief hint
                doc.setFontSize(8);
                doc.setTextColor(100);
                doc.setFont('helvetica', 'italic');
                const steps = getStepByStepText(ex.mode);
                // Print only first line to avoid clutter
                doc.text(`Dica: ${steps[0]}`, cellX + 2, cellY + cellH - 6);
            }
            
            // Border for cell (optional, makes grid clear)
            doc.setDrawColor(230);
            doc.rect(cellX, cellY, cellW - 2, cellH - 2);
        }
    }
  }
  
  doc.save(isTeacher ? 'Trigo_Gabarito.pdf' : 'Trigo_Lista.pdf');
};

// Helper function to draw triangle
const drawTriangleInPDF = (doc: jsPDF, triangle: TriangleData, cx: number, cy: number, boxSize: number) => {
    const coords = getTriangleCoords(triangle);
    
    // Scale for PDF
    const minX = Math.min(coords.Ax, coords.Bx, coords.Cx);
    const maxX = Math.max(coords.Ax, coords.Bx, coords.Cx);
    const minY = Math.min(coords.Ay, coords.By, coords.Cy);
    const maxY = Math.max(coords.Ay, coords.By, coords.Cy);
    
    const w = maxX - minX;
    const h = maxY - minY;
    
    // Scale factor
    const scale = Math.min(boxSize / (w || 1), boxSize / (h || 1));
    
    // Transform math coords (Y up) to PDF coords (Y down) and Center
    const tx = (val: number) => cx + (val - (minX + w/2)) * scale;
    const ty = (val: number) => cy - (val - (minY + h/2)) * scale;
    
    const Ax = tx(coords.Ax); const Ay = ty(coords.Ay);
    const Bx = tx(coords.Bx); const By = ty(coords.By);
    const Cx = tx(coords.Cx); const Cy = ty(coords.Cy);
    
    doc.setDrawColor(0);
    doc.setLineWidth(0.5); // Increased from 0.3 for clearer resolution/sharpness perception
    doc.setFillColor(248, 250, 252); // Light gray fill
    doc.triangle(Ax, Ay, Bx, By, Cx, Cy, 'FD'); // Fill and Draw

    // Draw Right Angle Marker (Square with Dot)
    const isRight = (ang: number) => Math.abs(ang - 90) < 0.1;
    
    const drawRightAngle = (V: {x:number, y:number}, N1: {x:number, y:number}, N2: {x:number, y:number}) => {
       const size = 3.5; // Slightly larger
       
       // Calculate normalized direction vectors
       const dx1 = N1.x - V.x;
       const dy1 = N1.y - V.y;
       const l1 = Math.sqrt(dx1*dx1 + dy1*dy1);
       if (l1 < 0.001) return;
       const u1x = dx1 / l1;
       const u1y = dy1 / l1;

       const dx2 = N2.x - V.x;
       const dy2 = N2.y - V.y;
       const l2 = Math.sqrt(dx2*dx2 + dy2*dy2);
       if (l2 < 0.001) return;
       const u2x = dx2 / l2;
       const u2y = dy2 / l2;

       // Use safe size (max 30% of side length)
       const s = Math.min(size, l1 * 0.3, l2 * 0.3);

       // Square vertices
       const m1x = V.x + u1x * s;
       const m1y = V.y + u1y * s;
       
       const m2x = V.x + u2x * s;
       const m2y = V.y + u2y * s;
       
       // Complete parallelogram
       const m3x = m1x + m2x - V.x;
       const m3y = m1y + m2y - V.y;

       doc.setLineWidth(0.3);
       doc.setDrawColor(0);
       doc.line(m1x, m1y, m3x, m3y);
       doc.line(m2x, m2y, m3x, m3y);

       // Dot inside
       doc.setFillColor(0);
       const centerX = (V.x + m3x) / 2;
       const centerY = (V.y + m3y) / 2;
       doc.circle(centerX, centerY, 0.4, 'F');
    };

    if (isRight(triangle.A)) drawRightAngle({x:Ax, y:Ay}, {x:Bx, y:By}, {x:Cx, y:Cy});
    else if (isRight(triangle.B)) drawRightAngle({x:Bx, y:By}, {x:Ax, y:Ay}, {x:Cx, y:Cy});
    else if (isRight(triangle.C)) drawRightAngle({x:Cx, y:Cy}, {x:Ax, y:Ay}, {x:Bx, y:By});
    
    // Labels Vertex (A, B, C)
    doc.setFontSize(11); // Increased from 8
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('A', Ax-2, Ay-2);
    doc.text('B', Bx+1, By-2);
    doc.text('C', Cx-1, Cy-3);

    // Labels Sides (a, b, c) - Placed at midpoints with offset
    doc.setFontSize(10); // Increased from 7
    doc.setTextColor(50, 50, 50); 
    doc.setFont('helvetica', 'normal');

    // Side a connects B and C
    const midAx = (Bx + Cx) / 2;
    const midAy = (By + Cy) / 2;
    // Simple nudge to right
    doc.text('a', midAx + 2, midAy, { align: 'center' });

    // Side b connects A and C
    const midBx = (Ax + Cx) / 2;
    const midBy = (Ay + Cy) / 2;
    // Simple nudge to left
    doc.text('b', midBx - 2, midBy, { align: 'center' });

    // Side c connects A and B (Base)
    const midCx = (Ax + Bx) / 2;
    const midCy = (Ay + By) / 2;
    // Simple nudge down
    doc.text('c', midCx, midCy + 4, { align: 'center' });
};