import React, { useState, useEffect, useRef } from 'react';
import { TriangleMode, TriangleData, TrigoExercise } from './types';
import { solveTriangle } from './utils/trigoMath';
import TriangleCanvas from './components/TriangleCanvas';
import { generateTrigoPDF } from './utils/trigoPdf';
import { exportToCSV, exportToXLSX } from './utils/exportHelper';

const MODES: { value: TriangleMode; label: string; inputs: string[] }[] = [
  { value: 'Right', label: 'Triângulo Retângulo', inputs: ['Cateto a', 'Cateto b'] },
  { value: 'Right_HypCat', label: 'Triângulo Retângulo', inputs: ['Hipotenusa (c)', 'Cateto (a)'] },
  { value: 'Right_CatAng', label: 'Triângulo Retângulo', inputs: ['Cateto (a)', 'Ângulo A (oposto)'] },
  { value: 'Right_HypAng', label: 'Triângulo Retângulo', inputs: ['Hipotenusa (c)', 'Ângulo A'] },
  { value: 'SSS', label: 'Lado-Lado-Lado (LLL)', inputs: ['Lado a', 'Lado b', 'Lado c'] },
  { value: 'SAS', label: 'Lado-Ângulo-Lado (LAL)', inputs: ['Lado b', 'Ângulo A (°)', 'Lado c'] },
  { value: 'ASA', label: 'Ângulo-Lado-Ângulo (ALA)', inputs: ['Ângulo A (°)', 'Lado c', 'Ângulo B (°)'] },
  { value: 'AAS', label: 'Lado-Ângulo-Ângulo (LAA)', inputs: ['Ângulo A (°)', 'Ângulo B (°)', 'Lado a'] },
];

const getModeLabel = (mode: TriangleMode) => {
  return MODES.find(m => m.value === mode)?.label || mode;
};

interface TrigoAppProps {
  isDarkMode?: boolean;
}

