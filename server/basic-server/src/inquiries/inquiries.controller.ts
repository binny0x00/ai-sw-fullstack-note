import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';

import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { GithubIssueApprovalDto } from './dto/github-issue-approval.dto';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';
import { InquiriesService } from './inquiries.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ManagerGuard } from '../auth/manager.guard';

@Controller('inquiries')
@UseGuards(JwtAuthGuard, ManagerGuard)
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Post()
  create(@Body() createInquiryDto: CreateInquiryDto) {
    return this.inquiriesService.create(createInquiryDto);
  }

  @Get()
  findAll() {
    return this.inquiriesService.findAll();
  }

  @Get('ai-settings')
  getAiSettings() {
    return this.inquiriesService.getAiSettings();
  }

  @Get('rag-status')
  getRagStatus() {
    return this.inquiriesService.getRagStatus();
  }

  @Get('observability')
  getObservabilitySummary() {
    return this.inquiriesService.getObservabilitySummary();
  }

  @Post('doc-recommendations/apply')
  applyDocRecommendation(
    @Body() recommendation: { file: string; suggestion: string },
  ) {
    return this.inquiriesService.applyDocRecommendation(recommendation);
  }

  @Get('docs/:fileName')
  getMarkdownDoc(@Param('fileName') fileName: string) {
    return this.inquiriesService.getMarkdownDoc(fileName);
  }

  @Put('docs/:fileName')
  updateMarkdownDoc(
    @Param('fileName') fileName: string,
    @Body() body: { content: string },
  ) {
    return this.inquiriesService.updateMarkdownDoc(fileName, body.content);
  }

  @Post('ai-settings')
  updateAiSettings(@Body() updateAiSettingsDto: UpdateAiSettingsDto) {
    return this.inquiriesService.updateAiSettings(updateAiSettingsDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inquiriesService.findOne(+id);
  }

  @Post(':id/analyze')
  analyze(@Param('id') id: string) {
    return this.inquiriesService.analyze(+id);
  }

  @Post(':id/github-issue')
  approveGithubIssue(
    @Param('id') id: string,
    @Body() approvalDto: GithubIssueApprovalDto,
  ) {
    return this.inquiriesService.approveGithubIssue(+id, approvalDto);
  }
}
