import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum ContentType {
  POST = 'post',
  ARTICLE = 'article',
  VIDEO = 'video',
  PDF = 'pdf',
  LINK = 'link',
  IMAGE = 'image',
  AUDIO = 'audio',
}

@Entity('contents')
@Index(['mentorId'])
export class Content {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  body?: string;

  @Column({ nullable: true })
  url?: string;

  /** Imagem de capa (post style) */
  @Column({ nullable: true })
  coverImage?: string;

  /** URL de vídeo embed (YouTube, Vimeo) */
  @Column({ nullable: true })
  videoUrl?: string;

  @Column({ type: 'enum', enum: ContentType, default: ContentType.ARTICLE })
  type: ContentType;

  /** Quem deve ver: 'all' | 'prospects' | 'clients' | array de leadIds */
  @Column({ type: 'jsonb', default: '"all"' })
  audience: any;

  @Column({ default: true })
  published: boolean;

  /** Data de publicação agendada — se null, fica disponível imediatamente */
  @Column({ type: 'timestamptz', nullable: true })
  scheduledAt?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
