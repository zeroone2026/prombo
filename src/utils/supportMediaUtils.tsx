import React from 'react';
import { SupportAttachment } from '../types';

/**
 * Client-side WebP image conversion and compression using HTML5 Canvas API
 */
export async function compressImageToWebP(
  file: File,
  maxDimension = 1280,
  quality = 0.82
): Promise<{ dataUrl: string; size: number; name: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          // Fallback if canvas context fails
          const fallbackName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
          resolve({
            dataUrl: reader.result as string,
            size: file.size,
            name: fallbackName,
            mimeType: 'image/webp',
          });
          return;
        }

        // Draw and compress to webp
        ctx.drawImage(img, 0, 0, width, height);
        const webpDataUrl = canvas.toDataURL('image/webp', quality);

        // Approximate byte size
        const base64Content = webpDataUrl.split(',')[1] || '';
        const approxBytes = Math.round((base64Content.length * 3) / 4);

        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const newName = `${baseName}.webp`;

        resolve({
          dataUrl: webpDataUrl,
          size: approxBytes,
          name: newName,
          mimeType: 'image/webp',
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Reads any user selected file. If image, compresses to WebP first.
 */
export async function processSupportFile(file: File): Promise<SupportAttachment> {
  const isImage = file.type.startsWith('image/');

  if (isImage) {
    try {
      const webpResult = await compressImageToWebP(file);
      return {
        type: 'image',
        url: webpResult.dataUrl,
        name: webpResult.name,
        size: webpResult.size,
        mimeType: 'image/webp',
      };
    } catch (err) {
      console.warn('WebP compression fallback:', err);
    }
  }

  // Non-image file or fallback
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      resolve({
        type: isImage ? 'image' : 'file',
        url: reader.result as string,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
      });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Formats byte size to human readable format
 */
export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Regex for detecting URLs in message text
 */
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

/**
 * Parses message text and turns URLs into clickable anchor tags
 */
export function renderMessageContent(text: string): React.ReactNode {
  if (!text) return null;

  const parts = text.split(URL_REGEX);
  return parts.map((part, index) => {
    if (part.match(URL_REGEX)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="underline font-semibold hover:opacity-80 transition-opacity break-all inline-flex items-center gap-1"
        >
          <span>{part}</span>
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}
