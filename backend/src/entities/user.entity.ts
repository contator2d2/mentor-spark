import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne } from 'typeorm';
import { Lead } from './lead.entity';
import { TestTemplate } from './test-template.entity';
import { MentorAiConfig } from './mentor-ai-config.entity';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  MENTOR = 'mentor',
  MENTOR_TEAM = 'mentor_team',
  MENTORADO = 'mentorado',
  PROSPECT = 'prospect',
}

export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  /** Slug público para a página de captação do mentor (ex: /c/joao-silva) */
  @Column({ unique: true, nullable: true })
  slug?: string;

  /** Para mentores: nome da plataforma white-label */
  @Column({ nullable: true })
  brandName?: string;

  @Column({ nullable: true })
  brandLogoUrl?: string;

  /** Cor primária HSL ou hex usada no white-label (ex: '222 47% 18%' ou '#1e3a8a') */
  @Column({ nullable: true })
  brandPrimaryColor?: string;

  /** Cor de destaque/acento do tema do mentor */
  @Column({ nullable: true })
  brandAccentColor?: string;

  /** Domínio customizado (ex: 'app.joaomentor.com.br') resolvido por host */
  @Column({ unique: true, nullable: true })
  customDomain?: string;

  /** Onboarding concluído (mentor já configurou branding mínimo) */
  @Column({ default: false })
  onboardingCompleted: boolean;

  /** Quando true, força a troca de senha no próximo login (senha temporária). */
  @Column({ default: false })
  mustChangePassword: boolean;

  /** Última vez que recebeu credenciais temporárias por WhatsApp/email. */
  @Column({ type: 'timestamptz', nullable: true })
  credentialsSentAt?: Date;

  /** Para PROSPECT/MENTORADO: id do mentor dono (multi-tenant) */
  @Column({ type: 'uuid', nullable: true })
  mentorId?: string;

  /** Para MENTOR_TEAM: id do mentor pai (mesma multi-tenancy do mentor) */
  @Column({ type: 'uuid', nullable: true })
  parentMentorId?: string;

  /** Sub-role do membro da equipe (admin/editor/attendant) */
  @Column({ nullable: true })
  teamRole?: string;

  /** IDs dos kanbans que este membro da equipe pode ver. Null = todos. */
  @Column({ type: 'jsonb', nullable: true })
  allowedKanbanIds?: string[];

  @Column({ nullable: true })
  company?: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  revenue?: number;

  /** Plano atual do mentor (FK para plans.id). Null = sem plano (free implícito) */
  @Column({ type: 'uuid', nullable: true })
  planId?: string;

  /** Data de expiração do plano (renovação manual por enquanto) */
  @Column({ type: 'timestamptz', nullable: true })
  planExpiresAt?: Date;

  /** Tipo de cobrança do plano SaaS: 'monthly' (mensal recorrente) | 'upfront' (à vista, lump-sum) */
  @Column({ nullable: true })
  planBillingType?: string;

  /** Métodos de pagamento aceitos para a cobrança do plano. Ex: ['pix','boleto','credit_card'] */
  @Column({ type: 'jsonb', nullable: true })
  planPaymentMethods?: string[];

  /** Dia do mês para vencimento da mensalidade (1-28). Usado quando billingType=monthly. */
  @Column({ type: 'int', nullable: true })
  planDueDay?: number;

  /** Valor combinado para o plano (override do preço padrão do plano). Null = usa priceMonthly do plano. */
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  planAmount?: number;

  /** Observação interna do super admin sobre a cobrança do plano deste mentor */
  @Column({ type: 'text', nullable: true })
  planNotes?: string;

  /** Stripe customer ID — criado no primeiro checkout */
  @Column({ nullable: true })
  stripeCustomerId?: string;

  /** Tokens OAuth Google Calendar do mentor (criptografar idealmente) */
  @Column({ type: 'jsonb', nullable: true, select: false })
  googleTokens?: { access_token: string; refresh_token?: string; expiry_date?: number };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Lead, (lead) => lead.mentor)
  leads?: Lead[];

  @OneToMany(() => TestTemplate, (t) => t.mentor)
  testTemplates?: TestTemplate[];

  @OneToOne(() => MentorAiConfig, (c) => c.mentor)
  aiConfig?: MentorAiConfig;
}
