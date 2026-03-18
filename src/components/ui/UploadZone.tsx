// @ts-nocheck
import { useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'

export function UploadZone({ onFile, accept = 'image/*' }) {
  const inputRef = useRef()
  const [preview, setPreview] = useState(null)
  const [filename, setFilename] = useState(null)

  const handle = (file) => {
    if (!file) return
    setFilename(file.name)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(file)
    onFile(file)
  }

  return (
    <div
      onClick={() => inputRef.current.click()}
      className="relative cursor-pointer bg-surface border border-dashed border-border2 rounded-[8px] h-28 flex flex-col items-center justify-center gap-2 hover:border-green transition-colors"
    >
      {preview ? (
        <img src={preview} alt="preview" className="h-full w-full object-cover rounded-[8px]" />
      ) : (
        <>
          <ArrowUp size={20} className="text-text3" />
          <span className="text-text3 text-xs">Tap to select screenshot</span>
          {filename && <span className="text-text2 text-xs truncate max-w-[200px]">{filename}</span>}
        </>
      )}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => handle(e.target.files[0])} />
    </div>
  )
}
