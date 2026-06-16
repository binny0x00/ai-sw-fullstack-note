import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {ILike, In, Repository} from 'typeorm';
import {CreatePostDto} from './dto/create-post.dto';
import {UpdatePostDto} from './dto/update-post.dto';
import {Post} from './entities/post.entity';
import {PostQueryDto} from './dto/post-query.dto';
import {Comment} from './entities/comment.emtity';
import {CreateCommentDto} from './dto/create-comment.dto';
import {Tag} from './entities/tag.entity';
import {InquiriesService} from '../inquiries/inquiries.service';
import {AiReviewPostDto} from './dto/ai-review-post.dto';

@Injectable()
export class PostsService {
    constructor(
        @InjectRepository(Post)
        private readonly postRepository: Repository<Post>,
        @InjectRepository(Comment)
        private readonly commentRepository: Repository<Comment>,
        @InjectRepository(Tag)
        private readonly tagRepository: Repository<Tag>,
        private readonly inquiriesService: InquiriesService,
    ) {
    }

    async create(createPostDto: CreatePostDto, userId: number) {
        const tags = await this.findOrCreateTags(createPostDto.tagNames);

        const post = this.postRepository.create({
            title: createPostDto.title,
            content: createPostDto.content,
            userId,
            tags,
        });

        const savedPost = await this.postRepository.save(post);

        return {
            success: true,
            post: savedPost,
        };
    }

    async findAll(query: PostQueryDto) {
        const page = Number(query.page ?? 1);
        const limit = Number(query.limit ?? 10);
        const keyword = query.keyword?.trim();

        const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
        const safeLimit = Number.isNaN(limit) || limit < 1 ? 10 : limit;

        const where = keyword
            ? [
                {title: ILike(`%${keyword}%`)},
                {content: ILike(`%${keyword}%`)},
            ]
            : undefined;

        const [items, total] = await this.postRepository.findAndCount({
            where,
            relations: {
                user: true,
                tags: true,
            },
            order: {
                createdAt: 'DESC',
            },
            skip: (safePage - 1) * safeLimit,
            take: safeLimit,
        });

        return {
            items,
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil(total / safeLimit),
        }
    }

    findOne(id: number) {
        return this.postRepository.findOne({
            where: {id},
            relations: {
                user: true,
                tags: true,
            },
        });
    }

    async update(id: number, updatePostDto: UpdatePostDto) {
        const post = await this.postRepository.findOne({
            where: {id},
            relations: {
                tags: true,
            },
        });

        if (!post) {
            return null;
        }

        if (updatePostDto.title !== undefined) {
            post.title = updatePostDto.title;
        }

        if (updatePostDto.content !== undefined) {
            post.content = updatePostDto.content;
        }

        if (updatePostDto.userId !== undefined) {
            post.userId = updatePostDto.userId;
        }

        if (updatePostDto.tagNames !== undefined) {
            post.tags = await this.findOrCreateTags(updatePostDto.tagNames);
        }

        const savedPost = await this.postRepository.save(post);

        return {
            success: true,
            post: savedPost,
        };
    }

    remove(id: number) {
        return this.postRepository.delete(id);
    }

    findComments(postId: number) {
        return this.commentRepository.find({
            where: {postId},
            relations: {
                user: true,
            },
            order: {
                createdAt: 'ASC',
            },
        });
    }

    async createComment(postId: number, createCommentDto: CreateCommentDto, userId: number) {
        const comment = this.commentRepository.create({
            postId,
            content: createCommentDto.content,
            userId,
        });

        const savedComment = await this.commentRepository.save(comment);

        return {
            success: true,
            comment: savedComment,
        };
    }

    removeComment(commentId: number) {
        return this.commentRepository.delete(commentId);
    }

    async reviewWithAi(id: number, aiReviewPostDto: AiReviewPostDto) {
        const post = await this.postRepository.findOne({
            where: {id},
            relations: {
                user: true,
                tags: true,
            },
        });

        if (!post) {
            return null;
        }

        const comments = await this.findComments(id);
        const inquiry = await this.inquiriesService.create({
            title: `[게시글 AI 검토] ${post.title}`,
            body: this.buildPostInquiryBody(post, comments),
            customerEmail: post.user?.email,
            postId: post.id,
        });
        const analysis = await this.inquiriesService.analyze(inquiry.id);
        const shouldCreateIssue =
            aiReviewPostDto.autoCreateIssue !== false
            && analysis.suggestedAction === 'github_issue_recommended';
        const githubIssueLog = shouldCreateIssue
            ? await this.inquiriesService.approveGithubIssue(inquiry.id, {
                approved: true,
                repository: aiReviewPostDto.repository,
            })
            : null;

        return {
            inquiry,
            analysis,
            githubIssueLog,
            recommendedAnswer: analysis.answerDraft,
            shouldCreateIssue,
        };
    }

    private normalizeTagNames(tagNames?: string[]) {
        return [
            ...new Set(
                (tagNames ?? [])
                    .map((tagName) => tagName.trim().toLowerCase())
                    .filter(Boolean),
            ),
        ];
    }

    private async findOrCreateTags(tagNames?: string[]) {
        const names = this.normalizeTagNames(tagNames);

        if (names.length === 0) {
            return [];
        }

        const existingTags = await this.tagRepository.find({
            where: {
                name: In(names),
            },
        });
        const existingNames = new Set(existingTags.map((tag) => tag.name));
        const newTags = names
            .filter((name) => !existingNames.has(name))
            .map((name) => this.tagRepository.create({name}));
        const savedNewTags = newTags.length > 0
            ? await this.tagRepository.save(newTags)
            : [];

        return [...existingTags, ...savedNewTags];
    }

    private buildPostInquiryBody(post: Post, comments: Comment[]) {
        const tagText = post.tags?.map((tag) => `#${tag.name}`).join(' ') || '없음';
        const commentText = comments.length > 0
            ? comments
                .map((comment) => {
                    const author = comment.user?.nickname ?? `user-${comment.userId}`;
                    return `- ${author}: ${comment.content}`;
                })
                .join('\n')
            : '아직 댓글이 없습니다.';

        return [
            '게시판에 등록된 문의성 게시글입니다.',
            '',
            '## 게시글',
            `제목: ${post.title}`,
            `작성자: ${post.user?.nickname ?? post.userId}`,
            `태그: ${tagText}`,
            '',
            post.content,
            '',
            '## 댓글 대화',
            commentText,
            '',
            '## AI 검토 기준',
            '- 이전 문의와 유사하면 참고 문서를 근거로 담당자 답변 초안을 작성합니다.',
            '- 실제 버그나 개발 조치가 필요하면 GitHub Issue 생성을 권장합니다.',
            '- 단순 사용 문의면 담당자가 댓글로 답변할 수 있도록 안내합니다.',
        ].join('\n');
    }
}
