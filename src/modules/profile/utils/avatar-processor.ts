export const ALLOWED_AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type AllowedAvatarMimeType = (typeof ALLOWED_AVATAR_MIME_TYPES)[number];

export const MAX_AVATAR_SOURCE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB safeguard
export const MAX_AVATAR_DIMENSION = 512;
export const WEBP_COMPRESSION_QUALITY = 0.85;

export interface ProcessedAvatarResult {
  blob: Blob;
  mimeType: "image/webp";
  previewUrl: string;
  width: number;
  height: number;
  originalSizeBytes: number;
  processedSizeBytes: number;
}

/**
 * Validates the source image file before decoding.
 */
export function validateAvatarFile(file: File): void {
  if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type as AllowedAvatarMimeType)) {
    throw new Error(
      "Định dạng ảnh không được hỗ trợ. Vui lòng chọn ảnh định dạng JPEG, PNG hoặc WebP.",
    );
  }

  if (file.size > MAX_AVATAR_SOURCE_SIZE_BYTES) {
    throw new Error("Kích thước tệp quá lớn. Vui lòng chọn tệp ảnh dưới 20MB.");
  }
}

/**
 * Calculates target dimensions preserving aspect ratio without upscaling.
 */
export function calculateResizeDimensions(
  sourceWidth: number,
  sourceHeight: number,
  maxDimension = MAX_AVATAR_DIMENSION,
): { width: number; height: number } {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return { width: maxDimension, height: maxDimension };
  }

  // Ratio is at most 1, so smaller images will not be upscaled
  const scale = Math.min(maxDimension / sourceWidth, maxDimension / sourceHeight, 1);

  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

/**
 * Decodes an image File to an ImageBitmap or HTMLImageElement.
 */
async function decodeImageSource(
  file: File,
): Promise<{ source: CanvasImageSource; width: number; height: number; cleanup: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fallback to HTMLImageElement below if createImageBitmap fails
    }
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      resolve({
        source: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        cleanup: () => URL.revokeObjectURL(objectUrl),
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Không thể đọc tệp hình ảnh đã chọn. Vui lòng thử lại với hình ảnh khác."));
    };

    img.src = objectUrl;
  });
}

/**
 * Processes an avatar image on client-side:
 * 1. Validates MIME type and source file size
 * 2. Decodes image into memory
 * 3. Resizes down to target max 512x512 px preserving aspect ratio (no upscaling)
 * 4. Renders onto Canvas with high-quality smoothing
 * 5. Compresses and exports as WebP Blob (quality: 0.85)
 * 6. Generates preview object URL for immediate user feedback
 */
export async function processAvatarImage(file: File): Promise<ProcessedAvatarResult> {
  validateAvatarFile(file);

  const { source, width: srcWidth, height: srcHeight, cleanup } = await decodeImageSource(file);

  try {
    const { width: targetWidth, height: targetHeight } = calculateResizeDimensions(
      srcWidth,
      srcHeight,
      MAX_AVATAR_DIMENSION,
    );

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Không thể khởi tạo bộ xử lý hình ảnh trên trình duyệt.");
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

    const webpBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        "image/webp",
        WEBP_COMPRESSION_QUALITY,
      );
    });

    if (!webpBlob) {
      throw new Error("Không thể chuyển đổi ảnh sang định dạng WebP trên trình duyệt của bạn.");
    }

    const previewUrl = URL.createObjectURL(webpBlob);

    return {
      blob: webpBlob,
      mimeType: "image/webp",
      previewUrl,
      width: targetWidth,
      height: targetHeight,
      originalSizeBytes: file.size,
      processedSizeBytes: webpBlob.size,
    };
  } finally {
    cleanup();
  }
}

/**
 * Revokes a temporary object preview URL to prevent memory leaks.
 */
export function revokeAvatarPreview(previewUrl?: string | null): void {
  if (previewUrl && previewUrl.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(previewUrl);
    } catch {
      // Ignore
    }
  }
}
