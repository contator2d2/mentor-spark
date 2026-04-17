import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum ContentType {
  ARTICLE = 'article',
  VIDEO = 'video',
  PDF = 'pdf',
  LINK = 'link',
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

  @Column({ type: 'enum', enum: ContentType, default: ContentType.ARTICLE })
  type: ContentType;

  /** Quem deve ver: 'all' | 'prospects' | 'clients' | array de leadIds */
  @Column({ type: 'jsonb', default: '"all"' })
  audience: any;

  @Column({ default: true })
  published: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
