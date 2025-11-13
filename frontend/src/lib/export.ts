/**
 * Export utility functions for CSV and PDF generation
 */

/**
 * Convert array of objects to CSV string
 */
export function arrayToCSV<T extends Record<string, unknown>>(
  data: T[],
  headers: { key: keyof T; label: string }[],
): string {
  if (data.length === 0) {
    return headers.map((h) => h.label).join(",");
  }

  const csvRows: string[] = [];

  // Add headers
  csvRows.push(headers.map((h) => escapeCSVValue(h.label)).join(","));

  // Add data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header.key];
      return escapeCSVValue(formatCSVValue(value));
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

/**
 * Escape CSV value (handles commas, quotes, newlines)
 */
function escapeCSVValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format value for CSV
 */
function formatCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return String(value);
}

/**
 * Download CSV file
 */
export function downloadCSV(
  csvContent: string,
  filename: string,
): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export class roster to CSV
 */
export function exportClassRoster(
  students: Array<{
    firstName: string;
    lastName: string;
    email: string;
  }>,
  className: string,
): void {
  const headers = [
    { key: "firstName" as const, label: "First Name" },
    { key: "lastName" as const, label: "Last Name" },
    { key: "email" as const, label: "Email" },
  ];

  const csv = arrayToCSV(students, headers);
  const filename = `${className.replace(/[^a-z0-9]/gi, "_")}_roster`;
  downloadCSV(csv, filename);
}

/**
 * Export quiz results to CSV
 */
export function exportQuizResults(
  responses: Array<{
    user: {
      firstName: string;
      lastName: string;
      email?: string;
    };
    score: number;
    submittedAt: string;
    attemptNumber?: number;
  }>,
  quizTitle: string,
): void {
  const headers = [
    { key: "studentName" as const, label: "Student Name" },
    { key: "email" as const, label: "Email" },
    { key: "score" as const, label: "Score (%)" },
    { key: "attemptNumber" as const, label: "Attempt" },
    { key: "submittedAt" as const, label: "Submitted At" },
  ];

  const data = responses.map((response) => ({
    studentName: `${response.user.firstName} ${response.user.lastName}`,
    email: response.user.email || "",
    score: Math.min(100, Math.round(Math.min(response.score, 1) * 100)),
    attemptNumber: response.attemptNumber || 1,
    submittedAt: new Date(response.submittedAt).toLocaleString(),
  }));

  const csv = arrayToCSV(data, headers);
  const filename = `${quizTitle.replace(/[^a-z0-9]/gi, "_")}_results`;
  downloadCSV(csv, filename);
}

/**
 * Print/PDF export using browser print functionality
 */
export function printToPDF(elementId: string, title: string): void {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    console.error("Failed to open print window");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #000;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          h1 {
            margin-bottom: 20px;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${element.innerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  
  // Wait for content to load before printing
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

