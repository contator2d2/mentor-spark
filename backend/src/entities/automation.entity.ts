import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/** Trigger types — disparados por eventos do sistema */
export type AutomationTrigger =
  | 'lead_created'
  | 'test_submitted'
  | 'test_classification' // hot/warm/cold
  | 'lead_stage_changed'
  | 'lead_no_activity_days';

/** Action types — executados quando o trigger casa */
export type AutomationAction =
  | 'send_content'
  | 'create_task'
  | 'send_whatsapp'
  | 'send_email'
  | 'change_lead_stage'
  | 'notify_mentor';

export interface AutomationNode {
  id: string;
  kind: 'trigger' | 'action';
  type: AutomationTrigger | AutomationAction;
  config: any; // payload específico de cada tipo
  position?: { x: number; y: number }; // pra renderizar no canvas
  next?: string[]; // ids dos próximos nós
}

/** Automação visual (nós conectados) */
@Entity('automations')
@Index(['mentorId'])
export class Automation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: true })
  enabled: boolean;

  /** Grafo de nós: [{id, kind:'trigger', type:'test_submitted', config:{...}, next:['n2']}, ...] */
  @Column({ type: 'jsonb', default: '[]' })
  nodes: AutomationNode[];

  @Column({ type: 'int', default: 0 })
  runCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastRunAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
