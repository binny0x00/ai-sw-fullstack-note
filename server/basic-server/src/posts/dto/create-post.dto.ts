export class CreatePostDto {
  title!: string;
  content!: string;
  userId!: number;
  tagNames?: string[];
}
