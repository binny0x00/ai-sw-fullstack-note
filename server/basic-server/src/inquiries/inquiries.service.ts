import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AiInquiryServerClient } from './ai-inquiry-server.client';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { GithubIssueApprovalDto } from './dto/github-issue-approval.dto';
import { AiAnalysisResult } from './entities/ai-analysis-result.entity';
import { Inquiry } from './entities/inquiry.entity';
import { McpExecutionLog } from './entities/mcp-execution-log.entity';

@Injectable()
export class InquiriesService {
  constructor(
    @InjectRepository(Inquiry)
    private readonly inquiryRepository: Repository<Inquiry>,
    @InjectRepository(AiAnalysisResult)
    private readonly analysisRepository: Repository<AiAnalysisResult>,
    @InjectRepository(McpExecutionLog)
    private readonly mcpLogRepository: Repository<McpExecutionLog>,
    private readonly aiServerClient: AiInquiryServerClient,
  ) {}

  async create(createInquiryDto: CreateInquiryDto) {
    const aiInquiry = await this.aiServerClient.createInquiry(createInquiryDto);
    const inquiry = await this.inquiryRepository.findOneBy({
      id: aiInquiry.id,
    });

    if (!inquiry) {
      throw new NotFoundException('AI inquiry was not saved in shared DB');
    }

    return inquiry;
  }

  findAll() {
    return this.inquiryRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: number) {
    const inquiry = await this.inquiryRepository.findOne({
      where: { id },
      relations: {
        analysisResults: true,
        mcpExecutionLogs: true,
      },
      order: {
        analysisResults: {
          createdAt: 'DESC',
        },
        mcpExecutionLogs: {
          createdAt: 'DESC',
        },
      },
    });

    if (!inquiry) {
      throw new NotFoundException('Inquiry not found');
    }

    return inquiry;
  }

  async findLatestByPostId(postId: number) {
    const inquiry = await this.inquiryRepository.findOne({
      where: { postId },
      relations: {
        analysisResults: true,
        mcpExecutionLogs: true,
      },
      order: {
        createdAt: 'DESC',
        analysisResults: {
          createdAt: 'DESC',
        },
        mcpExecutionLogs: {
          createdAt: 'DESC',
        },
      },
    });

    return inquiry;
  }

  async analyze(id: number) {
    const inquiry = await this.findOne(id);

    await this.aiServerClient.analyzeInquiry(inquiry.id);
    const analysis = await this.analysisRepository.findOne({
      where: {
        inquiryId: inquiry.id,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!analysis) {
      throw new NotFoundException('AI analysis was not saved in shared DB');
    }

    return analysis;
  }

  async approveGithubIssue(id: number, approvalDto: GithubIssueApprovalDto) {
    const inquiry = await this.findOne(id);

    await this.aiServerClient.approveGithubIssue(inquiry.id, approvalDto);
    const log = await this.mcpLogRepository.findOne({
      where: {
        inquiryId: inquiry.id,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!log) {
      throw new NotFoundException('MCP execution log was not saved in shared DB');
    }

    return log;
  }

  getAiSettings() {
    return this.aiServerClient.getAiSettings();
  }

  getRagStatus() {
    return this.aiServerClient.getRagStatus();
  }

  indexPostForRag(post: {
    id: number;
    title: string;
    content: string;
    author?: string;
    tags: string[];
  }) {
    return this.aiServerClient.indexPostForRag(post);
  }

  deletePostFromRag(postId: number) {
    return this.aiServerClient.deletePostFromRag(postId);
  }

  precheckPost(post: { title: string; content: string; tagNames: string[] }) {
    return this.aiServerClient.precheckPost(post);
  }

  getObservabilitySummary() {
    return this.aiServerClient.getObservabilitySummary();
  }

  applyDocRecommendation(recommendation: { file: string; suggestion: string }) {
    return this.aiServerClient.applyDocRecommendation(recommendation);
  }

  getMarkdownDoc(fileName: string) {
    return this.aiServerClient.getMarkdownDoc(fileName);
  }

  updateMarkdownDoc(fileName: string, content: string) {
    return this.aiServerClient.updateMarkdownDoc(fileName, content);
  }

  updateAiSettings(aiSettings: {
    answerTone: string;
    technicalIssuePolicy: string;
    escalationPolicy: string;
    customInstructions: string;
  }) {
    return this.aiServerClient.updateAiSettings(aiSettings);
  }
}
