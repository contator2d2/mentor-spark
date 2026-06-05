import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, X, FileText, Image as ImageIcon, Music, Film, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE, getToken } from "@/lib/api";
import { toast } from "sonner";

export type UploadKind = "image" | "audio" | "video" | "document";

export interface UploadedMedia {
  url: string;
  kind: UploadKind;
  mimetype: string;
  size: number;
  originalName: string;
}

interface MediaUploadProps {
  /** Restringir tipos aceitos. Default: todos. */
  accept?: UploadKind[];
  /** URL atual (para edição) */
  value?: string;
  /** Callback quando upload conclui com sucesso */
  onChange: (media: UploadedMedia | null) => void;
  /** Tamanho máximo em MB. Default 200. */
  maxSizeMB?: number;
  /** Texto auxiliar */
  hint?: string;
  className?: string;
  /** Compacto (linha única) vs amplo (área grande) */
  compact?: boolean;
}

const KIND_TO_MIME: Record<UploadKind, string> = {
  image: "image/*",
  audio: "audio/*",
  video: "video/*",
  document: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt",
};

const KIND_ICON = {
  image: ImageIcon,
  audio: Music,
  video: Film,
  document: FileText,
};

function detectKindFromMime(mime: string): UploadKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return "document";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaUpload({
  accept,
  value,
  onChange,
  maxSizeMB = 200,
  hint,
  className,
  compact = false,
}: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<UploadedMedia | null>(
    value
      ? {
          url: value,
          kind: detectKindFromMime(value.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? "image/" : value.match(/\.(mp3|wav|ogg|m4a)$/i) ? "audio/" : value.match(/\.(mp4|webm|mov)$/i) ? "video/" : ""),
          mimetype: "",
          size: 0,
          originalName: value.split("/").pop() || "arquivo",
        }
      : null
  );

  // Mantém o preview sincronizado quando o `value` muda externamente
  // (ex.: após salvar/recarregar o formulário a partir do servidor).
  useEffect(() => {
    if (uploading) return;
    if (!value) {
      setPreview(null);
      return;
    }
    setPreview((curr) => {
      if (curr && curr.url === value) return curr;
      const guessKind: UploadKind = value.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
        ? "image"
        : value.match(/\.(mp3|wav|ogg|m4a)$/i)
          ? "audio"
          : value.match(/\.(mp4|webm|mov)$/i)
            ? "video"
            : "document";
      return {
        url: value,
        kind: guessKind,
        mimetype: "",
        size: 0,
        originalName: value.split("/").pop() || "arquivo",
      };
    });
  }, [value, uploading]);

  const acceptString = (accept || (["image", "audio", "video", "document"] as UploadKind[]))
    .map((k) => KIND_TO_MIME[k])
    .join(",");

  const upload = useCallback(
    async (file: File) => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`Arquivo muito grande (máx ${maxSizeMB}MB)`);
        return;
      }
      const detectedKind = detectKindFromMime(file.type);
      if (accept && !accept.includes(detectedKind)) {
        toast.error(`Tipo não permitido aqui. Aceitos: ${accept.join(", ")}`);
        return;
      }

      setUploading(true);
      setProgress(0);
      try {
        const formData = new FormData();
        formData.append("file", file);

        // XHR para ter progresso real
        const result = await new Promise<UploadedMedia>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `${API_BASE}/uploads`);
          const token = getToken();
          if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch (e) {
                reject(new Error("Resposta inválida"));
              }
            } else {
              try {
                const err = JSON.parse(xhr.responseText);
                reject(new Error(err.message || `HTTP ${xhr.status}`));
              } catch {
                reject(new Error(`HTTP ${xhr.status}`));
              }
            }
          };
          xhr.onerror = () => reject(new Error("Falha de conexão"));
          xhr.send(formData);
        });

        // backend retorna { url, kind, mimetype, size, originalName }
        const media: UploadedMedia = {
          url: result.url.startsWith("http") ? result.url : `${API_BASE.replace(/\/api$/, "")}${result.url}`,
          kind: result.kind,
          mimetype: result.mimetype,
          size: result.size,
          originalName: result.originalName,
        };
        setPreview(media);
        onChange(media);
        toast.success("Upload concluído");
      } catch (e: any) {
        toast.error(e.message || "Falha no upload");
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [accept, maxSizeMB, onChange]
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  }

  function clear() {
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  // Preview compacto (linha)
  if (compact && preview && !uploading) {
    const Icon = KIND_ICON[preview.kind];
    return (
      <div className={cn("flex items-center gap-3 p-3 rounded-lg glass-card", className)}>
        {preview.kind === "image" ? (
          <img src={preview.url} alt="" className="h-12 w-12 object-cover rounded" />
        ) : (
          <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{preview.originalName}</div>
          {preview.size > 0 && <div className="text-xs text-muted-foreground">{formatBytes(preview.size)}</div>}
        </div>
        <button
          type="button"
          onClick={clear}
          className="p-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "relative cursor-pointer rounded-xl border-2 border-dashed transition-all overflow-hidden",
          "border-border hover:border-primary/60 hover:bg-primary/5",
          dragOver && "border-primary bg-primary/10 scale-[1.01]",
          uploading && "pointer-events-none",
          compact ? "p-4" : "p-8"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptString}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
          }}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <div className="w-full max-w-xs">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">Enviando… {progress}%</p>
            </div>
          </div>
        ) : preview ? (
          <div className="flex items-center gap-4">
            {preview.kind === "image" ? (
              <img src={preview.url} alt="" className="h-20 w-20 object-cover rounded-lg" />
            ) : preview.kind === "video" ? (
              <video src={preview.url} className="h-20 w-32 object-cover rounded-lg bg-muted" />
            ) : preview.kind === "audio" ? (
              <div className="flex-1">
                <audio src={preview.url} controls className="w-full" />
              </div>
            ) : (
              <div className="h-20 w-20 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-8 w-8 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-sm font-medium truncate">{preview.originalName}</span>
              </div>
              {preview.size > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{formatBytes(preview.size)}</p>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clear();
                }}
                className="text-xs text-destructive hover:underline mt-1"
              >
                Remover e enviar outro
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-14 w-14 rounded-2xl bg-gradient-primary/20 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">
                Arraste um arquivo aqui ou <span className="text-primary">clique para selecionar</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {hint || `Imagem, áudio, vídeo ou documento • até ${maxSizeMB}MB`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
