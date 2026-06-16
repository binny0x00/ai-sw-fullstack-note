export class CreateInquiryDto {
  title!: string;
  body!: string;
  customerEmail?: string;
  postId?: number;
}
