import {
  Controller,
  Get,
  Query,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { GmailService } from './gmail.service';
import { ListEmailsDto } from './dto/list-email.dto';
import { CallbackDto } from './dto/callback.dto';
import { AiService } from 'src/ai/ai.service';

class EmailDto {
  id: string;
  from: string;
  subject: string;
  date: string;
}

@ApiTags('gmail')
@Controller('gmail')
export class GmailController {
  constructor(
    private readonly gmailService: GmailService,
    private readonly aiService: AiService,
  ) {}

  @Get('auth-url')
  @ApiOperation({ summary: 'Get Google OAuth2 authentication URL' })
  @ApiResponse({
    status: 200,
    description: 'Returns a URL string to redirect the user for Google login',
    schema: { example: { url: 'https://accounts.google.com/o/oauth2/auth?…' } },
  })
  getAuthUrl() {
    return { url: this.gmailService.getAuthUrl() };
  }

  @Get('callback')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Exchange Google OAuth2 code for access tokens' })
  @ApiQuery({
    name: 'code',
    required: true,
    description: 'Authorization code received from Google OAuth2 redirect',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns access and refresh tokens',
    schema: {
      example: { access_token: 'ya29.a0ARrdaM...', refresh_token: '1//0g...' },
    },
  })
  async callback(@Query() query: CallbackDto) {
    const tokens = await this.gmailService.getTokens(query.code);
    return { tokens };
  }

  @Get('emails')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Fetch a list of user emails (metadata only)' })
  @ApiQuery({
    name: 'max',
    required: false,
    description: 'Maximum number of emails to fetch (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns array of email metadata',
    type: [EmailDto],
  })
  async listEmails(@Query() query: ListEmailsDto) {
    const maxResults = query.max ?? 10;
    return this.gmailService.listEmails(maxResults);
  }

  @Get('classify')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Classify emails into categories using AI' })
  @ApiQuery({
    name: 'max',
    required: false,
    description: 'Maximum number of emails to fetch (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns AI-classified emails',
    type: [Object],
  })
  async classifyEmails(@Query() query: ListEmailsDto) {
    const maxResults = query.max ?? 10;
    const emails: EmailDto[] = await this.gmailService.listEmails(maxResults);
    const classified = await this.aiService.clusterEmails(emails);
    return classified;
  }
}
