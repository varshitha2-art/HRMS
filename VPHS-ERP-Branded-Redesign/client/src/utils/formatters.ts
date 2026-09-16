import * as xlsx from 'xlsx';

export function formatCurrency(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr?: string | Date | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr?: string | Date | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimeOnly(timeStr?: string | null): string {
  if (!timeStr) return '-';
  // Check if ISO date string or HH:MM
  if (timeStr.includes('T')) {
    const d = new Date(timeStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  return timeStr;
}

export function formatTime24(timeStr?: string | null, defaultTime = '09:30'): string {
  if (!timeStr) return defaultTime;
  if (timeStr.includes('T')) {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return defaultTime;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }
  return defaultTime;
}

export function exportToExcel(data: any[], fileName = 'VPHS_Report', sheetName = 'Sheet1') {
  const worksheet = xlsx.utils.json_to_sheet(data);
  if (worksheet['!ref']) {
    worksheet['!autofilter'] = { ref: worksheet['!ref'] };
  }
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
  xlsx.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportToCsv(data: any[], fileName = 'VPHS_Export') {
  const worksheet = xlsx.utils.json_to_sheet(data);
  const csvOutput = xlsx.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Convert numbers into Words (Indian numbering system: Lakhs, Crores)
export function numberToWordsIndian(num: number): string {
  if (!num || isNaN(num)) return 'Zero Rupees Only';
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : ' ');
  }

  let n = Math.round(num);
  let str = '';
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = Math.floor(n / 100);
  const rest = n % 100;

  if (crore > 0) str += inWords(crore) + 'Crore ';
  if (lakh > 0) str += inWords(lakh) + 'Lakh ';
  if (thousand > 0) str += inWords(thousand) + 'Thousand ';
  if (hundred > 0) str += inWords(hundred) + 'Hundred ';
  if (rest > 0) str += (str !== '' ? 'and ' : '') + inWords(rest);

  return (str.trim() + ' Rupees Only');
}

export interface BankCmpRow {
  'Serial Number': number;
  'Beneficiary Account Number': string;
  'Beneficiary Name': string;
  'IFSC Code': string;
  'Transaction Amount': number;
  'Transaction Type (NEFT/RTGS)'?: 'NEFT' | 'RTGS';
  'Account Type (Savings/Current)': string;
  'Transaction Remarks / Purpose': string;
  'Beneficiary Mobile Number': string;
  'Beneficiary Email ID': string;
}

export function generateBankCmpData(
  payrollItems: any[],
  month?: number,
  year?: number,
  txMode: 'AUTO' | 'NEFT' | 'RTGS' = 'AUTO'
): BankCmpRow[] {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const m = month ? monthNames[month - 1] : monthNames[new Date().getMonth()];
  const y = year || new Date().getFullYear();
  const defaultRemarks = `Salary ${m} ${y}`;

  return (payrollItems || []).map((item, idx) => {
    const emp = item.employee || {};
    const accNo = emp.bankAccountNo || '999101000' + String(1000 + (idx + 1));
    const ifsc = (emp.bankIfsc || 'HDFC0000123').toUpperCase();
    const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || `Staff Member ${idx + 1}`;
    const amount = Number((item.netSalary || 0).toFixed(1));
    const mobile = emp.mobile || '9876543210';
    const email = emp.email || `${emp.firstName?.toLowerCase() || 'staff'}@example.com`;

    let resolvedTxType: 'NEFT' | 'RTGS' = 'NEFT';
    if (txMode === 'AUTO') {
      resolvedTxType = amount >= 200000 ? 'RTGS' : 'NEFT';
    } else {
      resolvedTxType = txMode;
    }

    return {
      'Serial Number': idx + 1,
      'Beneficiary Account Number': accNo,
      'Beneficiary Name': fullName,
      'IFSC Code': ifsc,
      'Transaction Amount': amount,
      'Transaction Type (NEFT/RTGS)': resolvedTxType,
      'Account Type (Savings/Current)': 'Savings',
      'Transaction Remarks / Purpose': defaultRemarks,
      'Beneficiary Mobile Number': mobile,
      'Beneficiary Email ID': email,
    };
  });
}

export function exportBankCmpCsv(
  rows: BankCmpRow[],
  fileName = 'bulk_salary_upload_template'
) {
  const hasTxType = rows.some(r => r['Transaction Type (NEFT/RTGS)']);
  const headers = [
    'Serial Number',
    'Beneficiary Account Number',
    'Beneficiary Name',
    'IFSC Code',
    'Transaction Amount',
    ...(hasTxType ? ['Transaction Type (NEFT/RTGS)'] : []),
    'Account Type (Savings/Current)',
    'Transaction Remarks / Purpose',
    'Beneficiary Mobile Number',
    'Beneficiary Email ID',
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [
    headers.join(','),
    ...rows.map(r => {
      const rowArr = [
        r['Serial Number'],
        escapeCsv(r['Beneficiary Account Number']),
        escapeCsv(r['Beneficiary Name']),
        escapeCsv(r['IFSC Code']),
        typeof r['Transaction Amount'] === 'number' ? r['Transaction Amount'].toFixed(1) : r['Transaction Amount'],
      ];
      if (hasTxType) {
        rowArr.push(escapeCsv(r['Transaction Type (NEFT/RTGS)'] || 'NEFT'));
      }
      rowArr.push(
        escapeCsv(r['Account Type (Savings/Current)']),
        escapeCsv(r['Transaction Remarks / Purpose']),
        escapeCsv(r['Beneficiary Mobile Number']),
        escapeCsv(r['Beneficiary Email ID'])
      );
      return rowArr.join(',');
    })
  ];

  const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportBankCmpExcel(
  rows: BankCmpRow[],
  fileName = 'bulk_salary_upload_template'
) {
  const ws = xlsx.utils.json_to_sheet(rows);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Bulk_Salary_Upload');
  xlsx.writeFile(wb, `${fileName}.xlsx`);
}

export function downloadSampleCmpTemplate() {
  const sampleRows: BankCmpRow[] = [
    {
      'Serial Number': 1,
      'Beneficiary Account Number': '9991010001234',
      'Beneficiary Name': 'Rahul Sharma',
      'IFSC Code': 'SBIN0004026',
      'Transaction Amount': 75200.0,
      'Account Type (Savings/Current)': 'Savings',
      'Transaction Remarks / Purpose': 'Salary Sep 2026',
      'Beneficiary Mobile Number': '9876543210',
      'Beneficiary Email ID': 'rahul@example.com',
    },
    {
      'Serial Number': 2,
      'Beneficiary Account Number': '9991010005678',
      'Beneficiary Name': 'Priya Patel',
      'IFSC Code': 'HDFC0000012',
      'Transaction Amount': 68450.0,
      'Account Type (Savings/Current)': 'Savings',
      'Transaction Remarks / Purpose': 'Salary Sep 2026',
      'Beneficiary Mobile Number': '9876543211',
      'Beneficiary Email ID': 'priya@example.com',
    },
    {
      'Serial Number': 3,
      'Beneficiary Account Number': '9991010009012',
      'Beneficiary Name': 'Amit Kumar',
      'IFSC Code': 'ICIC0000005',
      'Transaction Amount': 112300.0,
      'Account Type (Savings/Current)': 'Savings',
      'Transaction Remarks / Purpose': 'Salary Sep 2026',
      'Beneficiary Mobile Number': '9876543212',
      'Beneficiary Email ID': 'amit@example.com',
    },
  ];

  exportBankCmpCsv(sampleRows, 'bulk_salary_upload_template');
}


