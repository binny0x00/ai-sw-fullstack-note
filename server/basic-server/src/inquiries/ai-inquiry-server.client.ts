import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { GithubIssueApprovalDto } from './dto/github-issue-approval.dto';

@Injectable()
export class AiInquiryServerClient {
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('AI_SERVER_BASE_URL') ??
      'http://localhost:8000';
  }

  createInquiry(createInquiryDto: CreateInquiryDto) {
    return this.request<AiInquiryResponse>('/inquiries', {
      method: 'POST',
        body: JSON.stringify({
        title: createInquiryDto.title,
        body: createInquiryDto.body,
        customer_email: createInquiryDto.customerEmail || null,
        post_id: createInquiryDto.postId ?? null,
      }),
    });
  }

  analyzeInquiry(inquiryId: number) {
    return this.request<AiAnalysisResponse>(
      `/inquiries/${inquiryId}/analyze`,
      {
        method: 'POST',
      },
    );
  }

  approveGithubIssue(inquiryId: number, approvalDto: GithubIssueApprovalDto) {
    return this.request<AiMcpLogResponse>(
      `/inquiries/${inquiryId}/github-issue`,
      {
        method: 'POST',
        body: JSON.stringify({
          approved: approvalDto.approved,
          repository: approvalDto.repository,
        }),
      },
    );
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      const message = await response.text();
      throw new ServiceUnavailableException(
        `AI inquiry server request failed: ${message}`,
      );
    }

    return response.json() as Promise<T>;
  }
}

export type AiInquiryResponse = {
  id: number;
  post_id?: number | null;
  status: string;
  inquiry_type?: string | null;
  urgency?: string | null;
  ai_summary?: string | null;
  suggested_action?: string | null;
};

export type AiAnalysisResponse = {
  inquiry_id: number;
  inquiry_type: string;
  urgency: string;
  answer_draft: string;
  suggested_action: string;
  references: string[];
};

export type AiMcpLogResponse = {
  id: number;
  tool_name: string;
  status: string;
  request_payload: Record<string, unknown>;
  response_payload: Record<string, unknown>;
  created_at: string;
};
