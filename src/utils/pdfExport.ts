import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Order } from '../types';
import { formatCurrency, formatDateTime, numberToVietnameseWords, getVietQRUrl } from './formatters';

/** Escape HTML entities to prevent XSS when injecting user data into innerHTML */
const escapeHtml = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

export interface PdfExportOptions {
  format?: 'K80' | 'A4';
  filename?: string;
  autoPrint?: boolean;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeTaxCode?: string;
  storeSlogan?: string;
  storeWifi?: string;
  footerNote?: string;
  bankId?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  showQr?: boolean;
  customQrImage?: string;
  savedQrCode?: string;
}

/**
 * Generate and download/print high quality PDF invoice for any Order
 */
export const exportInvoiceToPdf = async (
  order: Order,
  options: PdfExportOptions = {}
): Promise<void> => {
  const format = options.format || 'K80';
  const storeName = options.storeName || 'CỬA HÀNG ĐIỆN NƯỚC & KIM KHÍ NGÂN SƠN';
  const storeAddress = options.storeAddress || '318 Vũ Quang, TP. Hà Tĩnh';
  const storePhone = options.storePhone || '0912.345.678';
  const storeTaxCode = options.storeTaxCode;
  const storeSlogan = options.storeSlogan;
  const storeWifi = options.storeWifi;
  const footerNote = options.footerNote || 'Cảm ơn Quý khách & Hẹn gặp lại!';
  const bankId = options.bankId || 'ICB';
  const bankName = options.bankName || 'VietinBank';
  const accountNumber = options.accountNumber || '106877069794';
  const accountHolder = options.accountHolder || 'PHAN ANH TAI';
  const showQr = options.showQr !== undefined ? options.showQr : true;
  const filename = options.filename || `HoaDon_${order.code}_NganSon.pdf`;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.zIndex = '-9999';
  container.style.backgroundColor = '#ffffff';

  const qrUrl = options.customQrImage
    ? options.customQrImage
    : order.final_amount > 0
    ? getVietQRUrl(bankId, accountNumber, 'compact2', order.final_amount, `NGANSON ${order.code}`, accountHolder)
    : (options.savedQrCode || getVietQRUrl(bankId, accountNumber, 'compact2', 0, `NGANSON ${order.code}`, accountHolder));

  const wordsAmount = numberToVietnameseWords(order.final_amount);
  const paymentMethodLabel =
    order.payment_method === 'CASH'
      ? 'Tiền mặt'
      : order.payment_method === 'TRANSFER'
      ? 'Chuyển khoản VietQR'
      : 'Thẻ ngân hàng (POS)';

  if (format === 'K80') {
    // 80mm Thermal Receipt template
    container.style.width = '350px';
    container.style.padding = '16px';
    container.style.fontFamily = "'Courier New', Courier, monospace, sans-serif";
    container.style.color = '#111827';
    container.style.fontSize = '12px';
    container.style.lineHeight = '1.4';

    container.innerHTML = `
      <div style="text-align: center; border-bottom: 1px dashed #9ca3af; padding-bottom: 10px; margin-bottom: 10px;">
        <div style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${storeName}</div>
        ${storeSlogan ? `<div style="font-size: 10px; color: #6b7280; font-style: italic; margin-top: 2px;">${storeSlogan}</div>` : ''}
        <div style="font-size: 11px; margin-top: 3px;">${storeAddress}</div>
        <div style="font-size: 11px;">Hotline: ${storePhone}</div>
        ${storeTaxCode ? `<div style="font-size: 10px; color: #4b5563;">MST: ${storeTaxCode}</div>` : ''}
        <div style="margin-top: 8px; font-size: 13px; font-weight: 800; text-transform: uppercase;">HÓA ĐƠN BÁN HÀNG</div>
        <div style="font-size: 12px; font-weight: 700; color: #1d4ed8; margin-top: 2px;">${order.code}</div>
      </div>

      <div style="font-size: 11px; border-bottom: 1px dashed #9ca3af; padding-bottom: 8px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
          <span style="color: #6b7280;">Ngày lập:</span>
          <span style="font-weight: 600;">${formatDateTime(order.created_at)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
          <span style="color: #6b7280;">Thu ngân:</span>
          <span>${escapeHtml(order.cashier || 'Phan Minh')}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
          <span style="color: #6b7280;">Khách hàng:</span>
          <span style="font-weight: 600;">${escapeHtml(order.customer_name || 'Khách lẻ')}</span>
        </div>
        ${
          order.phone
            ? `<div style="display: flex; justify-content: space-between;">
                <span style="color: #6b7280;">Điện thoại:</span>
                <span>${escapeHtml(order.phone)}</span>
              </div>`
            : ''
        }
      </div>

      <div style="border-bottom: 1px dashed #9ca3af; padding-bottom: 8px; margin-bottom: 8px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="border-bottom: 1px solid #e5e7eb; font-weight: 700; text-transform: uppercase; font-size: 10px; color: #4b5563;">
              <th style="text-align: left; padding: 4px 0;">Mặt hàng</th>
              <th style="text-align: center; padding: 4px 2px; width: 35px;">SL</th>
              <th style="text-align: right; padding: 4px 0; width: 80px;">T.Tiền</th>
            </tr>
          </thead>
          <tbody>
            ${order.items
              .map(
                (item) => `
              <tr style="border-bottom: 1px dotted #f3f4f6;">
                <td style="padding: 5px 0; vertical-align: top;">
                  <div style="font-weight: 600; color: #111827;">${item.name}</div>
                  <div style="font-size: 10px; color: #6b7280;">${item.quantity} ${item.unit} x ${formatCurrency(item.price)}</div>
                </td>
                <td style="text-align: center; padding: 5px 2px; vertical-align: top; font-weight: 700;">${item.quantity}</td>
                <td style="text-align: right; padding: 5px 0; vertical-align: top; font-weight: 700; color: #111827;">${formatCurrency(item.quantity * item.price)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>

      <div style="font-size: 11px; border-bottom: 1px dashed #9ca3af; padding-bottom: 8px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #4b5563;">Tổng tiền hàng:</span>
          <span>${formatCurrency(order.total)}</span>
        </div>
        ${
          order.discount > 0
            ? `<div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #059669;">
                <span>Chiết khấu:</span>
                <span>-${formatCurrency(order.discount)}</span>
              </div>`
            : ''
        }
        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 800; color: #1e3a8a; border-top: 1px solid #e5e7eb; padding-top: 5px; margin-top: 4px;">
          <span>KHÁCH CẦN TRẢ:</span>
          <span>${formatCurrency(order.final_amount)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 10px; color: #6b7280;">
          <span>Phương thức:</span>
          <span style="font-weight: 600; color: #374151;">${paymentMethodLabel}</span>
        </div>
      </div>

      ${
        showQr
          ? `<div style="text-align: center; padding-top: 6px;">
              <div style="font-size: 10px; color: #4b5563; margin-bottom: 4px;">Mã tra cứu & Thanh toán VietQR:</div>
              <img src="${qrUrl}" style="width: 105px; height: 105px; display: inline-block; border: 1px solid #e5e7eb; padding: 3px; background: #fff; border-radius: 4px;" alt="QR" />
              <div style="font-size: 9px; color: #374151; font-weight: 700; margin-top: 3px;">${bankName} • ${accountNumber}</div>
            </div>`
          : ''
      }

      ${storeWifi ? `<div style="text-align: center; font-size: 10px; color: #4b5563; margin-top: 6px; background: #f8fafc; padding: 3px; border-radius: 4px;">Wifi: ${storeWifi}</div>` : ''}

      <div style="text-align: center; margin-top: 8px; font-size: 10px; font-style: italic; color: #4b5563;">
        ${footerNote}
      </div>
      <div style="text-align: center; font-size: 8.5px; color: #9ca3af; margin-top: 4px;">
        Hệ thống Quản lý Bán hàng Cửa hàng Ngân Sơn - 318 Vũ Quang
      </div>
    `;
  } else {
    // A4 Standard Corporate Invoice
    container.style.width = '794px';
    container.style.padding = '36px 40px';
    container.style.fontFamily = "'Inter', 'Segoe UI', Arial, sans-serif";
    container.style.color = '#0f172a';
    container.style.fontSize = '12px';
    container.style.lineHeight = '1.5';

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 18px; margin-bottom: 20px;">
        <div>
          <div style="font-size: 18px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px;">${storeName}</div>
          ${storeSlogan ? `<div style="font-size: 11px; color: #64748b; font-style: italic; margin-top: 2px;">${storeSlogan}</div>` : ''}
          <div style="font-size: 12px; color: #475569; margin-top: 4px;">Địa chỉ: <strong>${storeAddress}</strong></div>
          <div style="font-size: 12px; color: #475569;">Hotline / Zalo: <strong>${storePhone}</strong></div>
          ${storeTaxCode ? `<div style="font-size: 12px; color: #475569;">Mã số thuế: <strong>${storeTaxCode}</strong></div>` : ''}
          ${storeWifi ? `<div style="font-size: 11px; color: #64748b;">Wifi: ${storeWifi}</div>` : ''}
        </div>
        <div style="text-align: right;">
          <div style="font-size: 20px; font-weight: 900; color: #2563eb; text-transform: uppercase;">HÓA ĐƠN BÁN HÀNG</div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 4px;">Số HĐ: <span style="color: #2563eb;">${order.code}</span></div>
          <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">Ngày tạo: ${formatDateTime(order.created_at)}</div>
        </div>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
        <div style="font-size: 12px; font-weight: 700; color: #1e293b; text-transform: uppercase; margin-bottom: 8px;">Thông tin khách hàng</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
          <div><span style="color: #64748b;">Khách hàng:</span> <strong style="color: #0f172a;">${escapeHtml(order.customer_name || 'Khách lẻ')}</strong></div>
          <div><span style="color: #64748b;">Điện thoại:</span> <strong>${escapeHtml(order.phone || 'Chưa cập nhật')}</strong></div>
          <div><span style="color: #64748b;">Thu ngân / Nhân viên:</span> <strong>${escapeHtml(order.cashier || 'Phan Minh')}</strong></div>
          <div><span style="color: #64748b;">Hình thức thanh toán:</span> <strong>${paymentMethodLabel}</strong></div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11.5px;">
        <thead>
          <tr style="background-color: #1e40af; color: #ffffff; text-transform: uppercase; font-size: 10.5px; font-weight: 700;">
            <th style="padding: 10px 12px; text-align: center; width: 40px; border: 1px solid #1e40af;">STT</th>
            <th style="padding: 10px 12px; text-align: left; width: 100px; border: 1px solid #1e40af;">Mã SKU</th>
            <th style="padding: 10px 12px; text-align: left; border: 1px solid #1e40af;">Tên hàng hóa / Dịch vụ</th>
            <th style="padding: 10px 12px; text-align: center; width: 65px; border: 1px solid #1e40af;">ĐVT</th>
            <th style="padding: 10px 12px; text-align: center; width: 60px; border: 1px solid #1e40af;">SL</th>
            <th style="padding: 10px 12px; text-align: right; width: 110px; border: 1px solid #1e40af;">Đơn giá</th>
            <th style="padding: 10px 12px; text-align: right; width: 120px; border: 1px solid #1e40af;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          ${order.items
            .map(
              (item, idx) => `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: center; font-weight: 600;">${idx + 1}</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: 600; color: #334155;">${item.sku}</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">${item.name}</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: center; color: #475569;">${item.unit}</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: center; font-weight: 700;">${item.quantity}</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: right; color: #334155;">${formatCurrency(item.price)}</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #0f172a;">${formatCurrency(item.quantity * item.price)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
        ${
          showQr
            ? `<div style="width: 45%; display: flex; align-items: center; gap: 14px; background-color: #f1f5f9; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <img src="${qrUrl}" style="width: 88px; height: 88px; border: 1px solid #cbd5e1; background: #fff; padding: 4px; border-radius: 6px;" alt="VietQR" />
                <div style="font-size: 11px; color: #475569;">
                  <div style="font-weight: 800; color: #1e293b; font-size: 12px;">MÃ THANH TOÁN VIETQR</div>
                  <div style="color: #64748b; font-size: 10.5px;">Quét thanh toán tự động 24/7</div>
                  <div style="margin-top: 4px; font-weight: 700; color: #1e40af;">${bankName}</div>
                  <div style="font-family: monospace; font-weight: 800; color: #2563eb; font-size: 12px;">${accountNumber}</div>
                  <div style="font-size: 10px; color: #334155; font-weight: 700; text-transform: uppercase;">${accountHolder}</div>
                </div>
              </div>`
            : `<div style="width: 45%;"></div>`
        }

        <div style="width: 48%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; background-color: #ffffff;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: #475569;">Tổng tiền hàng:</span>
            <span style="font-weight: 600;">${formatCurrency(order.total)}</span>
          </div>
          ${
            order.discount > 0
              ? `<div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #16a34a;">
                  <span>Giảm giá / Chiết khấu:</span>
                  <span style="font-weight: 600;">-${formatCurrency(order.discount)}</span>
                </div>`
              : ''
          }
          <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 2px solid #e2e8f0; font-size: 15px; font-weight: 800;">
            <span style="color: #0f172a;">TỔNG CỘNG THANH TOÁN:</span>
            <span style="color: #2563eb;">${formatCurrency(order.final_amount)}</span>
          </div>
          <div style="margin-top: 8px; font-size: 11.5px; font-style: italic; color: #64748b;">
            Số tiền viết bằng chữ: <strong>${wordsAmount}</strong>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; text-align: center; margin-top: 30px; padding-top: 10px;">
        <div>
          <div style="font-weight: 700; color: #0f172a; text-transform: uppercase; font-size: 12px;">Người mua hàng</div>
          <div style="font-size: 11px; color: #64748b; font-style: italic;">(Ký, ghi rõ họ tên)</div>
          <div style="height: 60px;"></div>
          <div style="font-weight: 600; color: #334155;">${order.customer_name || 'Khách lẻ'}</div>
        </div>
        <div>
          <div style="font-weight: 700; color: #0f172a; text-transform: uppercase; font-size: 12px;">Người lập hóa đơn / Thủ kho</div>
          <div style="font-size: 11px; color: #64748b; font-style: italic;">(Ký, đóng dấu họ tên)</div>
          <div style="height: 60px;"></div>
          <div style="font-weight: 700; color: #1e40af;">${order.cashier || 'Phan Minh'}</div>
        </div>
      </div>

      <div style="text-align: center; margin-top: 30px; font-size: 11px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 12px;">
        ${footerNote} • Hóa đơn điện tử khởi tạo từ hệ thống Quản lý Bán hàng Cửa hàng Ngân Sơn - 318 Vũ Quang
      </div>
    `;
  }

  document.body.appendChild(container);

  try {
    // Wait for any images inside container to load (or time out)
    const images = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve(); // continue even if image fails
            setTimeout(resolve, 800); // 800ms timeout max
          })
      )
    );

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    let doc: jsPDF;
    if (format === 'K80') {
      const pdfWidth = 80;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, Math.max(120, pdfHeight + 6)],
      });
      doc.addImage(imgData, 'JPEG', 0, 2, pdfWidth, pdfHeight);
    } else {
      doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 16;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const usablePageHeight = pageHeight - 16;

      if (imgHeight <= usablePageHeight) {
        doc.addImage(imgData, 'JPEG', 8, 8, imgWidth, imgHeight);
      } else {
        // Multi-page slicing for long invoices
        let heightLeft = imgHeight;
        let position = 8;

        doc.addImage(imgData, 'JPEG', 8, position, imgWidth, imgHeight);
        heightLeft -= usablePageHeight;

        while (heightLeft > 0) {
          position -= usablePageHeight;
          doc.addPage();
          doc.addImage(imgData, 'JPEG', 8, position, imgWidth, imgHeight);
          heightLeft -= usablePageHeight;
        }
      }
    }

    if (options.autoPrint) {
      try {
        doc.autoPrint();
        const blobUrl = doc.output('bloburl');
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = 'none';
        iframe.src = blobUrl.toString();
        document.body.appendChild(iframe);
        setTimeout(() => {
          try {
            iframe.contentWindow?.print();
          } catch (e) {
            console.warn('Auto print not supported in this frame environment:', e);
          } finally {
            try {
              if (iframe.parentNode) {
                document.body.removeChild(iframe);
              }
            } catch {}
          }
        }, 500);
      } catch (printErr) {
        console.warn('Auto print error:', printErr);
      }
    }

    doc.save(filename);
  } finally {
    try {
      if (container.parentNode) {
        document.body.removeChild(container);
      }
    } catch {}
  }
};

/**
 * Export an existing DOM element (e.g. thermal receipt view) to PDF
 */
export const exportElementToPdf = async (
  element: HTMLElement,
  filename: string = 'HoaDon_NganSon.pdf',
  autoPrint: boolean = false
): Promise<void> => {
  const canvas = await html2canvas(element, {
    scale: 2.5,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.98);
  const pdfWidth = 80;
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pdfWidth, Math.max(100, pdfHeight + 4)],
  });

  doc.addImage(imgData, 'JPEG', 0, 2, pdfWidth, pdfHeight);

  if (autoPrint) {
    doc.autoPrint();
  }

  doc.save(filename);
};
