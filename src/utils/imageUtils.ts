export interface CompressedImageResult {
  file: File;
  blob: Blob;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number; // percentage saved, e.g. 75%
  width: number;
  height: number;
  fileName: string;
}

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
  outputFormat?: 'image/webp' | 'image/jpeg';
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxSizeMB: 2,
  maxWidthOrHeight: 1600,
  quality: 0.82,
  outputFormat: 'image/webp',
};

/**
 * Format bytes to readable string (e.g. 1.4 MB or 420 KB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Compress an image file using browser Canvas API and convert to lightweight WebP.
 * Runs 100% on the client side without external server dependency.
 */
export async function compressImage(
  file: File,
  customOptions?: CompressionOptions
): Promise<CompressedImageResult> {
  const options = { ...DEFAULT_OPTIONS, ...customOptions };
  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      reject(new Error('The selected file is not an image.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxDim = options.maxWidthOrHeight || 1600;

        // Calculate scaled dimensions keeping aspect ratio
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        // Draw to offscreen canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Unable to initialize canvas context for compression.'));
          return;
        }

        // High quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const format = options.outputFormat || 'image/webp';
        const quality = options.quality ?? 0.82;

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Image compression failed.'));
              return;
            }

            const compressedSize = blob.size;
            const compressionRatio = Math.max(
              0,
              Math.round(((originalSize - compressedSize) / originalSize) * 100)
            );

            // Generate clean WebP filename
            const cleanBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
            const newFileName = `${cleanBaseName}_${Date.now()}.webp`;

            const compressedFile = new File([blob], newFileName, {
              type: format,
              lastModified: Date.now(),
            });

            const dataUrl = canvas.toDataURL(format, quality);

            resolve({
              file: compressedFile,
              blob,
              dataUrl,
              originalSize,
              compressedSize,
              compressionRatio,
              width,
              height,
              fileName: newFileName,
            });
          },
          format,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image file for processing.'));
      };

      if (typeof readerEvent.target?.result === 'string') {
        img.src = readerEvent.target.result;
      } else {
        reject(new Error('Invalid image file reader result.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file from local disk.'));
    };

    reader.readAsDataURL(file);
  });
}
