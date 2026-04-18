import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum ContractStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  SIGNED = 'signed',
  CANCELED = 'canceled',
}

/** Contrato gerado a partir de um template para um lead/mentorado. */
@Entity('contracts')
@Index(['mentorId'])
@Index(['leadId'])
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column({ type: 'uuid' })
  leadId: string;

  @Column({ type: 'uuid', nullable: true })
  templateId?: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  bodyResolved: string;

  @Column({ nullable: true })
  pdfPath?: string;

  @Column({ type: 'enum', enum: ContractStatus, default: ContractStatus.DRAFT })
  status: ContractStatus;

  @Column({ type: 'timestamptz', nullable: true })
  signedAt?: Date;

  @Column({ nullable: true })
  signedIp?: string;

  @Column({ nullable: true })
  signedName?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
