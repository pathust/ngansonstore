import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ScanBarcode,
  Search,
  AlertCircle,
  Upload,
  RefreshCw,
  Volume2,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useApp } from '../../context/AppContext';

interface MobileBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductScanned: (productId: string) => void;
}

export const MobileBarcodeScannerModal: React.FC<MobileBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onProductScanned,
}) => {
  const { products, showToast } = useApp();
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState<boolean>(true);
  const [isScanningActive, setIsScanningActive] = useState<boolean>(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerId = 'mobile-barcode-reader-viewport';

  // Play auditory beep when barcode is recognized
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(950, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio context might be restricted
    }
  };

  const handleScanSuccess = (rawCode: string) => {
    const trimmed = rawCode.trim();
    if (!trimmed) return;

    playBeep();

    // Match product in inventory
    const matchedProduct = products.find(
      (p) =>
        p.barcode === trimmed ||
        p.sku.toLowerCase() === trimmed.toLowerCase() ||
        p.name.toLowerCase().includes(trimmed.toLowerCase())
    );

    if (matchedProduct) {
      onProductScanned(matchedProduct.id);
      showToast(`Đã tìm thấy: ${matchedProduct.name}`, 'success');
      handleClose();
    } else {
      showToast(`Mã quét: ${trimmed} (Chưa có trong kho)`, 'warning');
      setBarcodeInput(trimmed);
    }
  };

  const startCamera = async () => {
    setIsStartingCamera(true);
    setCameraError(null);

    try {
      // Clean up previous instance if any
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          await scannerRef.current.clear();
        } catch {}
      }

      const html5QrCode = new Html5Qrcode(containerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        verbose: false,
      });

      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 160 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // Ignored non-match frame
        }
      );

      setIsStartingCamera(false);
      setIsScanningActive(true);
    } catch (err: unknown) {
      setIsStartingCamera(false);
      setIsScanningActive(false);
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[BarcodeScanner] Camera start failed:', msg);
      setCameraError('Không thể mở camera. Bạn có thể nhập mã vạch thủ công hoặc tải ảnh lên.');
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
      setIsScanningActive(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      // Delay slightly for DOM element to render
      const timer = setTimeout(() => {
        startCamera();
      }, 250);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Handle file photo scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast('Đang nhận diện mã từ ảnh...', 'info');
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(containerId);
      }
      const decodedText = await scannerRef.current.scanFile(file, true);
      handleScanSuccess(decodedText);
    } catch {
      showToast('Không tìm thấy mã vạch trong ảnh đã chọn!', 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/75 z-50 flex items-end animate-in fade-in"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Quét mã vạch sản phẩm"
    >
      <div
        className="bg-white rounded-t-3xl w-full max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0066FF] flex items-center justify-center">
              <ScanBarcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Quét mã vạch & QR</h3>
              <span className="text-xs text-slate-400 font-medium">Bằng camera trực tiếp hoặc nhập mã</span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all"
            aria-label="Đóng cửa sổ quét"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Section */}
        <div className="p-4 flex flex-col items-center gap-3 overflow-y-auto max-h-[calc(92vh-4rem)]">
          <div className="w-full h-56 bg-slate-950 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center border-2 border-slate-800 shadow-inner">
            {/* HTML5 QR Code Mount Node */}
            <div id={containerId} className="w-full h-full relative" />

            {/* Custom Overlay with laser animation when camera is active */}
            {isScanningActive && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-56 h-36 border-2 border-[#0066FF] rounded-xl relative shadow-[0_0_15px_rgba(0,102,255,0.4)]">
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white rounded-br" />
                  {/* Scanning beam */}
                  <div className="absolute inset-x-2 h-0.5 bg-red-500 shadow-[0_0_10px_#ff0000] animate-pulse top-1/2 -translate-y-1/2" />
                </div>
                <div className="flex items-center gap-1.5 mt-2 bg-black/60 px-3 py-1 rounded-full text-white/90 text-[11px] font-medium backdrop-blur-xs">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Hướng camera vào mã vạch</span>
                </div>
              </div>
            )}

            {/* Starting state */}
            {isStartingCamera && !cameraError && (
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-2 text-white">
                <RefreshCw className="w-6 h-6 text-[#0066FF] animate-spin" />
                <span className="text-xs text-slate-300 font-medium">Đang khởi động camera...</span>
              </div>
            )}

            {/* Camera error state */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-900/95 p-4 flex flex-col items-center justify-center text-center gap-2">
                <AlertCircle className="w-8 h-8 text-amber-400" />
                <span className="text-xs text-slate-200 font-semibold max-w-xs">{cameraError}</span>
                <button
                  onClick={startCamera}
                  className="mt-1 px-3 py-1.5 bg-[#0066FF] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Thử lại camera</span>
                </button>
              </div>
            )}
          </div>

          {/* Action Row: Re-check camera & Upload image */}
          <div className="w-full flex items-center justify-between px-1">
            <span className="text-xs text-slate-500 font-medium">Hoặc quét từ ảnh thư viện:</span>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg active:scale-95 transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#0066FF]" />
              <span>Tải ảnh mã vạch</span>
            </button>
          </div>

          {/* Manual input */}
          <div className="w-full flex items-center gap-2 mt-0.5">
            <div className="flex-1 flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2.5 border border-slate-200 focus-within:border-[#0066FF] focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleScanSuccess(barcodeInput);
                }}
                placeholder="Nhập mã vạch, SKU hoặc tên hàng..."
                className="bg-transparent border-none outline-none text-xs w-full text-slate-800"
                aria-label="Nhập mã vạch thủ công"
              />
            </div>
            <button
              onClick={() => handleScanSuccess(barcodeInput)}
              className="py-2.5 px-4 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white font-bold text-xs shadow-md active:scale-98 transition-all shrink-0 cursor-pointer"
            >
              Tìm & Thêm
            </button>
          </div>

          {/* Quick barcode list */}
          <div className="w-full flex flex-col gap-1.5 mt-1 border-t border-slate-100 pt-2.5">
            <span className="text-[11px] font-bold text-slate-500">Mã vạch mẫu trong kho để thử nhanh:</span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {products.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleScanSuccess(p.barcode || p.sku)}
                  className="py-1 px-2 rounded-lg bg-blue-50 text-[#0066FF] font-mono text-[11px] font-semibold border border-blue-100 hover:bg-blue-100 active:scale-95 transition-all text-left truncate max-w-[48%] cursor-pointer"
                  title={p.name}
                >
                  <span className="font-bold">{p.barcode || p.sku}</span>
                  <span className="text-slate-500 block truncate text-[10px]">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
