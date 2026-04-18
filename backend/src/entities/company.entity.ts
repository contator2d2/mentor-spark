import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Lead } from './lead.entity';

/**
 * Empresa (entidade jurídica) — opcional.
 * Usada quando o lead/mentorado é sócio de uma empresa que também precisa
 * ter prontuário próprio (dados fiscais, contratos, sócios vinculados).
 */
@Entity('companies')
@Index(['mentorId'])
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mentorId' })
  mentor: User;

  // ---- Identificação
  @Column()
  legalName: string; // razão social

  @Column({ nullable: true })
  tradeName?: string; // nome fantasia

  @Column({ nullable: true })
  cnpj?: string;

  @Column({ nullable: true })
  stateRegistration?: string; // inscrição estadual

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  website?: string;

  // ---- Endereço
  @Column({ nullable: true })
  addressZip?: string;

  @Column({ nullable: true })
  addressStreet?: string;

  @Column({ nullable: true })
  addressNumber?: string;

  @Column({ nullable: true })
  addressComplement?: string;

  @Column({ nullable: true })
  addressNeighborhood?: string;

  @Column({ nullable: true })
  addressCity?: string;

  @Column({ nullable: true })
  addressState?: string;

  // ---- Perfil de negócio
  @Column({ nullable: true })
  segment?: string;

  @Column({ type: 'int', nullable: true })
  employees?: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  revenue?: number;

  @Column({ type: 'text', nullable: true })
  challenges?: string;

  @Column({ type: 'text', nullable: true })
  goals?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Lead, (l) => l.company)
  partners?: Lead[];
}
