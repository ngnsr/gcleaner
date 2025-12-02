import { Module } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { GmailController } from './gmail.controller';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [ConfigModule, AiModule],
  providers: [GmailService],
  controllers: [GmailController],
})
export class GmailModule {}
