import { useRef, useState, type ChangeEvent } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

export function ImageUpload({
  folder,
  value,
  onChange,
}: {
  folder: string
  value: string | null
  onChange: (url: string | null) => void
}) {
  const { user } = useAuth()
  const showToast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return

    setUploading(true)
    const path = `${user.id}/${folder}/${crypto.randomUUID()}-${file.name}`
    const { error } = await supabase.storage.from('media').upload(path, file)
    setUploading(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    const { data } = supabase.storage.from('media').getPublicUrl(path)
    onChange(data.publicUrl)
  }

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <div className="relative">
          <img src={value} alt="" className="h-16 w-16 rounded-xl object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove image"
            className="absolute -right-1.5 -top-1.5 rounded-full bg-black/70 p-0.5 text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Upload image"
          className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-white/15 text-slate-500 hover:border-mood-accent hover:text-mood-accent"
        >
          <ImagePlus className="h-5 w-5" />
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {uploading && <span className="text-xs text-slate-500">Uploading…</span>}
    </div>
  )
}
