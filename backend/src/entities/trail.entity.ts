import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { TrailModule } from './trail-module.entity';

export enum TrailAccessMode {
  /** Acesso liberado conforme audience (sem cobrança / sem solicitação). */
  OPEN = 'open',
  /** Mentorado precisa solicitar e mentor aprova manualmente. */
  REQUEST = 'request',
  /** Mentorado paga via Asaas para liberar (preço em priceCents). */
  PAID = 'paid',
}

@Entity('trails')
@Index(['mentorId'])
export class Trail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  coverUrl?: string;

  /** Audiência: 'all' | 'prospects' | 'clients' | array de leadIds */
  @Column({ type: 'jsonb', default: '"clients"' })
  audience: any;

  /** Liberação: 'immediate' | 'sequential' (cada módulo libera após o anterior) | 'drip' (por dias) */
  @Column({ default: 'immediate' })
  releaseMode: 'immediate' | 'sequential' | 'drip';

  /** Para 'drip': dias entre módulos */
  @Column({ type: 'int', default: 7 })
  dripDays: number;

  @Column({ default: true })
  certificateEnabled: boolean;

  @Column({ default: true })
  published: boolean;

  // ==================== Acesso por grupos ====================
  /**
   * IDs de access_groups que liberam essa trilha. Vazio = aplica a regra audience.
   * Se houver pelo menos 1 grupo, o lead precisa pertencer a ele OU ter um TrailAccess.
   */
  @Column({ type: 'jsonb', default: '[]' })
  groupIds: string[];

  /** Trilhas que precisam estar concluídas antes de liberar essa. */
  @Column({ type: 'jsonb', default: '[]' })
  prerequisiteTrailIds: string[];

  /** Data fixa: trilha só fica disponível após esta data. */
  @Column({ type: 'timestamptz', nullable: true })
  availableAt?: Date;

  // ==================== Paywall ====================
  @Column({ type: 'enum', enum: TrailAccessMode, default: TrailAccessMode.OPEN })
  accessMode: TrailAccessMode;

  /** Preço em centavos quando accessMode = PAID. */
  @Column({ type: 'int', default: 0 })
  priceCents: number;

  @Column({ default: 'BRL' })
  currency: string;

  /** Texto exibido no card bloqueado para incentivar upgrade/solicitação. */
  @Column({ type: 'text', nullable: true })
  upgradeCallout?: string;

  @OneToMany(() => TrailModule, (m) => m.trail)
  modules?: TrailModule[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
