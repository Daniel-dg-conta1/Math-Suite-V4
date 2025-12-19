import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { TriangleData } from '../types';
import { getTriangleCoords, getCircumcircle } from '../utils/trigoMath';
import { rotatePoint } from '../utils/math';

interface TriangleCanvasProps {
  data: TriangleData | null;
  isDarkMode?: boolean;
  hideValues?: boolean;
  padding?: number;
  // Visual Options
  showHeight?: boolean;
  showMedian?: boolean;
  showBisector?: boolean;
  showCircumcircle?: boolean;
  // Individual Visibility Controls
  showSideA?: boolean;
  showSideB?: boolean;
  showSideC?: boolean;
  showAngleA?: boolean;
  showAngleB?: boolean;
  showAngleC?: boolean;
  rotation?: number; // degrees
  visualOrigin?: 'A' | 'B' | 'C';
  fontScale?: number;
}

const TriangleCanvas = forwardRef<HTMLCanvasElement, TriangleCanvasProps>(({ 
  data, 
  isDarkMode, 
  hideValues = false, 
  padding = 40,
  showHeight = false,
  showMedian = false,
  showBisector = false,
  showCircumcircle = false,
  showSideA = true,
  showSideB = true,
  showSideC = true,
  showAngleA = false,
  showAngleB = false,
  showAngleC = false,
  rotation = 0,
  visualOrigin = 'C',
  fontScale = 1.0
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => canvasRef.current as HTMLCanvasElement);

  useEffect(() => {
    const handleResize = () => {
       draw();
    };
    window.addEventListener('resize', handleResize);
    
    draw(); // Initial draw

    const timer = setTimeout(draw, 50);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [data, isDarkMode, hideValues, padding, showHeight, showMedian, showBisector, showCircumcircle, showSideA, showSideB, showSideC, showAngleA, showAngleB, showAngleC, rotation, visualOrigin, fontScale]);

  const draw = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas
    const { width, height } = container.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = isDarkMode ? '#1e293b' : '#ffffff';
    ctx.fillRect(0, 0, width, height);

    if (!data || !data.valid) {
       ctx.font = '14px Inter, sans-serif';
       ctx.fillStyle = isDarkMode ? '#64748b' : '#94a3b8';
       ctx.textAlign = 'center';
       ctx.fillText('Insira valores válidos para gerar o triângulo', width/2, height/2);
       return;
    }

    const baseCoords = getTriangleCoords(data);
    
    // --- ROTATION LOGIC ---
    const Gx = (baseCoords.Ax + baseCoords.Bx + baseCoords.Cx) / 3;
    const Gy = (baseCoords.Ay + baseCoords.By + baseCoords.Cy) / 3;

    const applyRotation = (x: number, y: number) => {
       if (rotation === 0) return { x, y };
       const r = rotatePoint(x - Gx, y - Gy, rotation);
       return { x: r.x + Gx, y: r.y + Gy };
    };

    const A = applyRotation(baseCoords.Ax, baseCoords.Ay);
    const B = applyRotation(baseCoords.Bx, baseCoords.By);
    const C = applyRotation(baseCoords.Cx, baseCoords.Cy);

    // Identify Origin (P) and Opposite Side Vertices (U, V) based on visualOrigin
    let P = C, U = A, V = B; // Default for 'C'
    let side1 = data.b, side2 = data.a; // sides adjacent to P (for bisector ratio)
    let labelH = data.heights.c, labelM = data.medians.c, labelB = data.bisectors.c;

    if (visualOrigin === 'A') {
        P = A; U = B; V = C;
        side1 = data.c; side2 = data.b;
        labelH = data.heights.a; labelM = data.medians.a; labelB = data.bisectors.a;
    } else if (visualOrigin === 'B') {
        P = B; U = C; V = A;
        side1 = data.a; side2 = data.c;
        labelH = data.heights.b; labelM = data.medians.b; labelB = data.bisectors.b;
    }
    // Else 'C': P=C, U=A, V=B. sides b and a.

    // 1. Altitude (Height): H is projection of P onto line UV
    // Vector UV
    const UV = { x: V.x - U.x, y: V.y - U.y };
    const UP = { x: P.x - U.x, y: P.y - U.y };
    // Projection factor t = (UP . UV) / (UV . UV)
    const lenUV2 = UV.x * UV.x + UV.y * UV.y;
    const t = (UP.x * UV.x + UP.y * UV.y) / (lenUV2 || 1);
    const H = { x: U.x + t * UV.x, y: U.y + t * UV.y };

    // 2. Median: M is midpoint of UV
    const M = { x: (U.x + V.x) / 2, y: (U.y + V.y) / 2 };

    // 3. Bisector: D on UV. Ratio UD/DV = side_adj_U / side_adj_V.
    const D = {
       x: (side2 * U.x + side1 * V.x) / (side1 + side2),
       y: (side2 * U.y + side1 * V.y) / (side1 + side2)
    };
    
    // 4. Circumcircle
    const cc = getCircumcircle(data, baseCoords);
    const O = applyRotation(cc.Ox, cc.Oy);
    const Radius = cc.R;

    // --- AUTO SCALE ---
    let minX = Math.min(A.x, B.x, C.x);
    let maxX = Math.max(A.x, B.x, C.x);
    let minY = Math.min(A.y, B.y, C.y);
    let maxY = Math.max(A.y, B.y, C.y);

    if (showCircumcircle) {
       minX = Math.min(minX, O.x - Radius);
       maxX = Math.max(maxX, O.x + Radius);
       minY = Math.min(minY, O.y - Radius);
       maxY = Math.max(maxY, O.y + Radius);
    }
    
    const triW = maxX - minX;
    const triH = maxY - minY;
    
    const availW = width - padding * 2;
    const availH = height - padding * 2;
    
    const scale = Math.min(availW / (triW || 1), availH / (triH || 1));
    
    const mathCx = (minX + maxX) / 2;
    const mathCy = (minY + maxY) / 2;
    const canvasCx = width / 2;
    const canvasCy = height / 2;
    
    const tx = (val: number) => canvasCx + (val - mathCx) * scale;
    const ty = (val: number) => canvasCy - (val - mathCy) * scale;

    const sA = { x: tx(A.x), y: ty(A.y) };
    const sB = { x: tx(B.x), y: ty(B.y) };
    const sC = { x: tx(C.x), y: ty(C.y) };

    // --- DRAWING HELPERS ---
    const vec = (p1: {x:number, y:number}, p2: {x:number, y:number}) => ({ x: p2.x - p1.x, y: p2.y - p1.y });
    const mag = (v: {x:number, y:number}) => Math.sqrt(v.x*v.x + v.y*v.y);
    const norm = (v: {x:number, y:number}) => { const l = mag(v); return l > 0 ? {x: v.x/l, y: v.y/l} : {x:0, y:0}; };
    const add = (v1: {x:number, y:number}, v2: {x:number, y:number}) => ({ x: v1.x + v2.x, y: v1.y + v2.y });
    const scaleVec = (v: {x:number, y:number}, s: number) => ({ x: v.x * s, y: v.y * s });

    const fmt = (n: number) => Number.isInteger(n) ? n.toString() : n.toFixed(1);
    const isRight = (n: number) => Math.abs(n - 90) < 0.1;

    // --- LAYERS ---
    
    // Circumcircle (Layer 0)
    if (showCircumcircle) {
       const sO = { x: tx(O.x), y: ty(O.y) };
       const sR = Radius * scale;
       
       ctx.beginPath();
       ctx.arc(sO.x, sO.y, sR, 0, 2 * Math.PI);
       ctx.strokeStyle = isDarkMode ? '#4f46e5' : '#818cf8'; // Indigo
       ctx.lineWidth = 1;
       ctx.setLineDash([5, 5]);
       ctx.stroke();
       ctx.setLineDash([]);
       
       // Center
       ctx.fillStyle = ctx.strokeStyle;
       ctx.beginPath(); ctx.arc(sO.x, sO.y, 2, 0, 2*Math.PI); ctx.fill();
       
       // Radius Label
       ctx.font = `${10 * fontScale}px Inter, sans-serif`;
       ctx.fillText(`R=${data.area ? (data.a*data.b*data.c/(4*data.area)).toFixed(1) : ''}`, sO.x + 5, sO.y - 5);
    }

    // Triangle Fill & Stroke (Layer 1)
    ctx.beginPath();
    ctx.moveTo(sA.x, sA.y);
    ctx.lineTo(sB.x, sB.y);
    ctx.lineTo(sC.x, sC.y);
    ctx.closePath();
    ctx.fillStyle = isDarkMode ? 'rgba(45, 212, 191, 0.15)' : 'rgba(236, 253, 245, 0.5)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = isDarkMode ? '#2dd4bf' : '#005A7A';
    ctx.stroke();

    // Right Angle Symbols (Layer 1.5)
    const drawRightSymbol = (V: {x:number, y:number}, N1: {x:number, y:number}, N2: {x:number, y:number}) => {
       const size = 12; // pixels
       const u = norm(vec(V, N1));
       const v = norm(vec(V, N2));
       
       const p1 = add(V, scaleVec(u, size));
       const p2 = add(V, scaleVec(v, size));
       const p3 = add(p1, scaleVec(v, size));
       
       ctx.beginPath();
       ctx.moveTo(p1.x, p1.y);
       ctx.lineTo(p3.x, p3.y);
       ctx.lineTo(p2.x, p2.y);
       ctx.strokeStyle = isDarkMode ? '#e2e8f0' : '#475569';
       ctx.lineWidth = 1.5;
       ctx.stroke();
       
       // Dot
       ctx.beginPath();
       const mid = add(V, scaleVec(add(u, v), size/1.5));
       ctx.arc(mid.x, mid.y, 1.5, 0, 2*Math.PI);
       ctx.fillStyle = ctx.strokeStyle;
       ctx.fill();
    };

    if (isRight(data.A)) drawRightSymbol(sA, sB, sC);
    if (isRight(data.B)) drawRightSymbol(sB, sA, sC);
    if (isRight(data.C)) drawRightSymbol(sC, sA, sB);

    // Visuals (Layer 2)
    const drawDashedLine = (p1: {x:number, y:number}, p2: {x:number, y:number}, color: string, label: string) => {
        const sP1 = { x: tx(p1.x), y: ty(p1.y) };
        const sP2 = { x: tx(p2.x), y: ty(p2.y) };
        
        ctx.beginPath();
        ctx.moveTo(sP1.x, sP1.y);
        ctx.lineTo(sP2.x, sP2.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Mid label
        const mx = (sP1.x + sP2.x) / 2;
        const my = (sP1.y + sP2.y) / 2;
        ctx.fillStyle = color;
        ctx.font = `bold ${11 * fontScale}px Inter`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, mx, my - 8);
    };

    if (showHeight) drawDashedLine(P, H, '#ef4444', `h=${labelH}`); // Red
    if (showMedian) drawDashedLine(P, M, '#f59e0b', `m`); // Amber
    if (showBisector) drawDashedLine(P, D, '#8b5cf6', `β`); // Violet

    // --- TEXT LABELS ---
    
    // Setup Fonts
    const fontVertex = `bold ${24 * fontScale}px Inter, sans-serif`;
    const fontSide = `bold ${20 * fontScale}px Inter, sans-serif`;
    const fontAngle = `bold ${16 * fontScale}px Inter, sans-serif`;

    // 1. Vertices
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isDarkMode ? '#e2e8f0' : '#005A7A';
    ctx.font = fontVertex;

    const labelOffset = 25;
    const center = { x: (sA.x+sB.x+sC.x)/3, y: (sA.y+sB.y+sC.y)/3 };
    const vertexPos = (pt: {x:number, y:number}) => {
        const angle = Math.atan2(pt.y - center.y, pt.x - center.x);
        return { x: pt.x + Math.cos(angle)*labelOffset, y: pt.y + Math.sin(angle)*labelOffset };
    };
    
    const lA = vertexPos(sA);
    const lB = vertexPos(sB);
    const lC = vertexPos(sC);
    
    ctx.fillText('A', lA.x, lA.y);
    ctx.fillText('B', lB.x, lB.y);
    ctx.fillText('C', lC.x, lC.y);

    // 2. Angles (Inside)
    if (!hideValues) {
        ctx.font = fontAngle;
        ctx.fillStyle = isDarkMode ? '#cbd5e1' : '#334155';
        
        const drawAngleValue = (V: {x:number, y:number}, N1: {x:number, y:number}, N2: {x:number, y:number}, val: number, show: boolean) => {
            if (!show || isRight(val)) return;
            const u = norm(vec(V, N1));
            const v = norm(vec(V, N2));
            const bisector = norm(add(u, v));
            
            // --- DYNAMIC POSITIONING ---
            const baseDist = 75 * fontScale; // Default base distance scaled
            // Add extra clearance for acute angles (< 20 degrees) to prevent overlap
            const dist = val < 20 ? baseDist * 1.35 : baseDist;
            
            const pos = add(V, scaleVec(bisector, dist));
            ctx.fillText(`${fmt(val)}°`, pos.x, pos.y);
        };

        drawAngleValue(sA, sB, sC, data.A, showAngleA || false);
        drawAngleValue(sB, sA, sC, data.B, showAngleB || false);
        drawAngleValue(sC, sA, sB, data.C, showAngleC || false);
    }

    // 3. Sides
    if (!hideValues) {
       ctx.fillStyle = isDarkMode ? '#94a3b8' : '#475569';
       ctx.font = fontSide;
       
       const mid = (p1: any, p2: any) => ({ x: (p1.x+p2.x)/2, y: (p1.y+p2.y)/2 });
       const mC = mid(sA, sB); // Side c
       const mB = mid(sA, sC); // Side b
       const mA = mid(sB, sC); // Side a
       
       const nudge = (pt: {x:number, y:number}, normalRef: {x:number, y:number}) => {
           // Push label slightly away from center
           const dir = norm(vec(center, pt));
           return add(pt, scaleVec(dir, 28));
       };

       if (showSideC) {
           const p = nudge(mC, sC);
           ctx.fillText(`${fmt(data.c)}`, p.x, p.y);
       }
       if (showSideB) {
           const p = nudge(mB, sB);
           ctx.fillText(`${fmt(data.b)}`, p.x, p.y);
       }
       if (showSideA) {
           const p = nudge(mA, sA);
           ctx.fillText(`${fmt(data.a)}`, p.x, p.y);
       }
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-white/50 dark:bg-slate-800/50 rounded-lg">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
});

export default TriangleCanvas;