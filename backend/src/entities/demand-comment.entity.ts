import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Demand } from './demand.entity';
import { User } from './user.entity';

@Entity('demand_comments')
@Index(['demandId'])
export class DemandComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  demandId: string;

  @ManyToOne(() => Demand, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'demandId' })
  demand?: Demand;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'jsonb', nullable: true })
  attachments?: any[];

  @CreateDateColumn()
  createdAt: Date;
}
