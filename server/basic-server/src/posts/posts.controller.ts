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

    @Get()
    findAll(@Query() query: PostQueryDto) {
        return this.postsService.findAll(query);
    }

    @Get(':postId/comments')
    findComments(@Param('postId') postId: string) {
        return this.postsService.findComments(+postId);
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
    update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
        return this.postsService.update(+id, updatePostDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Param('id') id: string) {
        return this.postsService.remove(+id);
    }

    @Delete('comments/:commentId')
    @UseGuards(JwtAuthGuard)
    removeComment(@Param('commentId') commentId: string) {
        return this.postsService.removeComment(+commentId);
    }
}
