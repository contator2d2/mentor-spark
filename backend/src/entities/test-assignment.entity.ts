import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/** Atribuição de teste a um mentorado/lead específico. Permite o player no painel /me. */
@Entity('test_assignments')
@Index(['leadId'])
@Index(['mentorId'])
export class TestAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column({ type: 'uuid' })
  templateId: string;

  @Column({ type: 'uuid' })
  leadId: string;

  @Column({ type: 'uuid', nullable: true })
  responseId?: string; // setado quando concluído

  @Column({ default: 'pending' })
  status: string; // pending | completed

  @Column({ type: 'timestamptz', nullable: true })
  dueDate?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
