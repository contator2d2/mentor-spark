import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique } from 'typeorm';

@Entity('community_reactions')
@Unique(['postId', 'userId', 'emoji'])
@Index(['postId'])
export class CommunityReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  postId: string;

  @Column({ type: 'uuid' })
  userId: string;

  /** 👍 ❤️ 🎉 🔥 💡 */
  @Column()
  emoji: string;

  @CreateDateColumn()
  createdAt: Date;
}
