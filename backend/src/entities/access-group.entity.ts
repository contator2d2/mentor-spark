import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum AccessGroupKind {
  /** Membros adicionados manualmente (lista de leadIds em access_group_members). */
  MANUAL = 'manual',
  /** Auto-povoado por inscritos / check-ins de um evento (filter.eventId). */
  EVENT = 'event',
  /** Auto-povoado por leads cuja `source` bate com filter.tag (case-insensitive). */
  TAG = 'tag',
  /** Auto-povoado por mentorados ativos com mentor_subscription do plano filter.planId. */
  PLAN = 'plan',
}

/**
 * Grupo de acesso usado para liberar trilhas/conteúdos para conjuntos de leads/mentorados.
 * Os grupos são SEMPRE escopados ao mentor (multi-tenant).
 */
@Entity('access_groups')
@Index(['mentorId'])
export class AccessGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  color?: string;

  @Column({ type: 'enum', enum: AccessGroupKind, default: AccessGroupKind.MANUAL })
  kind: AccessGroupKind;

  /**
   * Filtros do grupo dinâmico:
   *  - EVENT  → { eventId, includeNoShow?: boolean }
   *  - TAG    → { tag } (compara com lead.source / lead.notes)
   *  - PLAN   → { planId }
   */
  @Column({ type: 'jsonb', default: '{}' })
  filter: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}