import * as XLSX from 'xlsx';
import { TrigoExercise } from '../types';

export const exportToCSV = (exercises: TrigoExercise[]) => {
  const headers = ['ID', 'Modo', 'Lado a', 'Lado b', 'Lado c', 'Angulo A', 'Angulo B', 'Angulo C', 'Area', 'Perimetro'];
  
  const rows = exercises.map(ex => [
    ex.id,
    ex.mode,
    ex.solution.a.toString().replace('.', ','),
    ex.solution.b.toString().replace('.', ','),
    ex.solution.c.toString().replace('.', ','),
    ex.solution.A.toString().replace('.', ','),
    ex.solution.B.toString().replace('.', ','),
    ex.solution.C.toString().replace('.', ','),
    ex.solution.area.toString().replace('.', ','),
    ex.solution.perimeter.toString().replace('.', ',')
  ]);

  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.join(';'))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'TrigoMestre_Export.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToXLSX = (exercises: TrigoExercise[]) => {
  const data = exercises.map(ex => ({
    ID: ex.id,
    Modo: ex.mode,
    'Lado a': ex.solution.a,
    'Lado b': ex.solution.b,
    'Lado c': ex.solution.c,
    'Angulo A': ex.solution.A,
    'Angulo B': ex.solution.B,
    'Angulo C': ex.solution.C,
    'Area': ex.solution.area,
    'Perimetro': ex.solution.perimeter
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Exercícios");
  XLSX.writeFile(workbook, "TrigoMestre_Export.xlsx");
};