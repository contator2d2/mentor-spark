import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum PainType { PAIN = 'pain', BOTTLENECK = 'bottleneck', OPPORTUNITY = 'opportunity' }
export enum PainSeverity { LOW = 'low', MEDIUM = 'medium', HIGH = 'high', CRITICAL = 'critical' }
export enum PainStatus { OPEN = 'open', WORKING = 'working', RESOLVED = 'resolved', PERSISTENT = 'persistent' }

@Entity('mentored_pains')
@Index(['recordId'])
@Index(['mentorId'])
export class MentoredPain {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) mentorId: string;
  @Column({ type: 'uuid' }) recordId: string;

  @Column({ type: 'enum', enum: PainType, default: PainType.PAIN })
  type: PainType;

  @Column() title: string;
  @Column({ type: 'text', nullable: true }) description?: string;
  @Column({ nullable: true }) category?: string;

  @Column({ type: 'enum', enum: PainSeverity, default: PainSeverity.MEDIUM })
  severity: PainSeverity;

  @Column({ type: 'enum', enum: PainStatus, default: PainStatus.OPEN })
  status: PainStatus;

  /** Origem: manual, reuniao, teste, ai */
  @Column({ nullable: true }) source?: string;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
