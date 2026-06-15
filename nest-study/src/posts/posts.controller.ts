import {
    Body, // 요청 body를 메서드 파라미터로 주입할 때 사용합니다.
    Controller, // 이 클래스가 HTTP 요청을 처리하는 Controller임을 Nest에 알려줍니다.
    Delete, // DELETE 요청 라우트를 만들 때 사용합니다.
    Get,   // GET 요청 라우트를 만들 때 사용합니다.
    HttpCode, // 응답 HTTP status code를 직접 지정할 때 사용합니다.
    Param,   // URL path parameter 값을 메서드 파라미터로 주입할 때 사용합니다.
    ParseUUIDPipe,   // id 값이 UUID 형식인지 검증하고, 아니면 400 Bad Request를 발생시킵니다.
    Patch,   // PATCH 요청 라우트를 만들 때 사용합니다.
    Post,   // POST 요청 라우트를 만들 때 사용합니다.
    Query,   // query string 값을 메서드 파라미터로 주입할 때 사용합니다.

} from '@nestjs/common';
// 게시글 생성 요청 body의 타입과 validation 규칙입니다.
import type {CreatePostDto} from './dto/create-post.dto';
// 게시글 목록 조회 query string의 타입과 validation 규칙입니다.
import type {PostQueryDto} from './dto/post-query.dto';
// 게시글 수정 요청 body의 타입과 validation 규칙입니다.
import type {UpdatePostDto} from './dto/update-post.dto';

// Controller가 실제 비즈니스 로직을 위임할 Service입니다.
import {PostsService} from './posts.service';

// 이 Controller의 기본 URL prefix를 /posts로 지정합니다.
@Controller('posts')
export class PostsController {
    // `constructor`: 클래스가 만들어질 때 실행되는 함수
    // PostsService는 Nest DI 컨테이너가 생성해서 주입합니다.
    // `private readonly` 선언 이유: 1) TS에서는 생성자 파라미터 앞에 private, public, protected, readonly 같은 접근 제어자를 붙이면 그 파라미터가 자동으로 **클래스 프로퍼티**가 됨
    // 2) 내부에서만 사용 명시
    constructor(private readonly postsService: PostsService) {
    }

    // POST /posts 요청을 처리합니다. 새 게시글을 생성합니다.
    @Post()
    // @Body()는 JSON body를 CreatePostDto 타입의 dto 파라미터로 전달합니다.
    create(@Body() dto: CreatePostDto) {
        return this.postsService.create(dto);
    }

    // GET /posts 요청을 처리합니다. 게시글 목록을 조회합니다.
    @Get()
    // @Query()는 page, limit, keyword 같은 query string 값을 query 파라미터로 전달합니다.
    findAll(@Query() query: PostQueryDto) {
        return this.postsService.findAll(query);
    }

    // GET /posts/:id 요청을 처리합니다. 특정 게시글 하나를 조회합니다.
    @Get(':id')
    // @Param('id', ParseUUIDPipe)는 URL의 id 값을 가져오고 UUID 형식인지 검증합니다.
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.postsService.findOne(id);
    }

    // PATCH /posts/:id 요청을 처리합니다. 특정 게시글을 일부 수정합니다.
    @Patch(':id')
    // id는 URL에서, dto는 요청 body에서 받습니다.
    update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePostDto) {
        return this.postsService.update(id, dto);
    }

    // DELETE /posts/:id 요청을 처리합니다. 특정 게시글을 삭제합니다.
    @Delete(':id')
    // 삭제 성공 시 응답 body 없이 204 No Content를 반환합니다.
    @HttpCode(204)
    // 삭제 대상 id를 URL path parameter에서 가져오고 UUID인지 검증합니다.
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.postsService.remove(id);
    }
}
