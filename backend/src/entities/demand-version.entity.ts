import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Demand } from './demand.entity';
import { User } from './user.entity';

@Entity('demand_versions')
@Index(['demandId'])
export class DemandVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  demandId: string;

  @ManyToOne(() => Demand, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'demandId' })
  demand?: Demand;

  @Column()
  versionNumber: number;

  @Column({ type: 'uuid' })
  createdByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdByUserId' })
  creator?: User;

  @Column({ type: 'jsonb', nullable: true })
  files?: any[]; // { url, name, size, type }

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @CreateDateColumn()
  createdAt: Date;
}
