import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import {User} from "../../auth/entities/user.entity";
import {Post} from "./post.entity";

@Entity('comments')
export class Comment{
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    content!: string;

    @Column({name: 'postId'})
    postId!: number;

    @ManyToOne(() => Post, {nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'postId' })
    post!: Post;

    @Column({name: 'userId'})
    userId!: number;

    @ManyToOne(() => User, {nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: User;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}