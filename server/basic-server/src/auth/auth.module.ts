import {Module} from '@nestjs/common';
import {AuthService} from './auth.service';
import {AuthController} from './auth.controller';
import {TypeOrmModule} from '@nestjs/typeorm';
import {User} from './entities/user.entity';
import {JwtModule} from '@nestjs/jwt';
import {ConfigService} from '@nestjs/config';
import {JwtAuthGuard} from './jwt-auth.guard';
import {ManagerGuard} from './manager.guard';

@Module({
    imports: [TypeOrmModule.forFeature([User]),
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: {
                    expiresIn: Number(configService.get<string>('JWT_EXPIRES_IN_SECONDS') ?? 1800),
                },
            }),
        })],
    controllers: [AuthController],
    providers: [AuthService, JwtAuthGuard, ManagerGuard],
    exports: [JwtModule, JwtAuthGuard, ManagerGuard],
})
export class AuthModule {
}
