/**
 * Image processing utilities for client-side avatar and photo handling
 * Provides automatic center square cropping and canvas-based compression
 */

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates whether the uploaded file is a valid image under the size limit
 */
export function validateImageFile(file: File, maxSizeBytes = 10 * 1024 * 1024): ImageValidationResult {
  if (!file) {
    return { valid: false, error: 'Không tìm thấy tệp tin!' };
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif', 'image/bmp'];
  if (!validTypes.includes(file.type.toLowerCase()) && !file.type.startsWith('image/')) {
    return {
      valid: false,
      error: 'Định dạng tệp không được hỗ trợ! Vui lòng chọn ảnh JPG, PNG, WEBP hoặc GIF.',
    };
  }

  if (file.size > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    return {
      valid: false,
      error: `Dung lượng ảnh quá lớn! Vui lòng chọn ảnh dưới ${maxMb}MB.`,
    };
  }

  return { valid: true };
}

/**
 * Crops an image to a 1:1 center square and resizes to targetSize (default: 256x256)
 * Compresses output using WebP or JPEG to produce lightweight base64 (~15-25KB)
 */
export async function compressAndCropAvatar(
  file: File,
  targetSize = 256,
  quality = 0.85
): Promise<string> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Ảnh không hợp lệ');
  }

  return new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      try {
        const { width, height } = img;
        if (!width || !height) {
          return reject(new Error('Không thể đọc kích thước ảnh!'));
        }

        // Calculate center square crop coordinates
        const cropSize = Math.min(width, height);
        const cropX = (width - cropSize) / 2;
        const cropY = (height - cropSize) / 2;

        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Trình duyệt không hỗ trợ Canvas 2D!'));
        }

        // Enable high quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw center cropped image onto square canvas
        ctx.drawImage(
          img,
          cropX,
          cropY,
          cropSize,
          cropSize,
          0,
          0,
          targetSize,
          targetSize
        );

        // Try WebP first for best compression ratio
        let dataUrl = canvas.toDataURL('image/webp', quality);

        // If WebP is not supported or exported data URL is too long, fallback to JPEG
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể tải hoặc xử lý tệp ảnh này!'));
    };

    img.src = objectUrl;
  });
}
