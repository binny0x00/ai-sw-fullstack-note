import {ForbiddenException, Injectable} from '@nestjs/common';
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
import {AiPrecheckPostDto} from './dto/ai-precheck-post.dto';
import {UserRole} from '../auth/entities/user.entity';
import type {JwtPayload} from '../auth/jwt-auth.guard';
import {Inquiry} from '../inquiries/entities/inquiry.entity';
import {AiAnalysisResult} from '../inquiries/entities/ai-analysis-result.entity';

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
        await this.syncPostEmbedding(savedPost.id);

        return {
            success: true,
            post: savedPost,
        };
    }

    precheckWithAi(aiPrecheckPostDto: AiPrecheckPostDto) {
        return this.inquiriesService.precheckPost({
            title: aiPrecheckPostDto.title,
            content: aiPrecheckPostDto.content,
            tagNames: aiPrecheckPostDto.tagNames ?? [],
        });
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

    async update(id: number, updatePostDto: UpdatePostDto, actor: JwtPayload) {
        const post = await this.postRepository.findOne({
            where: {id},
            relations: {
                tags: true,
            },
        });

        if (!post) {
            return null;
        }

        this.assertCanManage(post.userId, actor);

        if (updatePostDto.title !== undefined) {
            post.title = updatePostDto.title;
        }

        if (updatePostDto.content !== undefined) {
            post.content = updatePostDto.content;
        }

        if (updatePostDto.userId !== undefined && actor.role === UserRole.MANAGER) {
            post.userId = updatePostDto.userId;
        }

        if (updatePostDto.tagNames !== undefined) {
            post.tags = await this.findOrCreateTags(updatePostDto.tagNames);
        }

        const savedPost = await this.postRepository.save(post);
        await this.syncPostEmbedding(savedPost.id);

        return {
            success: true,
            post: savedPost,
        };
    }

    async remove(id: number, actor: JwtPayload) {
        const post = await this.postRepository.findOneBy({id});

        if (!post) {
            return null;
        }

        this.assertCanManage(post.userId, actor);
        await this.deletePostEmbedding(id);

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

    async removeComment(commentId: number, actor: JwtPayload) {
        const comment = await this.commentRepository.findOneBy({id: commentId});

        if (!comment) {
            return null;
        }

        this.assertCanManage(comment.userId, actor);

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
        const analyzedInquiry = await this.inquiriesService.findOne(inquiry.id);

        return this.buildAiReviewResponse(
            post,
            comments.length,
            analyzedInquiry,
            analysis,
            aiReviewPostDto.repository,
        );
    }

    async findLatestAiReview(id: number) {
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

        const inquiry = await this.inquiriesService.findLatestByPostId(id);

        if (!inquiry || !inquiry.analysisResults?.length) {
            return null;
        }

        const comments = await this.findComments(id);
        const latestAnalysis = inquiry.analysisResults[0];

        return this.buildAiReviewResponse(
            post,
            comments.length,
            inquiry,
            latestAnalysis,
        );
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

    private buildAiReviewResponse(
        post: Post,
        commentCount: number,
        inquiry: Inquiry,
        analysis: AiAnalysisResult,
        repository?: string,
    ) {
        const shouldCreateIssue = analysis.suggestedAction === 'github_issue_recommended';
        const mcpSearchLogs = inquiry.mcpExecutionLogs?.filter(
            (log) => log.toolName === 'github_issue_search',
        ) ?? [];
        const githubIssueLog = inquiry.mcpExecutionLogs?.find(
            (log) => (
                ['github_issue', 'github_issue_comment'].includes(log.toolName)
                && log.status !== 'skipped'
            ),
        ) ?? null;
        const {sources, docRecommendations} = this.normalizeAnalysisReferences(
            analysis.references,
        );

        return {
            inquiry,
            analysis: {
                ...analysis,
                references: sources,
            },
            githubIssueLog,
            mcpSearchLogs,
            docRecommendations,
            recommendedAnswer: analysis.answerDraft,
            shouldCreateIssue,
            repository,
            sourcePost: {
                id: post.id,
                title: post.title,
                content: post.content,
                author: post.user?.nickname ?? `user-${post.userId}`,
                tags: post.tags?.map((tag) => tag.name) ?? [],
                commentCount,
            },
        };
    }

    private normalizeAnalysisReferences(references: unknown) {
        if (Array.isArray(references)) {
            return {
                sources: references.map(String),
                docRecommendations: [],
            };
        }

        if (references && typeof references === 'object') {
            const payload = references as {
                sources?: unknown;
                doc_recommendations?: unknown;
                docRecommendations?: unknown;
            };
            const rawSources = Array.isArray(payload.sources) ? payload.sources : [];
            const rawRecommendations = Array.isArray(payload.doc_recommendations)
                ? payload.doc_recommendations
                : Array.isArray(payload.docRecommendations) ? payload.docRecommendations : [];

            return {
                sources: rawSources.map(String),
                docRecommendations: rawRecommendations
                    .map((recommendation) => this.normalizeDocRecommendation(recommendation))
                    .filter((recommendation) => (
                        recommendation.file && recommendation.suggestion
                    )),
            };
        }

        return {
            sources: [],
            docRecommendations: [],
        };
    }

    private normalizeDocRecommendation(recommendation: unknown) {
        if (recommendation && typeof recommendation === 'object') {
            const payload = recommendation as {
                file?: unknown;
                suggestion?: unknown;
            };

            return {
                file: this.isMarkdownFileName(payload.file) ? payload.file : '',
                suggestion:
                    typeof payload.suggestion === 'string'
                        ? payload.suggestion
                        : '',
            };
        }

        return {
            file: '',
            suggestion: typeof recommendation === 'string' ? recommendation : '',
        };
    }

    private isMarkdownFileName(fileName: unknown): fileName is string {
        return typeof fileName === 'string' && /^[^/\\]+\.md$/.test(fileName);
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

    private assertCanManage(ownerId: number, actor: JwtPayload) {
        if (actor.role === UserRole.MANAGER || ownerId === actor.sub) {
            return;
        }

        throw new ForbiddenException('수정 또는 삭제 권한이 없습니다.');
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

    private async syncPostEmbedding(postId: number) {
        const post = await this.postRepository.findOne({
            where: {id: postId},
            relations: {
                user: true,
                tags: true,
            },
        });

        if (!post) {
            return;
        }

        try {
            await this.inquiriesService.indexPostForRag({
                id: post.id,
                title: post.title,
                content: post.content,
                author: post.user?.nickname ?? `user-${post.userId}`,
                tags: post.tags?.map((tag) => tag.name) ?? [],
            });
        } catch {
            // RAG sync is best-effort and must not block board CRUD.
        }
    }

    private async deletePostEmbedding(postId: number) {
        try {
            await this.inquiriesService.deletePostFromRag(postId);
        } catch {
            // RAG sync is best-effort and must not block board CRUD.
        }
    }
}
