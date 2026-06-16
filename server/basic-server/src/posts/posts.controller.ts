import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import {PostsService} from './posts.service';
import {CreatePostDto} from './dto/create-post.dto';
import {UpdatePostDto} from './dto/update-post.dto';
import {PostQueryDto} from "./dto/post-query.dto";
import {CreateCommentDto} from './dto/create-comment.dto';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import type {AuthenticatedRequest} from '../auth/jwt-auth.guard';
import {AiReviewPostDto} from './dto/ai-review-post.dto';
import {AiPrecheckPostDto} from './dto/ai-precheck-post.dto';
import {ManagerGuard} from '../auth/manager.guard';

@Controller('posts')
export class PostsController {
    constructor(private readonly postsService: PostsService) {
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Body() createPostDto: CreatePostDto, @Req() request: AuthenticatedRequest) {
        return this.postsService.create(createPostDto, request.user.sub);
    }

    @Post('ai-precheck')
    @UseGuards(JwtAuthGuard)
    precheckWithAi(@Body() aiPrecheckPostDto: AiPrecheckPostDto) {
        return this.postsService.precheckWithAi(aiPrecheckPostDto);
    }

    @Get()
    findAll(@Query() query: PostQueryDto) {
        return this.postsService.findAll(query);
    }

    @Get(':postId/comments')
    findComments(@Param('postId') postId: string) {
        return this.postsService.findComments(+postId);
    }

    @Get(':id/ai-review/latest')
    @UseGuards(JwtAuthGuard, ManagerGuard)
    findLatestAiReview(@Param('id') id: string) {
        return this.postsService.findLatestAiReview(+id);
    }

    @Post(':postId/comments')
    @UseGuards(JwtAuthGuard)
    createComment(
        @Param('postId') postId: string,
        @Body() createCommentDto: CreateCommentDto,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.postsService.createComment(+postId, createCommentDto, request.user.sub);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.postsService.findOne(+id);
    }

    @Post(':id/ai-review')
    @UseGuards(JwtAuthGuard, ManagerGuard)
    reviewWithAi(@Param('id') id: string, @Body() aiReviewPostDto: AiReviewPostDto) {
        return this.postsService.reviewWithAi(+id, aiReviewPostDto);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    update(
        @Param('id') id: string,
        @Body() updatePostDto: UpdatePostDto,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.postsService.update(+id, updatePostDto, request.user);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
        return this.postsService.remove(+id, request.user);
    }

    @Delete('comments/:commentId')
    @UseGuards(JwtAuthGuard)
    removeComment(
        @Param('commentId') commentId: string,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.postsService.removeComment(+commentId, request.user);
    }
}
