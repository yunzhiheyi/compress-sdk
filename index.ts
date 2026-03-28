/**
 * Compress SDK
 *
 * Unified browser-side media compression SDK
 * Supports: Video / Image compression
 * Compatible with: Vue3 / Nuxt4 / Pure HTML
 *
 * @example
 * // ES Module
 * import { compressVideo, compressImage } from 'compress-sdk'
 *
 * // Nuxt4 Plugin
 * // Available via $compress.video.* and $compress.image.*
 */

// Video exports
export { parseVideoInfo, parseVideoInfoFromUrl } from './core/video'
export { compressVideo } from './core/video'
export { extractFrames, extractSingleFrame } from './core/video'

// Image exports
export { compressImage, getImageInfo } from './core/image'

// Shared types
export type {
  VideoInfo,
  VideoCompressOptions,
  VideoCompressProgress,
  VideoCompressResult,
  VideoQuality,
  ImageInfo,
  ImageCompressOptions,
  ImageCompressResult,
  WatermarkOptions,
  WatermarkPosition,
  ExtractOptions,
  ExtractedFrame,
} from './core/types'
