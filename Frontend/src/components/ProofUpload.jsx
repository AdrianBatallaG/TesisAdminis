import { ImagePlus, UploadCloud } from 'lucide-react';

export const ProofUpload = ({ id, label, inputRef, attachment, onChange, disabled = false, required = false }) => (
  <div className="space-y-3">
    <p id={`${id}-label`} className="text-sm font-medium text-gray-800">{label}</p>
    <label htmlFor={id} className={`group flex items-center gap-4 rounded-xl border border-dashed border-sage-300 bg-white p-5 transition-colors focus-within:ring-2 focus-within:ring-sage-600 focus-within:ring-offset-2 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-sage-600 hover:bg-sage-50'}`}>
      <input id={id} ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" required={required} disabled={disabled} onChange={onChange} aria-labelledby={`${id}-label`} className="sr-only" />
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sage-100 text-sage-700"><UploadCloud size={25} strokeWidth={1.6} aria-hidden="true" /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-sage-800">{attachment ? 'Cambiar foto' : 'Adjuntar comprobante'}</span><span className="block text-sm text-gray-500 mt-1 break-all">{attachment ? attachment.name : 'Selecciona una foto de tu comprobante'}</span></span>
      <ImagePlus size={20} className="shrink-0 text-sage-500" aria-hidden="true" />
    </label>
  </div>
);
