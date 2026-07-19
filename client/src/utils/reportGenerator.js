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

function exportPdf(employees = [], analysis = "") {
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleString();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text("AURELINX MANAGEMENT INTELLIGENCE", 20, 25);

  doc.setFontSize(10);
  doc.text(`Generated on: ${timestamp}`, 150, 32);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.text("Executive Summary", 20, 55);

  doc.setFontSize(10);
  doc.text(`Total Headcount Analyzed: ${employees.length}`, 20, 65);
  doc.text(
    `Identified Risk Clusters: ${employees.filter((e) => e.is_at_risk).length} Employees`,
    20,
    72,
  );

  if (analysis) {
    doc.setFontSize(14);
    doc.text("Aurelinx Strategic Analysis", 20, 85);
    doc.setFontSize(9);
    const splitText = doc.splitTextToSize(analysis, 170);
    doc.text(splitText, 20, 95);
  }

  const startY = analysis ? 130 : 85;
  autoTable(doc, {
    startY,
    head: [["Name", "Role", "Department", "Sentiment", "Risk Status"]],
    body: buildEmployeesTableRows(employees),
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
    },
    styles: {
      fontSize: 9,
      cellPadding: 2.2,
      overflow: "linebreak",
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
  });

  doc.save(`Aurelinx_Management_Report_${Date.now()}.pdf`);
}

function exportMarkdown(employees = [], analysis = "") {
  const timestamp = new Date().toLocaleString();
  const atRisk = employees.filter((e) => e.is_at_risk).length;

  const lines = [
    "# Aurelinx Management Intelligence Report",
    "",
    `Generated on: ${timestamp}`,
    "",
    "## Executive Summary",
    `- Total Headcount Analyzed: ${employees.length}`,
    `- Identified Risk Clusters: ${atRisk} Employees`,
    `- Risk Rate: ${employees.length ? ((atRisk / employees.length) * 100).toFixed(1) : "0.0"}%`,
  ];

  if (analysis) {
    lines.push("", "## Aurelinx Strategic Analysis", analysis.trim());
  }

  lines.push(
    "",
    "## Talent Table",
    "",
    "| Name | Role | Department | Sentiment | Risk Status |",
    "| --- | --- | --- | --- | --- |",
  );

  buildEmployeesTableRows(employees).forEach((row) => {
    lines.push(`| ${row.map(escapeMarkdownCell).join(" | ")} |`);
  });

  const blob = new Blob([lines.join("\n")], {
    type: "text/markdown;charset=utf-8",
  });
  downloadBlob(blob, `Aurelinx_Management_Report_${Date.now()}.md`);
}

function exportExcel(employees = [], analysis = "") {
  const workbook = XLSX.utils.book_new();
  const timestamp = new Date().toLocaleString();
  const atRisk = employees.filter((e) => e.is_at_risk).length;

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Aurelinx Management Intelligence Report"],
    ["Generated At", timestamp],
    ["Employees Analyzed", employees.length],
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

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  XLSX.utils.book_append_sheet(workbook, employeesSheet, "Employees");
  XLSX.writeFile(workbook, `Aurelinx_Management_Report_${Date.now()}.xlsx`);
}

export const generateAurelinxReport = (employees, analysis, format = "pdf") => {
  const normalizedFormat = String(format || "pdf").toLowerCase();

  if (normalizedFormat === "excel" || normalizedFormat === "xlsx") {
    exportExcel(employees || [], analysis || "");
    return;
  }

  if (normalizedFormat === "markdown" || normalizedFormat === "md") {
    exportMarkdown(employees || [], analysis || "");
    return;
  }

  exportPdf(employees || [], analysis || "");
};
