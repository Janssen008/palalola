/**
 * Helper to compress and resize an image client-side keeping high resolution and crisp print quality.
 */
export async function compressImageFile(
  file: File,
  maxWidth = 2000,
  maxHeight = 2000,
  quality = 0.92
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Perfectly preserve aspect ratio without stretching
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            dataUrl: e.target?.result as string,
            width: img.width,
            height: img.height,
          });
          return;
        }

        // Enable high-quality bicubic smoothing to prevent blurriness
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({ dataUrl, width, height });
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Splits a 2x2 grid image (like the sample meeting photo) into 4 quadrant photos at high print resolution.
 */
export async function sliceGridImage(
  imageUrl: string
): Promise<Array<{ dataUrl: string; width: number; height: number }>> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const halfW = Math.floor(img.width / 2);
      const halfH = Math.floor(img.height / 2);

      const slices: Array<{ dataUrl: string; width: number; height: number }> = [];
      const quadrants = [
        { sx: 0, sy: 0 },          // Top-Left
        { sx: halfW, sy: 0 },      // Top-Right
        { sx: 0, sy: halfH },      // Bottom-Left
        { sx: halfW, sy: halfH },  // Bottom-Right
      ];

      quadrants.forEach(({ sx, sy }) => {
        const targetW = Math.max(1200, halfW);
        const targetH = Math.max(900, halfH);

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, sx, sy, halfW, halfH, 0, 0, targetW, targetH);
          slices.push({
            dataUrl: canvas.toDataURL('image/jpeg', 0.94),
            width: targetW,
            height: targetH,
          });
        }
      });

      resolve(slices);
    };
    img.onerror = (e) => reject(e);
    img.src = imageUrl;
  });
}
