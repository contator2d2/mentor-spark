import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum MaterialType {
  LINK = 'link',
  DOCUMENT = 'document',
  VIDEO = 'video',
  IMAGE = 'image',
  AUDIO = 'audio',
  TEMPLATE = 'template',
  REFERENCE = 'reference',
  OTHER = 'other',
}

@Entity('mentored_materials')
@Index(['recordId'])
@Index(['mentorId'])
export class MentoredMaterial {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) mentorId: string;
  @Column({ type: 'uuid' }) recordId: string;

  @Column() title: string;
  @Column({ type: 'text', nullable: true }) description?: string;
  @Column({ type: 'enum', enum: MaterialType, default: MaterialType.LINK }) type: MaterialType;

  @Column({ type: 'text', nullable: true }) url?: string;
  @Column({ nullable: true }) category?: string;

  /** Metadados do arquivo (quando upload) */
  @Column({ nullable: true }) fileName?: string;
  @Column({ nullable: true }) mimeType?: string;
  @Column({ type: 'bigint', nullable: true }) fileSize?: number;

  /** Marca como compartilhado com o mentorado (visível na área dele no futuro) */
  @Column({ type: 'boolean', default: true }) sharedWithMentee: boolean;

  /** Tracking de visualização/download pelo mentorado */
  @Column({ type: 'timestamptz', nullable: true }) firstViewedAt?: Date;
  @Column({ type: 'timestamptz', nullable: true }) lastViewedAt?: Date;
  @Column({ type: 'int', default: 0 }) viewCount: number;
  @Column({ type: 'timestamptz', nullable: true }) firstDownloadedAt?: Date;
  @Column({ type: 'timestamptz', nullable: true }) lastDownloadedAt?: Date;
  @Column({ type: 'int', default: 0 }) downloadCount: number;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
