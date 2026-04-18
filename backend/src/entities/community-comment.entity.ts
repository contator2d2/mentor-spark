import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('community_comments')
@Index(['postId', 'createdAt'])
export class CommunityComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  postId: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column({ type: 'uuid' })
  authorId: string;

  @Column()
  authorRole: 'mentor' | 'mentor_team' | 'mentorado' | 'prospect';

  @Column({ nullable: true })
  authorName?: string;

  @Column({ nullable: true })
  authorAvatarUrl?: string;

  @Column({ type: 'text' })
  body: string;

  @CreateDateColumn()
  createdAt: Date;
}
