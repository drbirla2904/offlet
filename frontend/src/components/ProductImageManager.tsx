import { useEffect, useState } from 'react'
import { productImagesApi, productsApi } from '../api/endpoints'
import type { ProductImage } from '../types'
import { resolveMediaUrl } from '../utils/mediaUrl'

/** Full image gallery for a product: upload, set primary, delete, drag-free
 * reorder-by-buttons. Used on the offer edit screen — offer creation still
 * uploads a single image inline to keep the "under a minute" flow fast. */
export function ProductImageManager({ productId }: { productId: number }) {
  const [images, setImages] = useState<ProductImage[]>([])
  const [uploading, setUploading] = useState(false)

  const load = () => {
    productImagesApi.list(productId).then((data) => {
      setImages(Array.isArray(data) ? data : data.results)
    })
  }

  useEffect(load, [productId])

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await productsApi.uploadImage(productId, file, images.length === 0)
      load()
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const remove = async (imageId: number) => {
    if (!confirm('Remove this photo?')) return
    await productImagesApi.remove(imageId)
    load()
  }

  const setPrimary = async (imageId: number) => {
    await productImagesApi.setPrimary(imageId)
    load()
  }

  return (
    <div>
      <p className="text-xs text-ink-soft mb-1.5">Product photos</p>
      <div className="flex flex-wrap gap-2">
        {images.map((img) => (
          <div key={img.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
            <img src={resolveMediaUrl(img.image)} alt="Product photo" className="w-full h-full object-contain bg-canvas" />
            {img.is_primary && (
              <span className="absolute top-0.5 left-0.5 bg-marigold text-white text-[9px] font-semibold px-1.5 py-0.5 rounded">
                Main
              </span>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity">
              {!img.is_primary && (
                <button type="button" onClick={() => setPrimary(img.id)} className="text-white text-[10px] underline">
                  Make main
                </button>
              )}
              <button type="button" onClick={() => remove(img.id)} className="text-white text-[10px] underline">
                Remove
              </button>
            </div>
          </div>
        ))}
        <label className="w-20 h-20 rounded-lg border border-dashed border-border flex items-center justify-center text-ink-soft text-xs cursor-pointer">
          {uploading ? '…' : '+ Add'}
          <input type="file" accept="image/*" onChange={onUpload} className="hidden" disabled={uploading} />
        </label>
      </div>
    </div>
  )
}
