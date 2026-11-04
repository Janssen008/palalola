/**
 * Helper to compress and resize an image client-side to keep base64 storage fast and lightweight.
 */
export async function compressImageFile(
  file: File,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            maxHeight = height;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Splits a 2x2 grid image (like the sample meeting photo) into 4 quadrant photos.
 */
export async function sliceGridImage(imageUrl: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const halfW = Math.floor(img.width / 2);
      const halfH = Math.floor(img.height / 2);

      const slices: string[] = [];
      const quadrants = [
        { sx: 0, sy: 0 },          // Top-Left
        { sx: halfW, sy: 0 },      // Top-Right
        { sx: 0, sy: halfH },      // Bottom-Left
        { sx: halfW, sy: halfH },  // Bottom-Right
      ];

      quadrants.forEach(({ sx, sy }) => {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 450;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, sx, sy, halfW, halfH, 0, 0, 600, 450);
          slices.push(canvas.toDataURL('image/jpeg', 0.85));
        }
      });

      resolve(slices);
    };
    img.onerror = (e) => reject(e);
    img.src = imageUrl;
  });
}

