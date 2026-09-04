import QRCode from 'qrcode';
import { VIETNAMESE_BANKS } from '../data/bankList';

/**
 * CRC16-CCITT for EMVCo standard
 */
function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatEmvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Generate standard VietQR EMVCo string for banking apps
 */
export function generateVietQREMVCo(
  bankCodeOrBin: string,
  accountNo: string,
  amount: number = 0,
  memo: string = ''
): string {
  const cleanAccount = accountNo.replace(/[^a-zA-Z0-9]/g, '');
  const bank = VIETNAMESE_BANKS.find(
    (b) => b.code.toUpperCase() === bankCodeOrBin.toUpperCase() || b.bin === bankCodeOrBin
  );
  const bin = bank ? bank.bin : bankCodeOrBin;

  // Subfield 00: GUID
  const sub00 = formatEmvField('00', 'A000000727');
  // Subfield 01: Beneficiary Bank & Account
  const sub01_bank = formatEmvField('00', bin);
  const sub01_acc = formatEmvField('01', cleanAccount);
  const sub01 = formatEmvField('01', `${sub01_bank}${sub01_acc}`);
  // Subfield 02: Service Code
  const sub02 = formatEmvField('02', 'QRIBFTTA');
  // Field 38
  const field38 = formatEmvField('38', `${sub00}${sub01}${sub02}`);

  // Field 00: Payload Format Indicator
  const field00 = formatEmvField('00', '01');
  // Field 01: Point of Initiation Method (12 = Dynamic, 11 = Static)
  const field01 = formatEmvField('01', amount > 0 ? '12' : '11');
  // Field 53: Currency Code (704 = VND)
  const field53 = formatEmvField('53', '704');
  // Field 54: Amount
  const field54 = amount > 0 ? formatEmvField('54', String(Math.round(amount))) : '';
  // Field 58: Country Code
  const field58 = formatEmvField('58', 'VN');

  // Field 62: Additional Data (memo)
  let field62 = '';
  const cleanMemo = memo.replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
  if (cleanMemo) {
    const sub08 = formatEmvField('08', cleanMemo);
    field62 = formatEmvField('62', sub08);
  }

  const rawData = `${field00}${field01}${field38}${field53}${field54}${field58}${field62}6304`;
  const checksum = crc16(rawData);
  return `${rawData}${checksum}`;
}

/**
 * Generate Offline DataURL for VietQR
 */
export async function generateOfflineQrDataUrl(
  bankCodeOrBin: string,
  accountNo: string,
  amount: number = 0,
  memo: string = ''
): Promise<string> {
  const payload = generateVietQREMVCo(bankCodeOrBin, accountNo, amount, memo);
  return QRCode.toDataURL(payload, {
    width: 350,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
}
