import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToExcel = (data: any[], filename: string) => {
  if (!data || data.length === 0) return;
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Submissions");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportToPDF = (data: any[], columns: { header: string, dataKey: string }[], filename: string) => {
  if (!data || data.length === 0) return;
  const doc = new jsPDF('landscape');
  const rows = data.map(item => columns.map(col => String(item[col.dataKey] || '')));
  
  autoTable(doc, {
    head: [columns.map(col => col.header)],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [10, 17, 40] } // Brand navy
  });
  
  doc.save(`${filename}.pdf`);
};
