import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AiInquiryServerClient } from './ai-inquiry-server.client';
import { AiAnalysisResult } from './entities/ai-analysis-result.entity';
import { Inquiry } from './entities/inquiry.entity';
import { McpExecutionLog } from './entities/mcp-execution-log.entity';
import { InquiriesController } from './inquiries.controller';
import { InquiriesService } from './inquiries.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inquiry, AiAnalysisResult, McpExecutionLog]),
    AuthModule,
  ],
  controllers: [InquiriesController],
  providers: [InquiriesService, AiInquiryServerClient],
  exports: [InquiriesService, AiInquiryServerClient],
})
export class InquiriesModule {}
