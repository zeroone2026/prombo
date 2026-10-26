import { SectionMediaConfig } from '../types';

export interface MediaValidationResult {
  valid: boolean;
  error?: string;
  errorAr?: string;
}

export interface VideoDurationResult {
  durationSec: number;
  valid: boolean;
  error?: string;
  errorAr?: string;
}

/**
 * Validates a photo file against size and extension constraints
 */
export function validatePhotoFile(file: File, config: SectionMediaConfig): MediaValidationResult {
  if (!config.masterEnabled || !config.enablePhotoUploads) {
    return {
      valid: false,
      error: 'Photo uploads are currently disabled.',
      errorAr: 'رفع الصور معطل حالياً من قبل الإدارة.',
    };
  }

  // Type check
  if (!file.type.startsWith('image/')) {
    return {
      valid: false,
      error: 'Selected file is not a valid image.',
      errorAr: 'الملف المحدد ليس صورة صالحة.',
    };
  }

  // Size limit check
  const maxBytes = config.maxPhotoSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `Photo exceeds maximum allowed size of ${config.maxPhotoSizeMB} MB.`,
      errorAr: `حجم الصورة يتجاوز الحد الأقصى المسموح به (${config.maxPhotoSizeMB} ميجابايت).`,
    };
  }

  return { valid: true };
}

/**
 * Validates a video file against size, extension, and duration constraints
 */
export async function validateVideoFile(
  file: File,
  config: SectionMediaConfig
): Promise<MediaValidationResult> {
  if (!config.masterEnabled || !config.enableVideoUploads) {
    return {
      valid: false,
      error: 'Video uploads are currently disabled.',
      errorAr: 'رفع الفيديوهات معطل حالياً من قبل الإدارة.',
    };
  }

  if (!file.type.startsWith('video/')) {
    return {
      valid: false,
      error: 'Selected file is not a valid video.',
      errorAr: 'الملف المحدد ليس فيديو صالحاً.',
    };
  }

  const maxBytes = config.maxVideoSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `Video exceeds maximum allowed size of ${config.maxVideoSizeMB} MB.`,
      errorAr: `حجم الفيديو يتجاوز الحد الأقصى المسموح به (${config.maxVideoSizeMB} ميجابايت).`,
    };
  }

  // Check duration via HTML5 Video element
  try {
    const durationRes = await getVideoDuration(file, config.maxVideoDurationSec);
    if (!durationRes.valid) {
      return {
        valid: false,
        error: durationRes.error,
        errorAr: durationRes.errorAr,
      };
    }
  } catch (err: any) {
    console.warn('Could not inspect video duration:', err);
  }

  return { valid: true };
}

/**
 * Reads video duration asynchronously using HTML5 <video> element with onloadedmetadata
 */
export function getVideoDuration(file: File, maxDurationSec: number): Promise<VideoDurationResult> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';

    const cleanUp = () => {
      URL.revokeObjectURL(url);
    };

    video.onloadedmetadata = () => {
      cleanUp();
      const duration = Math.round(video.duration || 0);
      if (maxDurationSec > 0 && duration > maxDurationSec) {
        resolve({
          durationSec: duration,
          valid: false,
          error: `Video length (${duration}s) exceeds maximum allowed duration (${maxDurationSec}s).`,
          errorAr: `مدة الفيديو (${duration} ثانية) تتجاوز الحد الأقصى المسموح به (${maxDurationSec} ثانية).`,
        });
      } else {
        resolve({
          durationSec: duration,
          valid: true,
        });
      }
    };

    video.onerror = () => {
      cleanUp();
      // If browser can't decode (e.g. mkv/avi), allow if size is within limits, or warn
      resolve({
        durationSec: 0,
        valid: true,
      });
    };

    video.src = url;
  });
}

/**
 * Validates a video URL (YouTube, Vimeo, MP4 direct link)
 */
export function isValidVideoUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:video/')
  );
}

/**
 * Converts a file to base64 Data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
