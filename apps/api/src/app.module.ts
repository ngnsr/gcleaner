import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { GmailModule } from './gmail/gmail.module';
import { AiModule } from './ai/ai.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env`],
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        API_DOCS_ENABLED: Joi.bool().default(false),
        GOOGLE_CLIENT_ID: Joi.string().required(),
        GOOGLE_CLIENT_SECRET: Joi.string().required(),
        GOOGLE_REDIRECT_URI: Joi.string().uri().required(),
        OPENAI_API_KEY: Joi.string().required(),
      }),
    }),
    GmailModule,
    AiModule,
    PrismaModule,
  ],
})
export class AppModule {}
