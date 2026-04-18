import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

/**
 * Configurações globais da plataforma — somente super_admin edita.
 * Usado para credenciais OAuth (Google Calendar etc), chaves SMTP globais
 * e qualquer secret que NÃO seja por mentor.
 *
 * Por que não env vars? Porque assim o super_admin troca pelo painel
 * sem precisar de redeploy.
 */
@Entity('app_settings')
export class AppSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @Column({ type: 'text', nullable: true, select: false })
  value?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
