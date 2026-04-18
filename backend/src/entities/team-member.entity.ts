import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum TeamRole {
  ADMIN = 'admin',         // gerencia equipe + tudo do mentor
  EDITOR = 'editor',       // gerencia conteúdo, leads, mensagens
  ATTENDANT = 'attendant', // só atende leads e mentorados
}

export enum TeamStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

/**
 * Membro da equipe do mentor. Cria um usuário associado (User.parentMentorId)
 * com role 'mentor_team'. Limite por plano (Plan.maxTeamMembers).
 */
@Entity('team_members')
@Index(['mentorId'])
@Index(['userId'], { unique: true })
export class TeamMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  /** FK para users.id — o usuário criado para esse membro */
  @Column({ type: 'uuid' })
  userId: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ type: 'enum', enum: TeamRole, default: TeamRole.ATTENDANT })
  role: TeamRole;

  @Column({ type: 'enum', enum: TeamStatus, default: TeamStatus.ACTIVE })
  status: TeamStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
