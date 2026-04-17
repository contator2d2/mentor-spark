import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum IntegrationType {
  WHATSAPP = 'whatsapp',
}

export enum IntegrationProvider {
  UAZAPI = 'uazapi',
  EVOLUTION = 'evolution',
}

export enum IntegrationStatus {
  DISCONNECTED = 'disconnected',
  PENDING = 'pending',
  CONNECTED = 'connected',
  ERROR = 'error',
}

/**
 * Integração externa por mentor (multi-tenant).
 * Cada mentor configura sua instância (uazapi/evolution) — fallback global se vazio.
 */
@Entity('mentor_integrations')
@Index(['mentorId', 'type'], { unique: true })
export class MentorIntegration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column({ type: 'enum', enum: IntegrationType })
  type: IntegrationType;

  @Column({ type: 'enum', enum: IntegrationProvider, default: IntegrationProvider.UAZAPI })
  provider: IntegrationProvider;

  /** URL base do uazapi (ex: https://api.uazapi.com) */
  @Column({ nullable: true })
  baseUrl?: string;

  /** Token Bearer da instância */
  @Column({ nullable: true, select: false })
  token?: string;

  /** Nome/ID da instância no uazapi */
  @Column({ nullable: true })
  instanceName?: string;

  @Column({ type: 'enum', enum: IntegrationStatus, default: IntegrationStatus.DISCONNECTED })
  status: IntegrationStatus;

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({ type: 'timestamptz', nullable: true })
  connectedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
