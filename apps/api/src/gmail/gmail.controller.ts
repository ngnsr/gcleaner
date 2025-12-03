import {
  Controller,
  Get,
  Query,
  Headers,
  UnauthorizedException,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GmailService } from './gmail.service';
import { ListEmailsDto } from './dto/list-email.dto';
import { CallbackDto } from './dto/callback.dto';
import { AiService } from 'src/ai/ai.service';

@ApiTags('gmail')
@Controller('gmail')
export class GmailController {
  constructor(
    private readonly gmailService: GmailService,
    private readonly aiService: AiService,
  ) {}

  @Get('auth-url')
  getAuthUrl() {
    return { url: this.gmailService.getAuthUrl() };
  }

  @Get('callback')
  async callback(@Query() query: CallbackDto) {
    const tokens = await this.gmailService.getTokens(query.code);
    return tokens;
  }

  @Get('list')
  @UsePipes(new ValidationPipe({ transform: true }))
  async listEmails(
    @Query() query: ListEmailsDto,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader) throw new UnauthorizedException('No Authorization header');

    const token = authHeader.replace('Bearer ', '');
    const maxResults = query.max ?? 10;

    return this.gmailService.listEmails(token, maxResults);
  }

  @Get('classify')
  @UsePipes(new ValidationPipe({ transform: true }))
  async classifyEmails(
    @Query() query: ListEmailsDto,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader) throw new UnauthorizedException('No Authorization header');

    const token = authHeader.replace('Bearer ', '');
    const maxResults = query.max ?? 10;

    const emails = await this.gmailService.listEmails(token, maxResults);
    if (!emails) return;
    const classified = await this.aiService.clusterEmails(emails);
    return classified;
  }
}
