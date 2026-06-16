export class GithubIssueApprovalDto {
  approved!: boolean;
  action?: 'create' | 'comment';
  issueNumber?: number;
  repository?: string;
}
