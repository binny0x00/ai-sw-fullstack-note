import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { GithubIssueApprovalDto } from './dto/github-issue-approval.dto';
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
