import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

/** Template de contrato com placeholders {{nome}}, {{cnpj}}, {{valor_plano}} etc. */
@Entity('contract_templates')
@Index(['mentorId'])
export class ContractTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
