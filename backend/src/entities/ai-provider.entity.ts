import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum AiProviderType {
  OPENAI = 'openai',
  GEMINI = 'gemini',
  ANTHROPIC = 'anthropic',
  OPENAI_COMPATIBLE = 'openai_compatible',
}

@Entity('ai_providers')
export class AiProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Nome amigável: "OpenAI Produção", "Gemini Backup" */
  @Column()
  name: string;

  @Column({ type: 'enum', enum: AiProviderType, default: AiProviderType.OPENAI })
  type: AiProviderType;

  /** Chave da API (criptografada idealmente; aqui em texto, atrás de RBAC super_admin) */
  @Column({ type: 'text' })
  apiKey: string;

  /** Endpoint customizado (para openai_compatible: ex. https://openrouter.ai/api/v1) */
  @Column({ nullable: true })
  baseUrl?: string;

  /** Modelo padrão para esse provider: gpt-4o-mini, gemini-2.5-flash, claude-3-5-sonnet, etc. */
  @Column()
  model: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  /** Apenas UM provider pode ser default global. */
  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
