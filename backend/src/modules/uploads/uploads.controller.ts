import { BadRequestException, Controller, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import * as path from 'path';
import * as fs from 'fs';
import { Auth } from '../auth/auth.decorators';

/**
 * Endpoint genérico de upload — usado por Conteúdos, Branding, anexos de reunião,
 * mensagens, etc. Salva em /uploads/media/{kind}/{userId}-{timestamp}{ext}.
 *
 * Tipos aceitos: image/*, audio/*, video/*, application/pdf,
 * application/msword, application/vnd.openxmlformats-*, text/*.
 */
function detectKind(mimetype: string): 'image' | 'audio' | 'video' | 'document' {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.startsWith('video/')) return 'video';
  return 'document';
}

const ALLOWED = /^(image|audio|video)\/|^application\/(pdf|msword|vnd\.openxmlformats|vnd\.ms-)|^text\//;

@ApiTags('uploads')
@ApiBearerAuth()
@Controller()
export class UploadsController {
  @Auth('mentor', 'super_admin', 'mentorado', 'prospect', 'mentor_team')
  @Post(['uploads', 'upload'])
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: diskStorage({
        destination: (req, file, cb) => {
          const kind = detectKind(file.mimetype);
          const dir = path.resolve(process.cwd(), 'uploads', 'media', kind);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req: any, file, cb) => {
          const userId = req.user?.sub || 'anon';
          const safe = file.originalname.replace(/[^\w.-]/g, '_').slice(-40);
          cb(null, `${userId}-${Date.now()}-${safe}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!ALLOWED.test(file.mimetype)) {
          return cb(new BadRequestException(`Tipo não suportado: ${file.mimetype}`), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
    }),
  )
  async upload(@UploadedFiles() files: any[]) {
    if (!files?.length) throw new BadRequestException('Arquivo obrigatório');
    const payload = files.map((file) => {
      const kind = detectKind(file.mimetype);
      const url = `/uploads/media/${kind}/${file.filename}`;
      return {
        ok: true,
        url,
        kind,
        mimetype: file.mimetype,
        size: file.size,
        originalName: file.originalname,
      };
    });
    return files.length === 1 && files[0].fieldname === 'file' ? payload[0] : payload;
  }
}
