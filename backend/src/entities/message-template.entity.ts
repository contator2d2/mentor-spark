import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { MessageChannel, MessageAttachment } from './message.entity';

export enum MessageTemplateCategory {
  WELCOME = 'welcome',
  FOLLOWUP = 'followup',
  EVENT = 'event',
  REMINDER = 'reminder',
  SALES = 'sales',
  ONBOARDING = 'onboarding',
  REENGAGE = 'reengage',
  THANKYOU = 'thankyou',
  CUSTOM = 'custom',
}

@Entity('message_templates')
@Index(['mentorId'])
export class MessageTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** mentorId nulo => template global (biblioteca) */
  @Column({ type: 'uuid', nullable: true })
  mentorId?: string | null;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: MessageChannel })
  channel: MessageChannel;

  @Column({ type: 'enum', enum: MessageTemplateCategory, default: MessageTemplateCategory.CUSTOM })
  category: MessageTemplateCategory;

  @Column({ nullable: true })
  subject?: string;

  /** Suporta variáveis {{nome}}, {{empresa}}, {{primeiro_nome}}, {{mentor}} */
  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'jsonb', nullable: true })
  attachments?: MessageAttachment[];

  @Column({ default: true })
  enabled: boolean;

  /** Indica se é um template seed/biblioteca (não pode ser deletado pelo mentor) */
  @Column({ default: false })
  isLibrary: boolean;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
