import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum MaterialType {
  LINK = 'link',
  DOCUMENT = 'document',
  VIDEO = 'video',
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

  /** Marca como compartilhado com o mentorado (visível na área dele no futuro) */
  @Column({ type: 'boolean', default: true }) sharedWithMentee: boolean;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
