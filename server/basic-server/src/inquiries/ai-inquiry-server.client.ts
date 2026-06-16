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
          action: approvalDto.action ?? 'create',
          issue_number: approvalDto.issueNumber ?? null,
          repository: approvalDto.repository,
        }),
      },
    );
  }

  async getAiSettings() {
    const response = await this.request<RawAiSettingsResponse>('/admin/ai-settings', {
      method: 'GET',
    });

    return toAiSettingsResponse(response);
  }

  getRagStatus() {
    return this.request<RagStatusResponse>('/rag/status', {
      method: 'GET',
    });
  }

  indexPostForRag(post: RagPostIndexRequest) {
    return this.request<RagPostIndexResponse>('/rag/posts', {
      method: 'POST',
      body: JSON.stringify({
        id: post.id,
        title: post.title,
        content: post.content,
        author: post.author,
        tags: post.tags,
      }),
    });
  }

  deletePostFromRag(postId: number) {
    return this.request<{ source: string; deleted: boolean }>(`/rag/posts/${postId}`, {
      method: 'DELETE',
    });
  }

  async precheckPost(post: PostPrecheckRequest) {
    const response = await this.request<RawPostPrecheckResponse>('/posts/precheck', {
      method: 'POST',
      body: JSON.stringify({
        title: post.title,
        content: post.content,
        tag_names: post.tagNames ?? [],
      }),
    });

    return toPostPrecheckResponse(response);
  }

  getObservabilitySummary() {
    return this.request<ObservabilitySummaryResponse>('/admin/observability', {
      method: 'GET',
    });
  }

  applyDocRecommendation(request: DocRecommendationApplyRequest) {
    return this.request<DocRecommendationApplyResponse>(
      '/admin/docs/recommendations/apply',
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
    );
  }

  getMarkdownDoc(fileName: string) {
    return this.request<MarkdownDocReadResponse>(
      `/admin/docs/${encodeURIComponent(fileName)}`,
      {
        method: 'GET',
      },
    );
  }

  updateMarkdownDoc(fileName: string, content: string) {
    return this.request<MarkdownDocUpdateResponse>(
      `/admin/docs/${encodeURIComponent(fileName)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ content }),
      },
    );
  }

  async updateAiSettings(aiSettings: AiSettingsResponse) {
    const response = await this.request<RawAiSettingsResponse>('/admin/ai-settings', {
      method: 'PUT',
      body: JSON.stringify({
        answer_tone: aiSettings.answerTone,
        technical_issue_policy: aiSettings.technicalIssuePolicy,
        escalation_policy: aiSettings.escalationPolicy,
        custom_instructions: aiSettings.customInstructions,
      }),
    });

    return toAiSettingsResponse(response);
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

export type AiSettingsResponse = {
  answerTone: string;
  technicalIssuePolicy: string;
  escalationPolicy: string;
  customInstructions: string;
};

export type RagStatusResponse = {
  collectionName: string;
  documentCount: number;
  embeddingCount: number;
  ready: boolean;
};

export type RagPostIndexRequest = {
  id: number;
  title: string;
  content: string;
  author?: string;
  tags: string[];
};

export type RagPostIndexResponse = {
  source: string;
  chunkCount: number;
  indexed: boolean;
};

export type PostPrecheckRequest = {
  title: string;
  content: string;
  tagNames: string[];
};

export type PostPrecheckResponse = {
  needsMoreInfo: boolean;
  questions: string[];
  suggestedContent?: string | null;
  reason: string;
  category?: string | null;
  references: string[];
};

export type ObservabilitySummaryResponse = {
  api: Record<string, number>;
  agent: Record<string, number>;
  mcp: Record<string, number>;
  recent_steps: Array<Record<string, unknown>>;
};

export type DocRecommendationApplyRequest = {
  file: string;
  suggestion: string;
};

export type DocRecommendationApplyResponse = {
  file: string;
  applied: boolean;
  appended_text: string;
};

export type MarkdownDocReadResponse = {
  file: string;
  content: string;
};

export type MarkdownDocUpdateResponse = {
  file: string;
  content: string;
  updated: boolean;
};

type RawAiSettingsResponse = {
  answer_tone: string;
  technical_issue_policy: string;
  escalation_policy: string;
  custom_instructions: string;
};

type RawPostPrecheckResponse = {
  needs_more_info: boolean;
  questions: string[];
  suggested_content?: string | null;
  reason: string;
  category?: string | null;
  references: string[];
};

function toPostPrecheckResponse(response: RawPostPrecheckResponse): PostPrecheckResponse {
  return {
    needsMoreInfo: response.needs_more_info,
    questions: response.questions,
    suggestedContent: response.suggested_content,
    reason: response.reason,
    category: response.category,
    references: response.references,
  };
}

function toAiSettingsResponse(response: RawAiSettingsResponse): AiSettingsResponse {
  return {
    answerTone: response.answer_tone,
    technicalIssuePolicy: response.technical_issue_policy,
    escalationPolicy: response.escalation_policy,
    customInstructions: response.custom_instructions,
  };
}
