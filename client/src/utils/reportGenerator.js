import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const generateAureliusReport = (employees, analysis) => {
  const doc = jsPDF();
  const timestamp = new Date().toLocaleString();

  // 1. Header & Branding
  doc.setFillColor(15, 23, 42); // Deep blue theme
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('AURELIUS MANAGEMENT INTELLIGENCE', 20, 25);
  
  doc.setFontSize(10);
  doc.text(`Generated on: ${timestamp}`, 150, 32);

  // 2. Executive Summary
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.text('Executive Summary', 20, 55);
  
  doc.setFontSize(10);
  doc.text(`Total Headcount Analyzed: ${employees.length}`, 20, 65);
  doc.text(`Identified Risk Clusters: ${employees.filter(e => e.is_at_risk).length} Employees`, 20, 72);

  // 3. AI Analysis Section
  if (analysis) {
    doc.setFontSize(14);
    doc.text('Aurelius Strategic Analysis', 20, 85);
    doc.setFontSize(9);
    const splitText = doc.splitTextToSize(analysis, 170);
    doc.text(splitText, 20, 95);
  }

  // 4. Talent Table
  const tableData = employees.map(e => [
    e.full_name,
    e.role,
    e.department,
    e.sentiment_score.toString(),
    e.is_at_risk ? 'HIGH' : 'Stable'
  ]);

  doc.autoTable({
    startY: analysis ? 130 : 85,
    head: [['Name', 'Role', 'Department', 'Sentiment', 'Risk Status']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillStyle: [15, 23, 42] }
  });

  // 5. Save the PDF
  doc.save(`Aurelius_Management_Report_${Date.now()}.pdf`);
};
