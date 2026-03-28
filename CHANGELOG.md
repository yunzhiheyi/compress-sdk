# Changelog

All notable changes will be documented in this file.

## [1.0.2] - 2026-03-28

### Fixed

- Fixed `mediabunny` dependency version to `^1.40.1` (compatible with published version)

## [1.0.1] - 2026-03-28

### Fixed

- Fixed image compression type issues
- Fixed video compression type issues
- Updated dependencies to stable versions

## [1.0.0] - 2026-03-28

### Added

- **Video Compression**
  - `compressVideo()` - 视频压缩，支持多种质量预设
  - `parseVideoInfo()` - 获取视频元数据（时长、分辨率、码率等）
  - `parseVideoInfoFromUrl()` - 从 URL 获取视频信息
  - `trim` - 视频裁剪功能

- **Video Frame Extraction**
  - `extractFrames()` - 按时间间隔提取多帧
  - `extractSingleFrame()` - 提取指定时间点的单帧
  - 支持 JPEG/PNG/WebP 输出格式

- **Image Compression**
  - `compressImage()` - 图片压缩
  - `getImageInfo()` - 获取图片元数据
  - 支持 4 种格式：JPEG、WebP、PNG、AVIF

- **Watermark**
  - 文字水印支持
  - 9 种位置可选
  - 可调节透明度、字体大小、颜色

- **Encoding**
  - jSquash WASM 编码器集成（MozJPEG、libwebp、OxiPNG、libavif）
  - Canvas 回退方案

### Features

- 统一 SDK 结构，支持视频/图片压缩
- Nuxt4 插件集成
- Vue3 Composition API 兼容
- TypeScript 类型完整
- 进度回调支持

### Dependencies

- `mediabunny` - 视频处理核心
- `@jsquash/jpeg` - JPEG 编码
- `@jsquash/webp` - WebP 编码
- `@jsquash/png` - PNG 编码
- `@jsquash/avif` - AVIF 编码
- `@jsquash/resize` - 图片缩放

## [0.0.1] - 2026-03-01

### Added

- Initial release (internal testing)
