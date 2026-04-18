import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique } from 'typeorm';

@Entity('prompt_library')
@Index(['mentorId'])
@Unique('uq_prompt_mentor_seed', ['mentorId', 'seedKey'])
export class Prompt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ nullable: true })
  category?: string;

  /** Identificador estável para seeds de sistema (idempotência) */
  @Column({ nullable: true })
  seedKey?: string;

  /** Marca prompts entregues pelo sistema (não editáveis por padrão) */
  @Column({ default: false })
  isSystem: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
