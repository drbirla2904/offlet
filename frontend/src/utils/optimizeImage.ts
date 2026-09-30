const MAX_IMAGE_EDGE = 1920
const COMPRESS_ABOVE_BYTES = 400 * 1024

export async function optimizeImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }

  try {
    const longestEdge = Math.max(bitmap.width, bitmap.height)
    if (longestEdge <= MAX_IMAGE_EDGE && file.size <= COMPRESS_ABOVE_BYTES) return file

    const scale = Math.min(1, MAX_IMAGE_EDGE / longestEdge)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    const optimized = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', 0.82)
    })
    if (!optimized || optimized.type !== 'image/webp' || optimized.size >= file.size) return file

    const name = file.name.replace(/\.[^.]+$/, '') || 'image'
    return new File([optimized], `${name}.webp`, { type: 'image/webp', lastModified: file.lastModified })
  } finally {
    bitmap.close()
  }
}