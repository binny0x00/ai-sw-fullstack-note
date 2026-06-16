import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Inquiry } from './inquiry.entity';

@Entity('ai_analysis_results')
export class AiAnalysisResult {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'inquiry_id' })
  inquiryId!: number;

  @ManyToOne(() => Inquiry, (inquiry) => inquiry.analysisResults, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'inquiry_id' })
  inquiry!: Inquiry;

  @Column('text', { name: 'inquiry_type' })
  inquiryType!: string;

  @Column('text')
  urgency!: string;

  @Column('text', { name: 'answer_draft' })
  answerDraft!: string;

  @Column('text', { name: 'suggested_action' })
  suggestedAction!: string;

  @Column('jsonb', { default: [] })
  references!: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
