/*애플리케이션 구조를 구성하는 데 사용하는 메타데이터 제공
*
* imports, controllers, providers, exports 총 4가지 속성
* */
import {Module} from '@nestjs/common';
import {AppController} from './app.controller';
import {AppService} from './app.service';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {AuthModule} from "./auth/auth.module";
import {TypeOrmModule} from "@nestjs/typeorm";
import {typeOrmConfig} from "./config/typeorm.config";
import {PostsModule} from './posts/posts.module';

@Module({
    imports: [
        ConfigModule.forRoot({isGlobal: true}),
        AuthModule,
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: typeOrmConfig,
        }),
        PostsModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {
}
