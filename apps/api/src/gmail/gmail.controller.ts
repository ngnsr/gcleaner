import {
  Controller,
  Get,
  Query,
  Headers,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
  Post,
  Body,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { GmailService } from './gmail.service';
import { AiService } from 'src/ai/ai.service';
import { CallbackDto } from './dto/callback.dto';

const CURRENT_USER_ID = 'user-123';

@ApiTags('gmail')
@Controller('gmail')
export class GmailController {
  constructor(
    private readonly gmailService: GmailService,
    private readonly aiService: AiService,
  ) {}

  @Get('auth-url')
  @ApiOperation({ summary: 'Get Google OAuth2 URL' })
  getAuthUrl() {
    return { url: this.gmailService.getAuthUrl() };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Exchange code for tokens' })
  async callback(@Query() query: CallbackDto) {
    const tokens = await this.gmailService.getTokens(query.code);
    return tokens;
  }

  @Get('sync')
  @ApiOperation({
    summary: 'Sync emails. Pass nextToken to go back in history.',
  })
  @ApiQuery({ name: 'nextToken', required: false })
  async syncEmails(
    @Headers('authorization') authHeader: string,
    @Query('nextToken') nextToken?: string,
  ) {
    if (!authHeader) throw new UnauthorizedException('No Access Token');
    const token = authHeader.replace('Bearer ', '');

    return this.gmailService.syncEmails(token, CURRENT_USER_ID, nextToken);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get list of AI-generated categories' })
  async getCategories() {
    return this.gmailService.getUserCategories(CURRENT_USER_ID);
  }

  @Get('analyze')
  @ApiOperation({ summary: 'Step 2: AI categorizes unanalyzed emails in DB' })
  async analyzeEmails() {
    const result =
      await this.aiService.processUnanalyzedEmails(CURRENT_USER_ID);
    return result;
  }

  @Get('list')
  @ApiOperation({ summary: 'Step 3: Fetch organized emails from local DB' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'category', required: false })
  async listEmails(
    @Query('page') page = 1,
    @Query('category') category = 'All',
  ) {
    return this.gmailService.getLocalEmails(
      CURRENT_USER_ID,
      Number(page),
      category,
    );
  }

  @Post('batch-action')
  @ApiOperation({ summary: 'Archive or Delete multiple emails' })
  async batchAction(
    @Headers('authorization') authHeader: string,
    @Body() body: { ids: string[]; action: 'archive' | 'delete' },
  ) {
    if (!authHeader) throw new UnauthorizedException('No Access Token');
    const token = authHeader.replace('Bearer ', '');

    return this.gmailService.performBatchAction(
      token,
      CURRENT_USER_ID,
      body.ids,
      body.action,
    );
  }
}
