import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Post da comunidade do mentor (feed estilo Circle/Discord).
 * Audiência: 'all' (mentorados + prospects) | 'clients' (só mentorados) | 'cohort:<id>' (turma)
 */
@Entity('community_posts')
@Index(['mentorId', 'createdAt'])
export class CommunityPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  /** Autor (pode ser o mentor, membro da equipe ou um mentorado) */
  @Column({ type: 'uuid' })
  authorId: string;

  @Column({ default: 'mentor' })
  authorRole: 'mentor' | 'mentor_team' | 'mentorado' | 'prospect';

  @Column({ nullable: true })
  authorName?: string;

  @Column({ nullable: true })
  authorAvatarUrl?: string;

  @Column({ nullable: true })
  title?: string;

  @Column({ type: 'text' })
  body: string;

  /** URLs de mídia (imagens, vídeos, anexos) */
  @Column({ type: 'jsonb', default: '[]' })
  media: { url: string; type: 'image' | 'video' | 'file'; name?: string }[];

  /** 'all' | 'clients' | 'cohort:<id>' */
  @Column({ default: 'all' })
  audience: string;

  /** Fixado no topo */
  @Column({ default: false })
  pinned: boolean;

  /** Apenas o mentor pode comentar (anúncio) */
  @Column({ default: false })
  locked: boolean;

  @Column({ type: 'int', default: 0 })
  reactionCount: number;

  @Column({ type: 'int', default: 0 })
  commentCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
