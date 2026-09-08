import type { ParsedExcelWorkbook } from './excel';

export const exportToExcel = async (
  data: any[],
  fileName: string,
  sheetName: string = 'Sheet1'
): Promise<void> => {
  const excel = await import('./excel');
  excel.exportToExcel(data, fileName, sheetName);
};

export const parseExcelFile = async (file: File): Promise<ParsedExcelWorkbook> => {
  const excel = await import('./excel');
  return excel.parseExcelFile(file);
};

export const downloadProductTemplate = async (): Promise<void> => {
  const excel = await import('./excel');
  excel.downloadProductTemplate();
};

export const downloadSupplierTemplate = async (): Promise<void> => {
  const excel = await import('./excel');
  excel.downloadSupplierTemplate();
};

export const downloadCustomerTemplate = async (): Promise<void> => {
  const excel = await import('./excel');
  excel.downloadCustomerTemplate();
};

export const downloadInvoiceTemplate = async (): Promise<void> => {
  const excel = await import('./excel');
  excel.downloadInvoiceTemplate();
};

export const downloadCashbookTemplate = async (): Promise<void> => {
  const excel = await import('./excel');
  excel.downloadCashbookTemplate();
};
