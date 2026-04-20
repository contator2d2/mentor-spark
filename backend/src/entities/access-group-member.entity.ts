import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique,
} from 'typeorm';

/**
 * Vínculo manual entre lead e grupo. Para grupos dinâmicos (EVENT/TAG/PLAN)
 * a membership é calculada em tempo real e ESTA tabela funciona apenas como
 * exceções/inclusões manuais adicionais.
 */
@Entity('access_group_members')
@Unique(['groupId', 'leadId'])
@Index(['groupId'])
@Index(['leadId'])
export class AccessGroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  groupId: string;

  @Column({ type: 'uuid' })
  leadId: string;

  @CreateDateColumn()
  createdAt: Date;
}