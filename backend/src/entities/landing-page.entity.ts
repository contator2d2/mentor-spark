import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export interface LandingBlock {
  id: string;
  type: 'hero' | 'form' | 'testimonials' | 'cta' | 'faq' | 'features' | 'video' | 'rich_text';
  data: any;
}

/** Landing customizada do mentor — sobrescreve o /c/:slug padrão se ativa. */
@Entity('landing_pages')
@Index(['mentorId'], { unique: true })
export class LandingPage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column({ type: 'jsonb', default: '[]' })
  blocks: LandingBlock[];

  @Column({ type: 'jsonb', nullable: true })
  theme?: { primaryColor?: string; bgColor?: string; fontFamily?: string };

  @Column({ default: false })
  published: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
