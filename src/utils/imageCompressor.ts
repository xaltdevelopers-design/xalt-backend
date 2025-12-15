// @ts-ignore: Deno namespace is available in Deno runtime
// deno-lint-ignore no-explicit-any
declare const Deno: any;

/**
 * Compresses an image to ensure it's under the target size (default 1 MB)
 * Supports: JPEG, JPG, PNG, WebP, GIF, BMP, TIFF, TIF
 * @param imageData - The original image data as Uint8Array
 * @param originalName - The original filename to determine image type
 * @param targetSizeKB - Target size in KB (default 1024 KB = 1 MB)
 * @returns Compressed image data as Uint8Array
 */
export async function compressImage(
  imageData: Uint8Array,
  originalName: string,
  targetSizeKB = 1024
): Promise<Uint8Array> {
  const targetSizeBytes = targetSizeKB * 1024;
  
  // If already under target size, return as-is
  if (imageData.byteLength <= targetSizeBytes) {
    return imageData;
  }

  // Determine image format from filename
  const ext = originalName.toLowerCase().split(".").pop() || "jpg";
  const isJpeg = ext === "jpg" || ext === "jpeg";
  const isPng = ext === "png";
  const isWebp = ext === "webp";
  const isGif = ext === "gif";
  const isBmp = ext === "bmp";
  const isTiff = ext === "tiff" || ext === "tif";
  
  // Check if it's a supported image format
  const supportedImageFormats = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "tif"];
  const isImage = supportedImageFormats.includes(ext);

  // For non-image formats, return as-is
  if (!isImage) {
    console.warn(`Unsupported format: ${ext}, returning original`);
    return imageData;
  }

  try {
    // Import imagescript for image manipulation
    const { Image } = await import("https://deno.land/x/imagescript@1.3.0/mod.ts");
    
    // Decode the image
    let image;
    try {
      image = await Image.decode(imageData);
    } catch (decodeError) {
      console.error("Failed to decode image:", decodeError);
      return imageData; // Return original if decode fails
    }

    // Calculate compression ratio needed
    const compressionRatio = targetSizeBytes / imageData.byteLength;
    
    // Start with quality based on compression ratio
    let quality = Math.max(60, Math.floor(compressionRatio * 100));
    let compressedData: Uint8Array = imageData;
    let attempts = 0;
    const maxAttempts = 5;

    // Try different quality levels until we get under target size
    while (compressedData.byteLength > targetSizeBytes && attempts < maxAttempts) {
      try {
        if (isJpeg || isGif || isBmp || isTiff) {
          // Encode as JPEG with current quality for lossy formats
          // GIF, BMP, TIFF will be converted to JPEG for better compression
          compressedData = await image.encodeJPEG(quality);
        } else if (isPng) {
          // For PNG, we need to reduce dimensions as PNG is lossless
          const scaleFactor = Math.sqrt(compressionRatio);
          const newWidth = Math.floor(image.width * scaleFactor);
          const newHeight = Math.floor(image.height * scaleFactor);
          
          if (newWidth > 100 && newHeight > 100) {
            image = image.resize(newWidth, newHeight);
            compressedData = await image.encodePNG();
          } else {
            // Convert to JPEG if PNG is too large and can't be scaled down more
            compressedData = await image.encodeJPEG(quality);
            break;
          }
        } else if (isWebp) {
          // WebP supports quality parameter
          compressedData = await image.encodeWebP(quality);
        }

        // If still too large, reduce quality for next iteration
        if (compressedData.byteLength > targetSizeBytes) {
          quality = Math.max(20, quality - 15);
        }
        
        attempts++;
      } catch (encodeError) {
        console.error("Failed to encode image at quality", quality, ":", encodeError);
        break;
      }
    }

    // If we managed to compress, return compressed data
    if (compressedData.byteLength < imageData.byteLength) {
      console.log(`Image compressed: ${(imageData.byteLength / 1024).toFixed(2)} KB -> ${(compressedData.byteLength / 1024).toFixed(2)} KB`);
      return compressedData;
    }

    // If compression failed or didn't help, return original
    console.warn("Compression didn't reduce size enough, returning original");
    return imageData;
    
  } catch (error) {
    console.error("Image compression error:", error);
    // Return original data if compression fails
    return imageData;
  }
}

/**
 * Get the appropriate file extension after compression
 * @param originalName - Original filename
 * @param wasConverted - Whether the image was converted to JPEG
 * @returns The appropriate file extension
 */
export function getCompressedExtension(originalName: string, wasConverted = false): string {
  const ext = originalName.toLowerCase().split(".").pop() || "jpg";
  
  // If PNG was too large and converted to JPEG
  if (wasConverted && ext === "png") {
    return "jpg";
  }
  
  return ext;
}
