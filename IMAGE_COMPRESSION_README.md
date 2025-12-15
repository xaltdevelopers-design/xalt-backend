# Image Compression Feature

## Overview
Automatic image compression implemented to ensure all uploaded images are under 1 MB.

## Supported Image Formats
✅ **JPEG** (.jpg, .jpeg)  
✅ **PNG** (.png)  
✅ **WebP** (.webp)  
✅ **GIF** (.gif)  
✅ **BMP** (.bmp)  
✅ **TIFF** (.tiff, .tif)

## How It Works

### Compression Strategy by Format:

1. **JPEG, GIF, BMP, TIFF**
   - Uses quality reduction (starts at 60%, can go down to 20%)
   - Converts GIF, BMP, and TIFF to JPEG for better compression
   - Iteratively reduces quality until target size is achieved

2. **PNG**
   - Reduces image dimensions (lossless format needs size reduction)
   - If still too large, converts to JPEG
   - Minimum size maintained: 100x100 pixels

3. **WebP**
   - Uses quality parameter for compression
   - Maintains WebP format

### Compression Process:
1. Checks if image is already under 1 MB → returns as-is if yes
2. Calculates compression ratio needed
3. Tries up to 5 different quality levels
4. Returns compressed image or original if compression fails

## Endpoints Modified

### 1. `/api/upload/image` (POST)
Generic image upload endpoint with compression.

### 2. `/api/products` (POST)
Product creation with image compression for product images.

### 3. `/api/products/:id` (PUT)
Product update with image compression for new product images.

## Files Modified

- `src/utils/imageCompressor.ts` - Core compression logic
- `src/routes/upload.ts` - Upload endpoint with compression
- `src/routes/products.ts` - Products endpoints with compression

## Usage Example

```typescript
import { compressImage } from "./utils/imageCompressor.ts";

// Compress image to under 1 MB (default)
const compressed = await compressImage(imageData, "photo.jpg");

// Compress to custom size (e.g., 500 KB)
const compressed = await compressImage(imageData, "photo.png", 500);
```

## Console Output

When an image is compressed, you'll see:
```
Image compressed: 2.5 MB -> 950 KB
```

If compression doesn't help:
```
Compression didn't reduce size enough, returning original
```

## Error Handling

- If image format is not supported → returns original
- If decode fails → returns original
- If compression fails → returns original
- Ensures app never crashes due to compression errors

## Dependencies

Uses `imagescript` library from Deno:
```typescript
https://deno.land/x/imagescript@1.3.0/mod.ts
```

No additional configuration needed - works out of the box! 🚀
