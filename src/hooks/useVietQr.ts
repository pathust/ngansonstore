import { useState, useEffect, useRef, useCallback } from 'react';
import { getVietQRUrl } from '../utils/formatters';
import { generateOfflineQrDataUrl } from '../utils/vietqr';

export interface UseVietQrOptions {
  bankId: string;
  accountNumber: string;
  accountHolder?: string;
  template?: 'compact2' | 'compact' | 'qr_only' | 'print';
  amount?: number;
  memo?: string;
  useCustomQr?: boolean;
  customQrImage?: string;
}

export interface UseVietQrReturn {
  qrUrl: string;
  isGenerating: boolean;
  isOnlineTemplate: boolean;
  localDataUrl: string;
  onlineUrl: string;
  regenerate: () => Promise<boolean>;
  downloadQr: (filename?: string) => Promise<void>;
  copyQrLink: () => Promise<boolean>;
}

/**
 * High-performance hook for VietQR code generation.
 * Guarantees zero blank screen by immediately generating a local EMVCo QR code
 * in ~5ms, then seamlessly upgrading to the official VietQR.io branded template
 * if an internet connection is available.
 */
export function useVietQr({
  bankId,
  accountNumber,
  accountHolder = '',
  template = 'compact2',
  amount = 0,
  memo = '',
  useCustomQr = false,
  customQrImage = '',
}: UseVietQrOptions): UseVietQrReturn {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [localDataUrl, setLocalDataUrl] = useState<string>('');
  const [isOnlineTemplate, setIsOnlineTemplate] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [onlineUrl, setOnlineUrl] = useState<string>('');

  const probeImgRef = useRef<HTMLImageElement | null>(null);
  const probeTimerRef = useRef<NodeJS.Timeout | number | null>(null);

  const generate = useCallback(
    async (customTs?: number): Promise<boolean> => {
      // 1. Custom static QR uploaded by user
      if (useCustomQr && customQrImage) {
        setQrUrl(customQrImage);
        setIsOnlineTemplate(false);
        setIsGenerating(false);
        return true;
      }

      // 2. Validate required account number
      const cleanAccount = (accountNumber || '').trim();
      if (!cleanAccount) {
        setQrUrl('');
        setLocalDataUrl('');
        setIsOnlineTemplate(false);
        setIsGenerating(false);
        return false;
      }

      setIsGenerating(true);

      // 3. STEP 1: IMMEDIATELY generate local EMVCo QR code (pure JS, 0 network dependency)
      let offlineUrl = '';
      try {
        offlineUrl = await generateOfflineQrDataUrl(
          bankId || 'MB',
          cleanAccount,
          amount || 0,
          memo || ''
        );
        setLocalDataUrl(offlineUrl);
        // Show immediately so user never sees a blank space
        setQrUrl(offlineUrl);
      } catch (err) {
        console.error('Error generating offline EMVCo QR:', err);
      }

      // 4. STEP 2: Probe online VietQR template in background
      if (probeImgRef.current) {
        probeImgRef.current.onload = null;
        probeImgRef.current.onerror = null;
      }
      if (probeTimerRef.current) {
        clearTimeout(probeTimerRef.current as NodeJS.Timeout);
      }

      const ts = customTs || Date.now();
      const currentOnlineUrl = getVietQRUrl(
        bankId || 'MB',
        cleanAccount,
        template,
        amount || 0,
        memo || '',
        accountHolder || '',
        ts
      );
      setOnlineUrl(currentOnlineUrl);

      const probeImg = new Image();
      probeImgRef.current = probeImg;

      // Fast 1.5s timeout in case of offline emulator or slow network
      probeTimerRef.current = setTimeout(() => {
        setIsGenerating(false);
        if (offlineUrl) {
          setQrUrl((curr) => curr || offlineUrl);
        }
      }, 1500);

      probeImg.onload = () => {
        if (probeTimerRef.current) {
          clearTimeout(probeTimerRef.current as NodeJS.Timeout);
        }
        setQrUrl(currentOnlineUrl);
        setIsOnlineTemplate(true);
        setIsGenerating(false);
      };

      probeImg.onerror = () => {
        if (probeTimerRef.current) {
          clearTimeout(probeTimerRef.current as NodeJS.Timeout);
        }
        // Fallback to local offline QR
        if (offlineUrl) {
          setQrUrl(offlineUrl);
        }
        setIsOnlineTemplate(false);
        setIsGenerating(false);
      };

      probeImg.src = currentOnlineUrl;
      return true;
    },
    [bankId, accountNumber, accountHolder, template, amount, memo, useCustomQr, customQrImage]
  );

  // Re-generate when parameters change
  useEffect(() => {
    generate();
    return () => {
      if (probeTimerRef.current) {
        clearTimeout(probeTimerRef.current as NodeJS.Timeout);
      }
      if (probeImgRef.current) {
        probeImgRef.current.onload = null;
        probeImgRef.current.onerror = null;
      }
    };
  }, [generate]);

  // Explicit user-triggered regeneration
  const regenerate = useCallback(async (): Promise<boolean> => {
    return generate(Date.now());
  }, [generate]);

  // Cross-browser download helper
  const downloadQr = useCallback(
    async (filename?: string): Promise<void> => {
      const finalName =
        filename || `VietQR_${bankId || 'MB'}_${accountNumber || 'store'}.png`;

      // If data URL or custom image
      if (qrUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = qrUrl;
        link.download = finalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // If online URL, attempt blob fetch to bypass cross-origin download restrictions
      try {
        const res = await fetch(qrUrl, { mode: 'cors' });
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = finalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } catch {
        // Fallback to local data URL if online fetch is blocked by CORS
        if (localDataUrl) {
          const link = document.createElement('a');
          link.href = localDataUrl;
          link.download = finalName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          window.open(qrUrl, '_blank');
        }
      }
    },
    [qrUrl, localDataUrl, bankId, accountNumber]
  );

  // Copy VietQR link
  const copyQrLink = useCallback(async (): Promise<boolean> => {
    const textToCopy = onlineUrl || qrUrl;
    if (!textToCopy) return false;
    try {
      await navigator.clipboard.writeText(textToCopy);
      return true;
    } catch {
      return false;
    }
  }, [onlineUrl, qrUrl]);

  return {
    qrUrl,
    isGenerating,
    isOnlineTemplate,
    localDataUrl,
    onlineUrl,
    regenerate,
    downloadQr,
    copyQrLink,
  };
}
