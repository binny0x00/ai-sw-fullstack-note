import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialBoardAiSchema1781590000000 implements MigrationInterface {
  name = 'InitialBoardAiSchema1781590000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nickname character varying NOT NULL,
        email character varying NOT NULL UNIQUE,
        password character varying NOT NULL,
        role character varying NOT NULL DEFAULT 'USER',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        title character varying NOT NULL,
        content character varying NOT NULL,
        "userId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        content character varying NOT NULL,
        "postId" integer NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        "userId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name character varying NOT NULL UNIQUE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS post_tags (
        "postId" integer NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        "tagId" integer NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY ("postId", "tagId")
      )
    `);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS inquiries (
        id BIGSERIAL PRIMARY KEY,
        post_id BIGINT,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        customer_email TEXT,
        status TEXT NOT NULL DEFAULT 'received',
        inquiry_type TEXT,
        urgency TEXT,
        ai_summary TEXT,
        suggested_action TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_analysis_results (
        id BIGSERIAL PRIMARY KEY,
        inquiry_id BIGINT NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
        inquiry_type TEXT NOT NULL,
        urgency TEXT NOT NULL,
        answer_draft TEXT NOT NULL,
        suggested_action TEXT NOT NULL,
        "references" JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mcp_execution_logs (
        id BIGSERIAL PRIMARY KEY,
        inquiry_id BIGINT NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
        tool_name TEXT NOT NULL,
        status TEXT NOT NULL,
        request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS mcp_execution_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_analysis_results`);
    await queryRunner.query(`DROP TABLE IF EXISTS inquiries`);
    await queryRunner.query(`DROP TABLE IF EXISTS post_tags`);
    await queryRunner.query(`DROP TABLE IF EXISTS tags`);
    await queryRunner.query(`DROP TABLE IF EXISTS comments`);
    await queryRunner.query(`DROP TABLE IF EXISTS posts`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
  }
}
