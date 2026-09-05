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
  savedQrCode?: string; // Pre-saved confirmed QR code for instant zero-latency rendering
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
 * - Instantly displays the saved/confirmed QR code without any flicker or placeholder.
 * - Only queries the VietQR API when banking details are edited or when explicitly refreshed.
 * - Graceful fallback to local EMVCo QR only if network fails.
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
  savedQrCode = '',
}: UseVietQrOptions): UseVietQrReturn {
  const cleanAccount = (accountNumber || '').trim();
  const cleanBank = (bankId || 'ICB').trim();

  // Initial QR selection: custom static -> saved confirmed QR -> fallback VietQR URL
  const getInitialQr = () => {
    if (useCustomQr && customQrImage) return customQrImage;
    if (savedQrCode && !amount && !memo) return savedQrCode;
    if (cleanAccount) {
      return getVietQRUrl(cleanBank, cleanAccount, template, amount, memo, accountHolder);
    }
    return '';
  };

  const [qrUrl, setQrUrl] = useState<string>(getInitialQr);
  const [localDataUrl, setLocalDataUrl] = useState<string>('');
  const [isOnlineTemplate, setIsOnlineTemplate] = useState<boolean>(() => !useCustomQr && !!getInitialQr());
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [onlineUrl, setOnlineUrl] = useState<string>(() => {
    if (cleanAccount) {
      return getVietQRUrl(cleanBank, cleanAccount, template, amount, memo, accountHolder);
    }
    return '';
  });

  const probeImgRef = useRef<HTMLImageElement | null>(null);
  const probeTimerRef = useRef<NodeJS.Timeout | number | null>(null);
  const isFirstMountRef = useRef<boolean>(true);
  const lastParamsRef = useRef<string>('');

  const generate = useCallback(
    async (forceRegenerate: boolean = false): Promise<boolean> => {
      // 1. Custom static QR uploaded by user
      if (useCustomQr && customQrImage) {
        setQrUrl(customQrImage);
        setIsOnlineTemplate(false);
        setIsGenerating(false);
        return true;
      }

      // 2. Validate required account number
      if (!cleanAccount) {
        setQrUrl('');
        setLocalDataUrl('');
        setIsOnlineTemplate(false);
        setIsGenerating(false);
        return false;
      }

      // 3. If we already have a savedQrCode and this is initial mount without dynamic amount/memo, use it directly!
      const currentParamKey = `${cleanBank}|${cleanAccount}|${accountHolder}|${template}|${amount}|${memo}`;
      if (!forceRegenerate && isFirstMountRef.current) {
        isFirstMountRef.current = false;
        lastParamsRef.current = currentParamKey;
        if (savedQrCode && !amount && !memo) {
          setQrUrl(savedQrCode);
          setIsOnlineTemplate(true);
          setIsGenerating(false);
          return true;
        }
      }

      // If parameters didn't change and not forced, avoid redundant API call
      if (!forceRegenerate && lastParamsRef.current === currentParamKey && qrUrl) {
        return true;
      }
      lastParamsRef.current = currentParamKey;

      setIsGenerating(true);

      // Clean up previous image probe
      if (probeImgRef.current) {
        probeImgRef.current.onload = null;
        probeImgRef.current.onerror = null;
      }
      if (probeTimerRef.current) {
        clearTimeout(probeTimerRef.current as NodeJS.Timeout);
      }

      const ts = forceRegenerate ? Date.now() : undefined;
      const currentOnlineUrl = getVietQRUrl(
        cleanBank,
        cleanAccount,
        template,
        amount || 0,
        memo || '',
        accountHolder || '',
        ts
      );
      setOnlineUrl(currentOnlineUrl);

      // Probe image in background without flashing a raw offline QR code
      const probeImg = new Image();
      probeImgRef.current = probeImg;

      // Timeout fallback: if VietQR API takes longer than 2.5s, generate offline EMVCo QR
      probeTimerRef.current = setTimeout(async () => {
        setIsGenerating(false);
        try {
          const offlineUrl = await generateOfflineQrDataUrl(
            cleanBank,
            cleanAccount,
            amount || 0,
            memo || ''
          );
          setLocalDataUrl(offlineUrl);
          setQrUrl((curr) => curr || offlineUrl);
        } catch (e) {
          console.error('Failed to generate offline QR fallback:', e);
        }
      }, 2500);

      probeImg.onload = () => {
        if (probeTimerRef.current) {
          clearTimeout(probeTimerRef.current as NodeJS.Timeout);
        }
        setQrUrl(currentOnlineUrl);
        setIsOnlineTemplate(true);
        setIsGenerating(false);
      };

      probeImg.onerror = async () => {
        if (probeTimerRef.current) {
          clearTimeout(probeTimerRef.current as NodeJS.Timeout);
        }
        // Fallback to local offline EMVCo QR code
        try {
          const offlineUrl = await generateOfflineQrDataUrl(
            cleanBank,
            cleanAccount,
            amount || 0,
            memo || ''
          );
          setLocalDataUrl(offlineUrl);
          setQrUrl(offlineUrl);
        } catch (e) {
          console.error('Offline QR generation error:', e);
        }
        setIsOnlineTemplate(false);
        setIsGenerating(false);
      };

      probeImg.src = currentOnlineUrl;
      return true;
    },
    [cleanBank, cleanAccount, accountHolder, template, amount, memo, useCustomQr, customQrImage, savedQrCode, qrUrl]
  );

  // Trigger generation only when options change
  useEffect(() => {
    generate(false);
    return () => {
      if (probeTimerRef.current) {
        clearTimeout(probeTimerRef.current as NodeJS.Timeout);
      }
      if (probeImgRef.current) {
        probeImgRef.current.onload = null;
        probeImgRef.current.onerror = null;
      }
    };
  }, [cleanBank, cleanAccount, accountHolder, template, amount, memo, useCustomQr, customQrImage]);

  // Explicit user-triggered regeneration
  const regenerate = useCallback(async (): Promise<boolean> => {
    return generate(true);
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
