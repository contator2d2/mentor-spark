import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, X, Link as LinkIcon, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { API_BASE, getToken } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ImageUploadFieldProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  /** Texto auxiliar abaixo do label */
  hint?: string;
  /** Aspecto da prévia. Default 16/9 */
  aspect?: "16/9" | "1/1" | "4/3" | "3/4";
  /** Permitir colar URL direta também */
  allowUrl?: boolean;
  /** Tamanho máximo em MB. Default 10 */
  maxSizeMB?: number;
  className?: string;
}

/**
 * Campo de upload de imagem com drag-and-drop, prévia e fallback para URL.
 * Usa o endpoint /uploads do backend (multer disk storage).
 */
export function ImageUploadField({
  value,
  onChange,
  label = "Imagem",
  hint,
  aspect = "16/9",
  allowUrl = true,
  maxSizeMB = 10,
  className,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem (JPG, PNG, WebP).");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Imagem maior que ${maxSizeMB}MB.`);
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = getToken();
      const res = await fetch(`${API_BASE}/uploads`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Falha no upload");
      }
      const data = await res.json();
      // backend retorna URL relativa /uploads/media/...; resolvemos pra absoluta
      const url = data.url?.startsWith("http")
        ? data.url
        : `${API_BASE.replace(/\/api$/, "")}${data.url}`;
      onChange(url);
      toast.success("Imagem carregada!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  }

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) uploadFile(f);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) uploadFile(f);
  }

  const aspectClass = {
    "16/9": "aspect-video",
    "1/1": "aspect-square",
    "4/3": "aspect-[4/3]",
    "3/4": "aspect-[3/4]",
  }[aspect];

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <Label>{label}</Label>
          {allowUrl && (
            <button
              type="button"
              onClick={() => setShowUrl((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <LinkIcon className="h-3 w-3" />
              {showUrl ? "Upload" : "Usar URL"}
            </button>
          )}
        </div>
      )}
      {hint && <p className="text-xs text-muted-foreground -mt-1">{hint}</p>}

      {showUrl ? (
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://exemplo.com/imagem.jpg"
        />
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={cn(
            "relative rounded-lg border-2 border-dashed cursor-pointer overflow-hidden group transition-colors",
            aspectClass,
            drag
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 bg-muted/30",
            uploading && "pointer-events-none opacity-70",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileSelect}
          />
          {value ? (
            <>
              <img
                src={value}
                alt={label}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="text-white text-sm flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Trocar imagem
                </div>
              </div>
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2 p-4 text-center">
              {uploading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-sm">Enviando...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="h-8 w-8" />
                  <div className="text-sm">
                    <span className="font-medium text-foreground">Clique para enviar</span>
                    {" ou arraste uma imagem"}
                  </div>
                  <span className="text-xs">PNG, JPG ou WebP • até {maxSizeMB}MB</span>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
