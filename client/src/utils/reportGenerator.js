import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function safeValue(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

async function loadReportLogo() {
  try {
    const response = await fetch("/aurelinx-logo-final-clean-transparent.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function escapeMarkdownCell(value) {
  return safeValue(value).replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
}

function buildEmployeesTableRows(employees = []) {
  return employees.map((employee) => [
    safeValue(employee.full_name),
    safeValue(employee.role),
    safeValue(employee.department),
    safeValue(employee.sentiment_score),
    employee.is_at_risk ? "HIGH" : "Stable",
  ]);
}

function buildCandidatesTableRows(candidates = []) {
  return candidates.map((candidate) => [
    safeValue(candidate.full_name),
    safeValue(candidate.role),
    safeValue(candidate.department),
    safeValue(candidate.sentiment_score),
    safeValue(candidate.match_score),
    safeValue(candidate.email),
  ]);
}

function normalizeReportData(input) {
  if (Array.isArray(input)) return { employees: input, candidates: [] };
  return { employees: input?.employees || [], candidates: input?.candidates || [] };
}

function drawLetterhead(doc, timestamp, section = "Management Intelligence", logo = null) {
  // Keep the cover header deliberately restrained: a deep enterprise navy,
  // one teal accent, and a transparent logo lockup. Avoid the pale blue
  // browser-like strip that made the previous export look unfinished.
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, 210, 297, "F");
  doc.setFillColor(8, 20, 36);
  doc.roundedRect(10, 7, 190, 30, 4, 4, "F");
  doc.setDrawColor(35, 89, 108);
  doc.setLineWidth(0.35);
  doc.roundedRect(10, 7, 190, 30, 4, 4, "S");
  if (logo) {
    try { doc.addImage(logo, "PNG", 16, 13, 16, 16, undefined, "FAST"); } catch { /* logo is optional if a browser blocks the asset */ }
  }
  doc.setTextColor(248, 250, 252);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("AURELINX", 38, 19);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(125, 211, 210);
  doc.text(section.toUpperCase(), 38, 26);
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated ${timestamp}`, 194, 19, { align: "right" });
  doc.setDrawColor(45, 212, 191);
  doc.setLineWidth(0.7);
  doc.line(16, 33, 194, 33);
}

function drawFooter(doc, pageNumber) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240);
  doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Aurelinx · Confidential management report", 15, pageHeight - 8);
  doc.text(`Page ${pageNumber}`, pageWidth - 15, pageHeight - 8, { align: "right" });
}

async function exportPdf(input = [], analysis = "") {
  const { employees, candidates } = normalizeReportData(input);
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleString();
  const logo = await loadReportLogo();

  drawLetterhead(doc, timestamp, "Management Intelligence", logo);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Executive Summary", 15, 45);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("Authoritative export of the selected Aurelinx records.", 15, 52);

  const metrics = [
    ["EMPLOYEES", employees.length],
    ["CANDIDATES", candidates.length],
    ["TOTAL PEOPLE", employees.length + candidates.length],
    ["AT-RISK EMPLOYEES", employees.filter((e) => e.is_at_risk).length],
  ];
  metrics.forEach(([label, value], index) => {
    const x = 15 + index * 45;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, 60, 40, 23, 2, 2, "F");
    doc.setFontSize(7); doc.setTextColor(100, 116, 139); doc.text(label, x + 3, 67);
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(15, 23, 42); doc.text(String(value), x + 3, 77);
    doc.setFont("helvetica", "normal");
  });

  if (analysis) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Strategic Analysis", 15, 97);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const splitText = doc.splitTextToSize(analysis, 170);
    doc.text(splitText, 15, 105);
  }

  const startY = analysis ? 128 : 97;
  const tablePage = (hookData) => {
    // The letterhead is a cover header on page one only. Continuation pages
    // retain clean table space and the audit footer without repeating it.
    drawFooter(doc, hookData.pageNumber);
  };
  autoTable(doc, {
    startY,
    head: [["Name", "Role", "Department", "Sentiment", "Risk Status"]],
    body: buildEmployeesTableRows(employees),
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: {
      fontSize: 9,
      cellPadding: 2.2,
      overflow: "linebreak",
    },
      alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    willDrawPage: tablePage,
  });

  doc.addPage();
  doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.text("Candidate Records", 15, 20);
  autoTable(doc, {
    startY: 28,
    head: [["Name", "Role", "Department", "Sentiment", "Match", "Email"]],
    body: buildCandidatesTableRows(candidates),
    theme: "grid",
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    styles: { fontSize: 7, cellPadding: 1.8, overflow: "linebreak" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    willDrawPage: (hookData) => { drawFooter(doc, hookData.pageNumber); },
  });

  for (let page = 1; page <= doc.getNumberOfPages(); page += 1) {
    doc.setPage(page);
    drawFooter(doc, page);
  }

  doc.save(`Aurelinx_Management_Report_${Date.now()}.pdf`);
}

function exportMarkdown(input = [], analysis = "") {
  const { employees, candidates } = normalizeReportData(input);
  const timestamp = new Date().toLocaleString();
  const atRisk = employees.filter((e) => e.is_at_risk).length;

  const lines = [
    "---",
    "title: Aurelinx Management Intelligence Report",
    `generated_at: ${new Date().toISOString()}`,
    "format: enterprise-data-export",
    "---",
    "",
    "# Aurelinx Management Intelligence Report",
    "",
    `> Generated on: ${timestamp}`,
    "",
    "## Executive Summary",
    "",
    "### Record Scope",
    `- Employees: ${employees.length}`,
    `- Candidates: ${candidates.length}`,
    `- Total People Records: ${employees.length + candidates.length}`,
    `- Identified Risk Clusters: ${atRisk} Employees`,
    `- Risk Rate: ${employees.length ? ((atRisk / employees.length) * 100).toFixed(1) : "0.0"}%`,
  ];

  if (analysis) {
    lines.push("", "## Strategic Analysis", "", analysis.trim());
  }

  lines.push(
    "",
    "## Employee Records",
    "",
    "| Name | Role | Department | Sentiment | Risk Status |",
    "|:---|:---|:---|---:|:---|",
  );

  buildEmployeesTableRows(employees).forEach((row) => {
    lines.push(`| ${row.map(escapeMarkdownCell).join(" | ")} |`);
  });

  lines.push(
    "",
    "## Candidate Records",
    "",
    "| Name | Role | Department | Sentiment | Match | Email |",
    "|:---|:---|:---|---:|---:|:---|",
  );
  buildCandidatesTableRows(candidates).forEach((row) => {
    lines.push(`| ${row.map(escapeMarkdownCell).join(" | ")} |`);
  });

  const blob = new Blob([lines.join("\n")], {
    type: "text/markdown;charset=utf-8",
  });
  downloadBlob(blob, `Aurelinx_Management_Report_${Date.now()}.md`);
}

function exportExcel(input = [], analysis = "") {
  const { employees, candidates } = normalizeReportData(input);
  const workbook = XLSX.utils.book_new();
  const timestamp = new Date().toLocaleString();
  const atRisk = employees.filter((e) => e.is_at_risk).length;

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Aurelinx Management Intelligence Report"],
    ["Generated At", timestamp],
    ["Employees", employees.length],
    ["Candidates", candidates.length],
    ["Total People Records", employees.length + candidates.length],
    ["At-Risk Employees", atRisk],
    [
      "Risk Rate",
      employees.length
        ? `${((atRisk / employees.length) * 100).toFixed(1)}%`
        : "0.0%",
    ],
    ["Executive Summary", analysis || "No narrative summary provided."],
  ]);

  const employeesSheet = XLSX.utils.json_to_sheet(
    employees.map((employee) => ({
      full_name: employee.full_name || "",
      role: employee.role || "",
      department: employee.department || "",
      sentiment_score: employee.sentiment_score ?? "",
      retention_prob: employee.retention_prob ?? "",
      is_at_risk: employee.is_at_risk ? "HIGH" : "Stable",
      email: employee.email || "",
    })),
  );
  const candidatesSheet = XLSX.utils.json_to_sheet(
    candidates.map((candidate) => ({
      full_name: candidate.full_name || "",
      email: candidate.email || "",
      role: candidate.role || "",
      department: candidate.department || "",
      sentiment_score: candidate.sentiment_score ?? "",
      match_score: candidate.match_score ?? "",
      application_date: candidate.application_date || "",
    })),
  );

  summarySheet["!cols"] = [{ wch: 28 }, { wch: 72 }];
  summarySheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  employeesSheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  employeesSheet["!autofilter"] = { ref: `A1:G${Math.max(1, employees.length + 1)}` };
  employeesSheet["!cols"] = [
    { wch: 28 }, { wch: 26 }, { wch: 26 }, { wch: 16 },
    { wch: 16 }, { wch: 16 }, { wch: 38 },
  ];
  candidatesSheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  candidatesSheet["!autofilter"] = { ref: `A1:G${Math.max(1, candidates.length + 1)}` };
  candidatesSheet["!cols"] = [
    { wch: 28 }, { wch: 38 }, { wch: 26 }, { wch: 26 },
    { wch: 16 }, { wch: 16 }, { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  XLSX.utils.book_append_sheet(workbook, employeesSheet, "Employees");
  XLSX.utils.book_append_sheet(workbook, candidatesSheet, "Candidates");
  XLSX.writeFile(workbook, `Aurelinx_Management_Report_${Date.now()}.xlsx`);
}

export const generateAurelinxReport = (data, analysis, format = "pdf") => {
  const normalizedFormat = String(format || "pdf").toLowerCase();

  if (normalizedFormat === "excel" || normalizedFormat === "xlsx") {
    exportExcel(data || [], analysis || "");
    return;
  }

  if (normalizedFormat === "markdown" || normalizedFormat === "md") {
    exportMarkdown(data || [], analysis || "");
    return;
  }

  exportPdf(data || [], analysis || "");
};
