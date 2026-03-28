/**
 * Compress SDK - Shared Types
 *
 * Common type definitions for video and image compression
 */

/** 视频基本信息 */
export interface VideoInfo {
  duration: number
  width: number
  height: number
  frameRate: number
  bitrate: number
  size: number
  type: string
  videoTracks: number
  audioTracks: number
}

/** 视频压缩选项 */
export interface VideoCompressOptions {
  quality?: VideoQuality
  targetWidth?: number
  targetHeight?: number
  videoBitrate?: string
  audioBitrate?: string
  maintainAspectRatio?: boolean
  trim?: {
    start: number
    end: number
  }
}

/** 视频压缩进度 */
export interface VideoCompressProgress {
  percent: number
  speed?: number
  remainingTime?: number
}

/** 视频压缩结果 */
export interface VideoCompressResult {
  blob: Blob
  url: string
  size: number
  compressionRatio: number
  originalSize: number
}

/** 视频质量预设 */
export type VideoQuality = 'low' | 'medium' | 'high' | 'custom'

/** 图片基本信息 */
export interface ImageInfo {
  width: number
  height: number
  size: number
  type: string
  format: string
  hasAlpha: boolean
}

/** 水印位置 */
export type WatermarkPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'

/** 水印选项 */
export interface WatermarkOptions {
  text?: string
  imageUrl?: string
  position?: WatermarkPosition
  x?: number
  y?: number
  fontSize?: number
  color?: string
  opacity?: number
}

/** 图片压缩选项 */
export interface ImageCompressOptions {
  targetWidth?: number
  targetHeight?: number
  maintainAspectRatio?: boolean
  format?: 'jpeg' | 'webp' | 'png' | 'avif'
  quality?: number
  watermark?: WatermarkOptions
}

/** 图片压缩结果 */
export interface ImageCompressResult {
  blob: Blob
  url: string
  size: number
  width: number
  height: number
  compressionRatio: number
  originalSize: number
}

/** 提取的帧 */
export interface ExtractedFrame {
  time: number
  blob: Blob
  base64: string
  url: string
}

/** 帧提取选项 */
export interface ExtractOptions {
  times?: number[]
  interval?: number
  format?: 'png' | 'jpeg' | 'webp'
  quality?: number
}
