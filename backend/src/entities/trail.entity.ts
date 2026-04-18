import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { TrailModule } from './trail-module.entity';

@Entity('trails')
@Index(['mentorId'])
export class Trail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  coverUrl?: string;

  /** Audiência: 'all' | 'prospects' | 'clients' | array de leadIds */
  @Column({ type: 'jsonb', default: '"clients"' })
  audience: any;

  /** Liberação: 'immediate' | 'sequential' (cada módulo libera após o anterior) | 'drip' (por dias) */
  @Column({ default: 'immediate' })
  releaseMode: 'immediate' | 'sequential' | 'drip';

  /** Para 'drip': dias entre módulos */
  @Column({ type: 'int', default: 7 })
  dripDays: number;

  @Column({ default: true })
  certificateEnabled: boolean;

  @Column({ default: true })
  published: boolean;

  @OneToMany(() => TrailModule, (m) => m.trail)
  modules?: TrailModule[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
