import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { AiAnalysisResult } from './ai-analysis-result.entity';
import { McpExecutionLog } from './mcp-execution-log.entity';

@Entity('inquiries')
export class Inquiry {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'post_id', nullable: true })
  postId?: number;

  @Column('text')
  title!: string;

  @Column('text')
  body!: string;

  @Column('text', { name: 'customer_email', nullable: true })
  customerEmail?: string;

  @Column('text', { default: 'received' })
  status!: string;

  @Column('text', { name: 'inquiry_type', nullable: true })
  inquiryType?: string;

  @Column('text', { nullable: true })
  urgency?: string;

  @Column('text', { name: 'ai_summary', nullable: true })
  aiSummary?: string;

  @Column('text', { name: 'suggested_action', nullable: true })
  suggestedAction?: string;

  @OneToMany(() => AiAnalysisResult, (analysis) => analysis.inquiry)
  analysisResults!: AiAnalysisResult[];

  @OneToMany(() => McpExecutionLog, (log) => log.inquiry)
  mcpExecutionLogs!: McpExecutionLog[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
