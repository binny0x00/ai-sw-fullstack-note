import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Inquiry } from './inquiry.entity';

@Entity('mcp_execution_logs')
export class McpExecutionLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'inquiry_id' })
  inquiryId!: number;

  @ManyToOne(() => Inquiry, (inquiry) => inquiry.mcpExecutionLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'inquiry_id' })
  inquiry!: Inquiry;

  @Column('text', { name: 'tool_name' })
  toolName!: string;

  @Column('text')
  status!: string;

  @Column('jsonb', { name: 'request_payload', default: {} })
  requestPayload!: Record<string, unknown>;

  @Column('jsonb', { name: 'response_payload', default: {} })
  responsePayload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
