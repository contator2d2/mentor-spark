import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum PrivateNoteCategory {
  PERCEPTION = 'perception',
  HYPOTHESIS = 'hypothesis',
  BEHAVIOR = 'behavior',
  RISK = 'risk',
  STRATEGY = 'strategy',
  OTHER = 'other',
}

/**
 * Notas privadas do mentor — invisíveis ao mentorado.
 * NUNCA devem ser expostas em rotas públicas/onboarding.
 */
@Entity('mentored_private_notes')
@Index(['recordId'])
@Index(['mentorId'])
export class MentoredPrivateNote {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) mentorId: string;
  @Column({ type: 'uuid' }) recordId: string;

  @Column({ type: 'text' }) content: string;

  @Column({ type: 'enum', enum: PrivateNoteCategory, default: PrivateNoteCategory.PERCEPTION })
  category: PrivateNoteCategory;

  @Column({ type: 'simple-array', nullable: true }) tags?: string[];

  /** Marcador visual de importância */
  @Column({ type: 'boolean', default: false }) pinned: boolean;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