const TrigoApp: React.FC<TrigoAppProps> = ({ isDarkMode }) => {
  // --- STATE ---
  const [mode, setMode] = useState<TriangleMode>('Right');
  const [modeHighlight, setModeHighlight] = useState(false); // Visual feedback state
  
  const [val1, setVal1] = useState<string>('3');
  const [val2, setVal2] = useState<string>('4');
  const [val3, setVal3] = useState<string>('5'); 
  
  const [triangle, setTriangle] = useState<TriangleData | null>(null);
  
  // Generator Configs
  const [qtyRight, setQtyRight] = useState(3);
  const [qtyOblique, setQtyOblique] = useState(2);
  const [includeSteps, setIncludeSteps] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false); // New: Practice Mode toggle
  
  const [generatedList, setGeneratedList] = useState<TrigoExercise[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // PDF Options
  const [pdfMode, setPdfMode] = useState<'full' | 'simple'>('full');
  const [itemsPerPage, setItemsPerPage] = useState(4);

  // New Features State
  const [shareCode, setShareCode] = useState<string>('');
  const [importCode, setImportCode] = useState<string>('');
  const [showShare, setShowShare] = useState(false);
  
  // Visual Options
  const [showHeight, setShowHeight] = useState(false);
  const [showMedian, setShowMedian] = useState(false);
  const [showBisector, setShowBisector] = useState(false);
  const [showCircumcircle, setShowCircumcircle] = useState(false);
  
  // Individual Visibility Controls
  const [showSideA, setShowSideA] = useState(true);
  const [showSideB, setShowSideB] = useState(true);
  const [showSideC, setShowSideC] = useState(true);
  const [showAngleA, setShowAngleA] = useState(true);
  const [showAngleB, setShowAngleB] = useState(true);
  const [showAngleC, setShowAngleC] = useState(true);

  const [viewRotation, setViewRotation] = useState(0);
  const [visualOrigin, setVisualOrigin] = useState<'A' | 'B' | 'C'>('C');
  const [fontScale, setFontScale] = useState(1.0);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Practice Mode Answers State: key = "exerciseId-field" (e.g. "0-a")
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [validationResults, setValidationResults] = useState<Record<string, boolean>>({});

  // Derived
  const totalQuestions = qtyRight + qtyOblique;
  const isRightMode = mode.startsWith('Right');

  // --- SOLVER EFFECT ---
  useEffect(() => {
    const v1 = parseFloat(val1);
    const v2 = parseFloat(val2);
    const v3 = parseFloat(val3);

    if (!isNaN(v1) && !isNaN(v2)) {
        if (isRightMode || !isNaN(v3)) {
            const result = solveTriangle(mode, v1, v2, v3);
            setTriangle(result);
        } else {
            setTriangle(null);
        }
    } else {
        setTriangle(null);
    }
  }, [mode, val1, val2, val3]);

  // --- HANDLERS ---
  const currentModeConfig = MODES.find(m => m.value === mode)!;

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'Right') {
      setMode('Right'); // Default to CC
    } else {
      setMode(val as TriangleMode);
    }
    setModeHighlight(true);
    setTimeout(() => setModeHighlight(false), 500);
  };

  // Collaborative Share
  const generateShareCode = () => {
    const data = JSON.stringify({ mode, val1, val2, val3 });
    const code = btoa(data); // Simple Base64 encoding
    setShareCode(code);
    setShowShare(true);
  };

  const loadShareCode = () => {
    try {
      const json = atob(importCode);
      const data = JSON.parse(json);
      if (data.mode && data.val1) {
        setMode(data.mode);
        setVal1(data.val1);
        setVal2(data.val2);
        setVal3(data.val3 || '');
        setImportCode('');
        setShowShare(false);
      } else {
        alert("Código inválido");
      }
    } catch (e) {
      alert("Erro ao ler código. Verifique se está completo.");
    }
  };

  const generateExerciseForMode = (m: TriangleMode, id: number): TrigoExercise | null => {
      let attempts = 0;
      while (attempts < 50) {
          attempts++;
          const rSide = () => Math.floor(Math.random() * 15) + 3;
          const rAng = () => Math.floor(Math.random() * 80) + 10;
          
          let v1=0, v2=0, v3=0; // User facing values
          let label1='', label2='', label3='';
          let s1=0, s2=0, s3=0; // Solver inputs
          
          if (m === 'Right') {
              const subtype = Math.random();
              if (subtype < 0.4) {
                 // Cateto / Cateto (Default)
                 v1 = rSide(); v2 = rSide(); v3 = 0;
                 label1 = 'Cateto a'; label2 = 'Cateto b';
                 s1 = v1; s2 = v2; s3 = 0;
              } else if (subtype < 0.7) {
                 // Hipotenusa / Ângulo
                 const h = rSide() + 5; 
                 const ang = rAng();
                 v1 = h; label1 = 'Hipotenusa';
                 v2 = ang; label2 = 'Ângulo A';
                 v3 = 0;
                 // Calculate catetos for solver: a = h*sin(A), b = h*cos(A)
                 const rad = ang * Math.PI / 180;
                 s1 = h * Math.sin(rad);
                 s2 = h * Math.cos(rad);
                 s3 = 0;
              } else {
                 // Cateto / Ângulo
                 const cat = rSide();
                 const ang = rAng();
                 v2 = ang; label2 = 'Ângulo A';
                 v3 = 0;
                 
                 const rad = ang * Math.PI / 180;
                 
                 if (Math.random() > 0.5) {
                    // Given Adjacent Cateto (b)
                    v1 = cat; label1 = 'Cateto b';
                    s2 = cat; // b
                    s1 = cat * Math.tan(rad); // a
                 } else {
                    // Given Opposite Cateto (a)
                    v1 = cat; label1 = 'Cateto a';
                    s1 = cat; // a
                    s2 = cat / Math.tan(rad); // b
                 }
                 s3 = 0;
              }
          } else if (m === 'SSS') {
              v1 = rSide(); v2 = rSide(); 
              const min = Math.abs(v1-v2) + 1;
              const max = v1+v2 - 1;
              v3 = Math.floor(Math.random() * (max-min+1)) + min;
              label1 = 'a'; label2 = 'b'; label3 = 'c';
              s1=v1; s2=v2; s3=v3;
          } else if (m === 'SAS') {
              v1 = rSide(); v2 = rAng(); v3 = rSide();
              label1 = 'b'; label2 = 'Âng A'; label3 = 'c';
              s1=v1; s2=v2; s3=v3;
          } else if (m === 'ASA') {
              v1 = rAng(); v2 = rSide(); v3 = rAng();
              label1 = 'Âng A'; label2 = 'c'; label3 = 'Âng B';
              s1=v1; s2=v2; s3=v3;
          } else if (m === 'AAS') {
              v1 = rAng(); v2 = rAng(); v3 = rSide();
              label1 = 'Âng A'; label2 = 'Âng B'; label3 = 'a';
              s1=v1; s2=v2; s3=v3;
          }
          
          const sol = solveTriangle(m, s1, s2, s3);
          if (sol && sol.valid) {
              return {
                  id,
                  mode: m,
                  given: {
                      val1: v1, label1,
                      val2: v2, label2,
                      val3: (!m.startsWith('Right')) ? v3 : undefined, label3
                  },
                  solution: sol
              };
          }
      }
      return null;
  };

  const handleGenerate = () => {
    const list: TrigoExercise[] = [];
    let currentId = 1;

    // Generate Right Triangles
    for (let i = 0; i < qtyRight; i++) {
        const ex = generateExerciseForMode('Right', currentId);
        if (ex) {
            list.push(ex);
            currentId++;
        }
    }

    // Generate Oblique Triangles
    const obliqueModes: TriangleMode[] = ['SSS', 'SAS', 'ASA', 'AAS'];
    for (let i = 0; i < qtyOblique; i++) {
        const m = obliqueModes[Math.floor(Math.random() * obliqueModes.length)];
        const ex = generateExerciseForMode(m, currentId);
        if (ex) {
            list.push(ex);
            currentId++;
        }
    }

    setGeneratedList(list);
    setUserAnswers({});
    setValidationResults({});
    setShowPreview(true);
  };

  const regenerateExercise = (index: number) => {
     const oldEx = generatedList[index];
     const newEx = generateExerciseForMode(oldEx.mode, oldEx.id);
     
     if (newEx) {
         const newList = [...generatedList];
         newList[index] = newEx;
         setGeneratedList(newList);
         
         // Clear answers for this question if any
         setUserAnswers(prev => {
             const next = { ...prev };
             Object.keys(next).forEach(key => {
                 if (key.startsWith(`${index}-`)) delete next[key];
             });
             return next;
         });
         setValidationResults(prev => {
             const next = { ...prev };
             Object.keys(next).forEach(key => {
                 if (key.startsWith(`${index}-`)) delete next[key];
             });
             return next;
         });
     }
  };

  // Practice Mode Logic
  const handleAnswerChange = (exId: number, field: string, value: string) => {
    setUserAnswers(prev => ({...prev, [`${exId}-${field}`]: value}));
  };

  const checkAnswers = (ex: TrigoExercise, idx: number) => {
    const sides = ['a', 'b', 'c'];
    const angles = ['A', 'B', 'C'];
    const newResults = { ...validationResults };
    
    // Check Sides (Normal tolerance)
    sides.forEach(f => {
       const key = `${idx}-${f}`;
       const userVal = parseFloat((userAnswers[key] || '0').replace(',', '.'));
       // @ts-ignore
       const correctVal = ex.solution[f] as number;
       
       // Tolerance of 0.2
       if (Math.abs(userVal - correctVal) <= 0.2) {
          newResults[key] = true;
       } else {
          newResults[key] = false;
       }
    });

    // Check Angles (Integer only)
    angles.forEach(f => {
        const key = `${idx}-${f}`;
        const userVal = parseFloat((userAnswers[key] || '0').replace(',', '.'));
        // @ts-ignore
        const correctVal = ex.solution[f] as number;
        
        // Integer part check
        if (Math.floor(userVal) === Math.floor(correctVal)) {
           newResults[key] = true;
        } else {
           newResults[key] = false;
        }
    });

    setValidationResults(newResults);
  };

  // Copy & Export Handlers
  const handleCopyResults = () => {
    if (!triangle) return;
    const header = "Vértice\tÂngulo\tLado Oposto\tAltura (h)\tMediana (m)\tBissetriz (β)";
    const rowA = `A\t${triangle.A}\t${triangle.a}\t${triangle.heights.a}\t${triangle.medians.a}\t${triangle.bisectors.a}`;
    const rowB = `B\t${triangle.B}\t${triangle.b}\t${triangle.heights.b}\t${triangle.medians.b}\t${triangle.bisectors.b}`;
    const rowC = `C\t${triangle.C}\t${triangle.c}\t${triangle.heights.c}\t${triangle.medians.c}\t${triangle.bisectors.c}`;
    const metadata = `\nÁrea: ${triangle.area}\tPerímetro: ${triangle.perimeter}`;
    
    const text = [header, rowA, rowB, rowC, metadata].join('\n');
    navigator.clipboard.writeText(text);
  };

  const handleExportResultsCSV = () => {
    if (!triangle) return;
    const header = "Vértice;Ângulo;Lado Oposto;Altura (h);Mediana (m);Bissetriz (β)";
    const rowA = `A;${triangle.A};${triangle.a};${triangle.heights.a};${triangle.medians.a};${triangle.bisectors.a}`;
    const rowB = `B;${triangle.B};${triangle.b};${triangle.heights.b};${triangle.medians.b};${triangle.bisectors.b}`;
    const rowC = `C;${triangle.C};${triangle.c};${triangle.heights.c};${triangle.medians.c};${triangle.bisectors.c}`;
    const metadata = `\nÁrea;${triangle.area};Perímetro;${triangle.perimeter}`;
    
    const csvContent = [header, rowA, rowB, rowC, metadata].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'TrigoMestre_Resultados.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyImage = () => {
    if (canvasRef.current) {
        canvasRef.current.toBlob(blob => {
            if (blob) {
                try {
                    const item = new ClipboardItem({ "image/png": blob });
                    navigator.clipboard.write([item]);
                    // Optional feedback
                } catch (err) {
                    console.error("Failed to copy image: ", err);
                    alert("Erro ao copiar imagem. Verifique as permissões do navegador.");
                }
            }
        });
    }
  };

  // Filter modes for dropdown: Show only one entry for Right
  const dropdownOptions = MODES.filter(m => !m.value.startsWith('Right') || m.value === 'Right');

  return (
    <div className="flex flex-col h-full bg-[#F5F7FA] dark:bg-slate-950 font-sans text-slate-800 dark:text-gray-100 transition-colors">
      
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 h-16 flex items-center justify-between px-6 sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-teal-600 to-teal-400 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">T</div>
          <div>
            <h1 className="font-bold text-lg text-teal-800 dark:text-teal-400">TrigoMestre</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={generateShareCode} className="text-xs bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-3 py-1.5 rounded-lg font-bold hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-all hover:shadow-sm active:scale-95">
               🔗 Compartilhar
            </button>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 hidden md:block">Calculadora & Gerador</div>
        </div>
      </header>

      {/* Share Modal/Panel */}
      {showShare && (
         <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-2xl max-w-sm w-full border border-gray-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
               <h3 className="font-bold mb-3 dark:text-white">Compartilhar Simulação</h3>
               {shareCode && (
                  <div className="mb-4">
                     <label className="text-xs text-gray-500 block mb-1">Seu código:</label>
                     <div className="bg-gray-100 dark:bg-slate-800 p-2 rounded text-xs break-all font-mono select-all">
                        {shareCode}
                     </div>
                  </div>
               )}
               <div className="mb-4">
                  <label className="text-xs text-gray-500 block mb-1">Carregar código:</label>
                  <input value={importCode} onChange={e => setImportCode(e.target.value)} className="w-full p-2 border rounded bg-gray-50 dark:bg-slate-800 dark:border-slate-700 text-xs focus:ring-1 focus:ring-teal-500" placeholder="Cole o código aqui..." />
               </div>
               <div className="flex gap-2 justify-end">
                  <button onClick={() => {setShowShare(false); setShareCode('')}} className="px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 rounded transition active:scale-95">Fechar</button>
                  <button onClick={loadShareCode} className="px-3 py-2 text-xs bg-teal-600 text-white rounded hover:bg-teal-700 transition active:scale-95 shadow-sm">Carregar</button>
               </div>
            </div>
         </div>
      )}

      <div className="flex-1 p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-y-auto lg:overflow-hidden">
        
        {/* LEFT: INPUTS */}
        <div className="lg:col-span-3 flex flex-col gap-6 lg:overflow-y-auto pr-0 lg:pr-2 custom-scrollbar h-auto lg:h-full">
           
           {/* Mode Select */}
           <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 block">Caso / Tipo</label>
              <div className={`relative rounded-lg transition-all duration-300 ${modeHighlight ? 'ring-2 ring-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.5)] scale-[1.02]' : ''}`}>
                <select 
                  value={isRightMode ? 'Right' : mode} 
                  onChange={handleModeChange}
                  className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800 font-medium text-gray-700 dark:text-gray-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-colors"
                >
                   {dropdownOptions.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                   ))}
                </select>
              </div>

              {/* Right Triangle Sub-selection Buttons */}
              {isRightMode && (
                 <div className="grid grid-cols-4 gap-1 mt-3 animate-in fade-in slide-in-from-top-1">
                     <button 
                       title="Cateto e Cateto"
                       onClick={() => setMode('Right')}
                       className={`py-1.5 text-xs font-bold rounded transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-md active:scale-95 ${mode === 'Right' ? 'bg-teal-600 text-white shadow-md' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-teal-50 dark:hover:bg-teal-900/20'}`}
                     >
                       CC
                     </button>
                     <button 
                       title="Cateto e Hipotenusa"
                       onClick={() => setMode('Right_HypCat')}
                       className={`py-1.5 text-xs font-bold rounded transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-md active:scale-95 ${mode === 'Right_HypCat' ? 'bg-teal-600 text-white shadow-md' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-teal-50 dark:hover:bg-teal-900/20'}`}
                     >
                       CH
                     </button>
                     <button 
                       title="Cateto e Ângulo"
                       onClick={() => setMode('Right_CatAng')}
                       className={`py-1.5 text-xs font-bold rounded transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-md active:scale-95 ${mode === 'Right_CatAng' ? 'bg-teal-600 text-white shadow-md' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-teal-50 dark:hover:bg-teal-900/20'}`}
                     >
                       CA
                     </button>
                     <button 
                       title="Hipotenusa e Ângulo"
                       onClick={() => setMode('Right_HypAng')}
                       className={`py-1.5 text-xs font-bold rounded transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-md active:scale-95 ${mode === 'Right_HypAng' ? 'bg-teal-600 text-white shadow-md' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-teal-50 dark:hover:bg-teal-900/20'}`}
                     >
                       HA
                     </button>
                 </div>
              )}
           </div>

           {/* Inputs */}
           <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
               <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                 <span>✏️</span> Entradas
               </h3>
               <div className="space-y-3">
                   <div>
                       <label className="text-xs font-bold text-teal-600 dark:text-teal-400 mb-1 block">{currentModeConfig.inputs[0]}</label>
                       <input type="number" value={val1} onChange={e => setVal1(e.target.value)} className="w-full p-2 border border-gray-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 dark:text-white focus:ring-1 focus:ring-teal-400 transition-shadow" />
                   </div>
                   <div>
                       <label className="text-xs font-bold text-teal-600 dark:text-teal-400 mb-1 block">{currentModeConfig.inputs[1]}</label>
                       <input type="number" value={val2} onChange={e => setVal2(e.target.value)} className="w-full p-2 border border-gray-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 dark:text-white focus:ring-1 focus:ring-teal-400 transition-shadow" />
                   </div>
                   {currentModeConfig.inputs[2] && (
                       <div>
                           <label className="text-xs font-bold text-teal-600 dark:text-teal-400 mb-1 block">{currentModeConfig.inputs[2]}</label>
                           <input type="number" value={val3} onChange={e => setVal3(e.target.value)} className="w-full p-2 border border-gray-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 dark:text-white focus:ring-1 focus:ring-teal-400 transition-shadow" />
                       </div>
                   )}
               </div>
           </div>

           {/* Error Display */}
           {triangle && !triangle.valid && triangle.error && (
             <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-2">
                 <div className="flex items-start gap-3">
                    <div className="text-lg animate-pulse">⚠️</div>
                    <div>
                      <h3 className="font-bold text-red-800 dark:text-red-300 text-sm">Entrada Inválida</h3>
                      <p className="text-red-600 dark:text-red-400 text-xs mt-1 leading-snug">{triangle.error}</p>
                    </div>
                 </div>
             </div>
           )}

           {/* Results Table */}
           {triangle && triangle.valid && (
               <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2">
                   <div className="flex justify-between items-center mb-3 border-b border-gray-100 dark:border-slate-800 pb-2">
                       <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Resultados Calculados</h3>
                       <div className="flex gap-1">
                          <button 
                             onClick={handleCopyResults}
                             title="Copiar resultados"
                             className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                           >
                             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                           </button>
                           <button 
                             onClick={handleExportResultsCSV}
                             title="Exportar CSV"
                             className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                           >
                             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                           </button>
                       </div>
                   </div>
                   
                   <div className="overflow-x-auto">
                     <table className="w-full text-xs text-left">
                       <thead>
                         <tr className="text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-slate-800">
                           <th className="py-2 pl-1 font-medium">Vértice</th>
                           <th className="py-2 font-medium">Ângulo</th>
                           <th className="py-2 font-medium">Lado Oposto</th>
                           <th className="py-2 font-medium text-red-500">Altura (h)</th>
                           <th className="py-2 font-medium text-amber-500">Mediana (m)</th>
                           <th className="py-2 font-medium text-violet-500">Bissetriz (β)</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50 dark:divide-slate-800 text-gray-600 dark:text-gray-300">
                         <tr>
                           <td className="py-2 pl-1 font-bold">A</td>
                           <td className="font-mono">{triangle.A}°</td>
                           <td className="font-mono">{triangle.a}</td>
                           <td className="font-mono text-red-600 dark:text-red-400">{triangle.heights.a}</td>
                           <td className="font-mono text-amber-600 dark:text-amber-400">{triangle.medians.a}</td>
                           <td className="font-mono text-violet-600 dark:text-violet-400">{triangle.bisectors.a}</td>
                         </tr>
                         <tr>
                           <td className="py-2 pl-1 font-bold">B</td>
                           <td className="font-mono">{triangle.B}°</td>
                           <td className="font-mono">{triangle.b}</td>
                           <td className="font-mono text-red-600 dark:text-red-400">{triangle.heights.b}</td>
                           <td className="font-mono text-amber-600 dark:text-amber-400">{triangle.medians.b}</td>
                           <td className="font-mono text-violet-600 dark:text-violet-400">{triangle.bisectors.b}</td>
                         </tr>
                         <tr>
                           <td className="py-2 pl-1 font-bold">C</td>
                           <td className="font-mono">{triangle.C}°</td>
                           <td className="font-mono">{triangle.c}</td>
                           <td className="font-mono text-red-600 dark:text-red-400">{triangle.heights.c}</td>
                           <td className="font-mono text-amber-600 dark:text-amber-400">{triangle.medians.c}</td>
                           <td className="font-mono text-violet-600 dark:text-violet-400">{triangle.bisectors.c}</td>
                         </tr>
                       </tbody>
                     </table>
                   </div>
                   
                   <div className="mt-3 bg-teal-50 dark:bg-teal-900/30 p-2 rounded text-xs grid grid-cols-2 gap-2 text-teal-800 dark:text-teal-300 font-medium">
                       <div>Área: {triangle.area}</div>
                       <div>Perímetro: {triangle.perimeter}</div>
                   </div>
               </div>
           )}

        </div>

        {/* CENTER: CANVAS WITH TOOLBAR */}
        <div className="lg:col-span-6 flex flex-col h-[60vh] lg:h-full gap-4 order-first lg:order-none">
           
           {/* Canvas Container */}
           <div className="flex-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 p-4 shadow-inner relative overflow-hidden">
               <div className="absolute top-4 right-4 bg-white/80 dark:bg-slate-900/80 px-2 py-1 rounded text-xs font-mono text-gray-500 dark:text-gray-400 backdrop-blur-sm z-10 pointer-events-none">
                   Visualização Automática
               </div>
               <TriangleCanvas 
                  ref={canvasRef}
                  data={triangle} 
                  isDarkMode={isDarkMode}
                  showHeight={showHeight}
                  showMedian={showMedian}
                  showBisector={showBisector}
                  showCircumcircle={showCircumcircle}
                  // Individual toggles
                  showSideA={showSideA}
                  showSideB={showSideB}
                  showSideC={showSideC}
                  showAngleA={showAngleA}
                  showAngleB={showAngleB}
                  showAngleC={showAngleC}
                  rotation={viewRotation}
                  visualOrigin={visualOrigin}
                  hideValues={practiceMode}
                  fontScale={fontScale}
               />
           </div>

           {/* Visual Tools Toolbar */}
           <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-3 shadow-sm flex flex-col gap-2">
               <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-2">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Opções de Visualização</span>
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] text-gray-400">Origem:</span>
                     <div className="flex bg-gray-100 dark:bg-slate-800 rounded-md p-0.5">
                        <button onClick={() => setVisualOrigin('A')} className={`px-2 py-0.5 text-[10px] font-bold rounded ${visualOrigin === 'A' ? 'bg-white dark:bg-slate-700 shadow text-teal-600 dark:text-teal-400' : 'text-gray-400 hover:text-gray-600'}`}>∠A</button>
                        <button onClick={() => setVisualOrigin('B')} className={`px-2 py-0.5 text-[10px] font-bold rounded ${visualOrigin === 'B' ? 'bg-white dark:bg-slate-700 shadow text-teal-600 dark:text-teal-400' : 'text-gray-400 hover:text-gray-600'}`}>∠B</button>
                        <button onClick={() => setVisualOrigin('C')} className={`px-2 py-0.5 text-[10px] font-bold rounded ${visualOrigin === 'C' ? 'bg-white dark:bg-slate-700 shadow text-teal-600 dark:text-teal-400' : 'text-gray-400 hover:text-gray-600'}`}>∠C</button>
                     </div>
                  </div>
               </div>
               
               {/* Geometric Lines (Row 1) */}
               <div className="flex flex-wrap items-center gap-2">
                  <button 
                     onClick={() => setShowHeight(!showHeight)}
                     className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showHeight ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                  >
                     Altura (h)
                  </button>
                  <button 
                     onClick={() => setShowMedian(!showMedian)}
                     className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showMedian ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-200 dark:border-amber-800' : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                  >
                     Mediana (m)
                  </button>
                  <button 
                     onClick={() => setShowBisector(!showBisector)}
                     className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showBisector ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 border-violet-200 dark:border-violet-800' : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                  >
                     Bissetriz (β)
                  </button>
                  <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1"></div>
                  <button 
                     onClick={() => setShowCircumcircle(!showCircumcircle)}
                     className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showCircumcircle ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-200 dark:border-indigo-800' : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                  >
                     Circunscrito (R)
                  </button>
                  
                  <div className="ml-auto flex items-center gap-2">
                     {/* Font Control */}
                     <div className="flex items-center gap-1 border-r border-gray-200 dark:border-slate-700 pr-2 mr-2">
                        <span className="text-[10px] text-gray-400">Fonte:</span>
                        <button 
                            onClick={() => setFontScale(s => Math.max(0.5, s - 0.1))} 
                            title="Diminuir fonte"
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 transition"
                        >
                            <span className="text-xs">A</span>
                        </button>
                        <button 
                            onClick={() => setFontScale(s => Math.min(3.0, s + 0.1))} 
                            title="Aumentar fonte"
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 transition"
                        >
                            <span className="text-lg font-bold">A</span>
                        </button>
                     </div>

                     <span className="text-[10px] text-gray-400">Rot:</span>
                     <input 
                        type="range" 
                        min="0" max="360" 
                        value={viewRotation} 
                        onChange={e => setViewRotation(parseInt(e.target.value))} 
                        className="w-16 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                     />
                  </div>
               </div>

               {/* Individual Controls (Row 2 - Wrapped) */}
               <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">Lados:</span>
                  <button onClick={() => setShowSideA(!showSideA)} className={`px-2 py-1 text-[10px] font-bold rounded border ${showSideA ? 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white border-gray-300 dark:border-slate-600' : 'text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-slate-800'}`}>a</button>
                  <button onClick={() => setShowSideB(!showSideB)} className={`px-2 py-1 text-[10px] font-bold rounded border ${showSideB ? 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white border-gray-300 dark:border-slate-600' : 'text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-slate-800'}`}>b</button>
                  <button onClick={() => setShowSideC(!showSideC)} className={`px-2 py-1 text-[10px] font-bold rounded border ${showSideC ? 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white border-gray-300 dark:border-slate-600' : 'text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-slate-800'}`}>c</button>
                  
                  <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-2"></div>
                  
                  <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">Ângulos:</span>
                  <button onClick={() => setShowAngleA(!showAngleA)} className={`px-2 py-1 text-[10px] font-bold rounded border ${showAngleA ? 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white border-gray-300 dark:border-slate-600' : 'text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-slate-800'}`}>A</button>
                  <button onClick={() => setShowAngleB(!showAngleB)} className={`px-2 py-1 text-[10px] font-bold rounded border ${showAngleB ? 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white border-gray-300 dark:border-slate-600' : 'text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-slate-800'}`}>B</button>
                  <button onClick={() => setShowAngleC(!showAngleC)} className={`px-2 py-1 text-[10px] font-bold rounded border ${showAngleC ? 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white border-gray-300 dark:border-slate-600' : 'text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-slate-800'}`}>C</button>

                  <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-2"></div>
                  
                  <button 
                     onClick={handleCopyImage}
                     title="Copiar imagem"
                     className="px-2 py-1 rounded text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                  </button>
               </div>
           </div>

        </div>

        {/* RIGHT: GENERATOR */}
        <div className="lg:col-span-3 flex flex-col h-auto lg:h-full lg:overflow-y-auto custom-scrollbar">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 flex flex-col h-full">
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-orange-50/50 dark:bg-orange-900/20 rounded-t-xl">
                   <h2 className="font-semibold text-orange-900 dark:text-orange-400">📚 Gerar Lista</h2>
                </div>
                <div className="p-6 space-y-6">
                   <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                       Configure a quantidade de questões por tipo para compor a lista.
                   </p>
                   
                   <div className="space-y-3">
                       <div>
                           <div className="flex justify-between items-center mb-1">
                             <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Triâng. Retângulos</label>
                             <span className="text-xs font-mono bg-gray-100 dark:bg-slate-800 px-2 rounded dark:text-white">{qtyRight}</span>
                           </div>
                           <input type="range" min="0" max="10" value={qtyRight} onChange={e => setQtyRight(parseInt(e.target.value))} className="w-full accent-orange-500 cursor-pointer" />
                       </div>
                       
                       <div>
                           <div className="flex justify-between items-center mb-1">
                             <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Gerais (Leis Sen/Cos)</label>
                             <span className="text-xs font-mono bg-gray-100 dark:bg-slate-800 px-2 rounded dark:text-white">{qtyOblique}</span>
                           </div>
                           <input type="range" min="0" max="10" value={qtyOblique} onChange={e => setQtyOblique(parseInt(e.target.value))} className="w-full accent-orange-500 cursor-pointer" />
                       </div>
                       
                       <div className="pt-2">
                           <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-slate-800 border border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition">
                               <input type="checkbox" checked={includeSteps} onChange={e => setIncludeSteps(e.target.checked)} className="rounded text-orange-500 focus:ring-orange-500 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
                               <div className="text-xs">
                                   <div className="font-bold text-gray-700 dark:text-gray-300">Incluir Passo a Passo</div>
                                   <div className="text-gray-400 text-[10px]">Adiciona guia de resolução no PDF do aluno</div>
                               </div>
                           </label>
                       </div>
                   </div>

                   <div className="text-center text-xs text-gray-400 pt-1 pb-1 border-t border-gray-100 dark:border-slate-800">
                       Total de Questões: <span className="font-bold text-orange-600 dark:text-orange-400">{totalQuestions}</span>
                   </div>

                   {/* PDF CONFIGS */}
                   <div className="pt-6 border-t border-gray-100 dark:border-slate-800">
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-2">Formato do PDF</label>
                      <div className="flex gap-4 mb-3">
                          <label className="flex items-center gap-2 text-xs cursor-pointer dark:text-gray-300 hover:text-orange-600 transition-colors">
                              <input type="radio" name="pdfMode" checked={pdfMode === 'full'} onChange={() => setPdfMode('full')} className="accent-orange-600" />
                              Completo
                          </label>
                          <label className="flex items-center gap-2 text-xs cursor-pointer dark:text-gray-300 hover:text-orange-600 transition-colors">
                              <input type="radio" name="pdfMode" checked={pdfMode === 'simple'} onChange={() => setPdfMode('simple')} className="accent-orange-600" />
                              Simplificado
                          </label>
                      </div>
                      {pdfMode === 'simple' && (
                          <div className="animate-in fade-in slide-in-from-top-1">
                              <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Itens por página (Max 8):</label>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="range" 
                                  min="1" 
                                  max="8" 
                                  value={itemsPerPage} 
                                  onChange={(e) => setItemsPerPage(parseInt(e.target.value))} 
                                  className="w-full accent-orange-500 cursor-pointer"
                                />
                                <span className="text-xs font-bold w-4 dark:text-white">{itemsPerPage}</span>
                              </div>
                          </div>
                      )}
                   </div>

                   <div className="space-y-3 pt-6 border-t border-gray-100 dark:border-slate-800">
                     <button 
                       onClick={() => { setPracticeMode(false); handleGenerate(); }}
                       disabled={totalQuestions === 0}
                       className="w-full py-3 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 hover:-translate-y-0.5 shadow-lg shadow-orange-200 dark:shadow-none transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                     >
                       Gerar Lista & Imprimir
                     </button>
                     
                     <button 
                       onClick={() => { setPracticeMode(true); handleGenerate(); }}
                       disabled={totalQuestions === 0}
                       className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 hover:-translate-y-0.5 shadow-lg shadow-indigo-200 dark:shadow-none transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 disabled:transform-none"
                     >
                       <span>✏️</span> Iniciar Prática Interativa
                     </button>
                   </div>
                </div>
            </div>
        </div>
      </div>

      {/* PREVIEW MODAL */}
      {showPreview && (
          <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 border border-gray-200 dark:border-slate-800">
               <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white">{practiceMode ? 'Modo Prática Interativo' : `Preview: ${generatedList.length} Questões`}</h2>
                  <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-red-500 text-2xl leading-none transition-colors">&times;</button>
               </div>
               <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-slate-950">
                  <div className={`grid grid-cols-1 ${practiceMode ? '' : 'md:grid-cols-2'} gap-4`}>
                     {generatedList.map((ex, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow duration-200">
                           <div className="flex justify-between items-center mb-2">
                               <span className="font-bold text-sm text-gray-700 dark:text-gray-200">Q{i+1} - {getModeLabel(ex.mode)}</span>
                               <button onClick={() => regenerateExercise(i)} className="text-[10px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded border border-red-100 dark:border-red-900 transition active:scale-95 font-bold">Excluir e Refazer</button>
                           </div>
                           <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                               Dados: {ex.given.label1}={ex.given.val1}, {ex.given.label2}={ex.given.val2}
                               {ex.given.val3 && `, ${ex.given.label3}=${ex.given.val3}`}
                           </div>
                           <div className={`bg-gray-100 dark:bg-slate-800 rounded relative transition-all ${practiceMode ? 'h-64' : 'h-32'}`}>
                              <TriangleCanvas 
                                data={ex.solution} 
                                isDarkMode={isDarkMode} 
                                hideValues={practiceMode} 
                                padding={practiceMode ? 20 : 40}
                              />
                           </div>
                           
                           {practiceMode ? (
                              <div className="mt-3 space-y-2">
                                 <div className="text-[10px] uppercase font-bold text-gray-500">Suas Respostas:</div>
                                 <div className="grid grid-cols-3 gap-2">
                                    {['a', 'b', 'c'].map(f => {
                                       const k = `${i}-${f}`;
                                       const status = validationResults[k];
                                       const borderColor = status === true ? 'border-green-500' : status === false ? 'border-red-500' : 'border-gray-300 dark:border-slate-600';
                                       return (
                                          <input key={f} 
                                            placeholder={f} 
                                            className={`w-full p-1 text-xs border rounded bg-white dark:bg-slate-800 dark:text-white ${borderColor} transition-colors focus:ring-1 focus:ring-indigo-400`}
                                            value={userAnswers[k] || ''}
                                            onChange={e => handleAnswerChange(i, f, e.target.value)}
                                          />
                                       )
                                    })}
                                    {['A', 'B', 'C'].map(f => {
                                       const k = `${i}-${f}`;
                                       const status = validationResults[k];
                                       const borderColor = status === true ? 'border-green-500' : status === false ? 'border-red-500' : 'border-gray-300 dark:border-slate-600';
                                       return (
                                          <input key={f} 
                                            placeholder={`Âng ${f}`} 
                                            className={`w-full p-1 text-xs border rounded bg-white dark:bg-slate-800 dark:text-white ${borderColor} transition-colors focus:ring-1 focus:ring-indigo-400`}
                                            value={userAnswers[k] || ''}
                                            onChange={e => handleAnswerChange(i, f, e.target.value)}
                                          />
                                       )
                                    })}
                                 </div>
                                 <button onClick={() => checkAnswers(ex, i)} className="w-full py-1 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold rounded hover:bg-indigo-100 transition active:scale-95">Verificar</button>
                              </div>
                           ) : (
                              <div className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
                                 Resp: a={ex.solution.a}, b={ex.solution.b}, c={ex.solution.c}
                              </div>
                           )}
                        </div>
                     ))}
                  </div>
               </div>
               <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 rounded-b-xl">
                   <div className="flex gap-2">
                      {!practiceMode && (
                        <>
                           <button onClick={() => exportToCSV(generatedList)} className="px-3 py-2 text-xs border border-green-200 bg-green-50 text-green-700 rounded hover:bg-green-100 active:scale-95 transition font-bold shadow-sm">CSV</button>
                           <button onClick={() => exportToXLSX(generatedList)} className="px-3 py-2 text-xs border border-emerald-200 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 active:scale-95 transition font-bold shadow-sm">XLSX</button>
                        </>
                      )}
                   </div>
                   <div className="flex gap-3">
                       <button onClick={() => setShowPreview(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 text-sm font-bold hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition active:scale-95">Voltar</button>
                       {!practiceMode && (
                         <>
                           <button onClick={() => generateTrigoPDF(generatedList, false, pdfMode, itemsPerPage, includeSteps)} className="px-4 py-2 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-sm font-bold rounded hover:border-orange-400 hover:text-orange-600 transition active:scale-95 shadow-sm">📄 PDF Aluno</button>
                           <button onClick={() => generateTrigoPDF(generatedList, true, pdfMode, itemsPerPage, false)} className="px-4 py-2 bg-orange-500 text-white text-sm font-bold rounded hover:bg-orange-600 shadow-lg shadow-orange-200 dark:shadow-none transition active:scale-95 hover:-translate-y-0.5">🎓 PDF Professor</button>
                         </>
                       )}
                   </div>
               </div>
            </div>
          </div>
      )}

    </div>
  );
};

export default TrigoApp;