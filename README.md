# Compress SDK

Browser-side media compression SDK supporting video and image compression.

[English](#) | [中文](https://github.com/yunzhiheyi/compress-sdk/blob/main/README.zh-CN.md)

## Features

- **Video Compression** - Based on mediabunny (WebCodecs)
- **Image Compression** - Based on jSquash WASM encoders (MozJPEG, libwebp, OxiPNG, libavif)
- **Frame Extraction** - Extract frames from video at specified timestamps
- **Watermark Support** - Add text watermarks to images
- **Nuxt4/Vue3 Compatible** - Works with Vue Composition API
- **TypeScript Support** - Full type definitions

## Installation

```bash
npm install compress-sdk-plus
```

## Quick Start - Nuxt4

Create plugin `plugins/compress.client.ts`:

```javascript
import {
  parseVideoInfo,
  compressVideo,
  extractFrames,
  extractSingleFrame,
  compressImage,
  getImageInfo,
} from 'compress-sdk-plus'

// Register as Nuxt plugin (client-side only)
export default defineNuxtPlugin(() => {
  return {
    provide: {
      // Access via $compress.video.* or $compress.image.*
      compress: {
        video: { parseVideoInfo, compressVideo, extractFrames, extractSingleFrame },
        image: { compressImage, getImageInfo },
      },
    },
  }
})
```

Configure `nuxt.config.ts`:

```javascript
export default defineNuxtConfig({
  alias: {
    'compress-sdk-plus': '/path/to/node_modules/compress-sdk-plus'
  },
  vite: {
    optimizeDeps: {
      // Pre-bundle these dependencies for faster cold start
      include: ['mediabunny', '@jsquash/jpeg', '@jsquash/webp', '@jsquash/png', '@jsquash/avif']
    }
  },
  build: {
    // Transpile to commonjs for better compatibility
    transpile: ['mediabunny', '@jsquash/jpeg', '@jsquash/webp', '@jsquash/png', '@jsquash/avif']
  }
})
```

## Vue Example - Video Compression

```vue
<template>
  <div>
    <!-- File input for video selection -->
    <input type="file" accept="video/*" @change="handleVideoChange" />

    <!-- Compress button with loading state -->
    <button @click="compressVideo" :disabled="!videoFile || isCompressing">
      {{ isCompressing ? 'Compressing...' : 'Compress Video' }}
    </button>

    <!-- Progress display -->
    <div v-if="progress">
      {{ progress.percent }}% - Speed: {{ progress.speed }}x
    </div>

    <!-- Download link when complete -->
    <a v-if="result" :href="result.url" download="compressed.mp4">
      Download
    </a>
  </div>
</template>

<script setup>
// Access the SDK via Nuxt plugin
const { $compress } = useNuxtApp()

// State variables
const videoFile = ref(null)        // Selected video file
const result = ref(null)            // Compression result
const progress = ref(null)          // Compression progress
const isCompressing = ref(false)   // Loading state

// Handle file selection from input
function handleVideoChange(e) {
  videoFile.value = e.target.files[0]
}

// Compress video with progress callback
async function compressVideo() {
  if (!videoFile.value) return
  isCompressing.value = true

  try {
    // Call compressVideo with options and progress callback
    result.value = await $compress.video.compressVideo(
      videoFile.value,                    // Source video file
      {
        quality: 'medium',               // Quality preset: low | medium | high
        targetWidth: 1280,              // Target width in pixels
        maintainAspectRatio: true,       // Keep original aspect ratio
        trim: {                         // Optional: trim video
          start: 0,
          end: 30
        }
      },
      (p) => {                          // Progress callback
        progress.value = p
      }
    )
  } catch (err) {
    console.error('Compression failed:', err)
  } finally {
    isCompressing.value = false
  }
}
</script>
```

## Vue Example - Image Compression with Watermark

```vue
<template>
  <div>
    <!-- Image file input -->
    <input type="file" accept="image/*" @change="handleImageChange" />

    <!-- Format selector -->
    <select v-model="format">
      <option value="webp">WebP (Recommended)</option>
      <option value="jpeg">JPEG</option>
      <option value="avif">AVIF (Best compression)</option>
      <option value="png">PNG (Lossless)</option>
    </select>

    <!-- Quality slider -->
    <label>
      Quality: {{ quality }}
      <input type="range" v-model.number="quality" min="0.1" max="1" step="0.1" />
    </label>

    <!-- Watermark options -->
    <label>
      <input type="checkbox" v-model="enableWatermark" />
      Add Watermark
    </label>

    <div v-if="enableWatermark">
      <input type="text" v-model="watermarkText" placeholder="Watermark text" />
      <select v-model="watermarkPosition">
        <option value="bottom-right">Bottom Right</option>
        <option value="bottom-left">Bottom Left</option>
        <option value="top-right">Top Right</option>
        <option value="top-left">Top Left</option>
        <option value="center">Center</option>
      </select>
    </div>

    <!-- Compress button -->
    <button @click="compressImage" :disabled="!imageFile">
      Compress Image
    </button>

    <!-- Result display -->
    <div v-if="result">
      <p>Original: {{ formatSize(result.originalSize) }}</p>
      <p>Compressed: {{ formatSize(result.size) }}</p>
      <p>Saved: {{ ((1 - result.size / result.originalSize) * 100).toFixed(0) }}%</p>
      <img :src="result.url" alt="Compressed" />
      <a :href="result.url" :download="`compressed.${format}`">Download</a>
    </div>
  </div>
</template>

<script setup>
const { $compress } = useNuxtApp()

const imageFile = ref(null)
const format = ref('webp')         // Output format
const quality = ref(0.92)          // Quality 0-1
const enableWatermark = ref(false)
const watermarkText = ref('© Your Name')
const watermarkPosition = ref('bottom-right')
const result = ref(null)

// Format file size to readable string
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

function handleImageChange(e) {
  imageFile.value = e.target.files[0]
}

async function compressImage() {
  if (!imageFile.value) return

  // Build options object
  const options = {
    format: format.value,              // Output format: webp | jpeg | png | avif
    quality: quality.value,            // Quality 0-1
    targetWidth: 1920,               // Target width (auto-calculate height)
  }

  // Add watermark if enabled
  if (enableWatermark.value && watermarkText.value) {
    options.watermark = {
      text: watermarkText.value,      // Watermark text
      position: watermarkPosition.value, // Position: bottom-right, center, etc.
      fontSize: 24,                   // Font size in pixels
      opacity: 0.8,                  // Transparency 0-1
    }
  }

  // Compress and get result
  result.value = await $compress.image.compressImage(imageFile.value, options)
}
</script>
```

## API Reference

### Video API

| Method | Description |
|--------|-------------|
| `parseVideoInfo(file)` | Get video metadata (duration, size, resolution, etc.) |
| `compressVideo(file, options, onProgress?)` | Compress video with progress tracking |
| `extractFrames(file, options)` | Extract multiple frames at intervals |
| `extractSingleFrame(file, time)` | Extract single frame at specific time |

### Image API

| Method | Description |
|--------|-------------|
| `getImageInfo(file)` | Get image metadata (dimensions, size, format) |
| `compressImage(file, options)` | Compress image with optional watermark |

## Options

### Video Options

```typescript
{
  quality?: 'low' | 'medium' | 'high'  // Quality preset
  targetWidth?: number                    // Target width in pixels
  targetHeight?: number                   // Target height in pixels
  maintainAspectRatio?: boolean           // Keep aspect ratio (default: true)
  trim?: { start: number, end: number } // Trim video section in seconds
}
```

### Image Options

```typescript
{
  format?: 'jpeg' | 'webp' | 'png' | 'avif'  // Output format
  quality?: number                            // Quality 0-1 (default: 0.92)
  targetWidth?: number                       // Target width
  targetHeight?: number                      // Target height
  maintainAspectRatio?: boolean              // Keep aspect ratio (default: true)
  watermark?: {
    text?: string              // Watermark text
    position?: WatermarkPosition  // Position
    fontSize?: number          // Font size
    opacity?: number           // Transparency 0-1
  }
}
```

## Watermark Positions

```
'top-left'      'top-center'      'top-right'
'center-left'   'center'          'center-right'
'bottom-left'   'bottom-center'   'bottom-right'
```

## Format Comparison

| Format | Compression | Browser Support | Transparency |
|--------|-------------|-----------------|--------------|
| JPEG   | Medium      | Universal       | No           |
| WebP   | Good        | Modern browsers | No           |
| PNG    | Lossless    | Universal       | Yes          |
| AVIF   | **Best**    | Chrome 85+      | No           |

## License

MIT
