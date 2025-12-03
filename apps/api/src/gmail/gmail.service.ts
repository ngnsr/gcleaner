import { Injectable, UnauthorizedException } from '@nestjs/common';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class GmailService {
  private oauth2Client: any;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_REDIRECT_URI'),
    );
  }

  getAuthUrl(): string {
    const scopes = ['https://www.googleapis.com/auth/gmail.modify'];
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
  }

  async getTokens(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  private getUserClient(accessToken: string) {
    const client = new google.auth.OAuth2();
    client.setCredentials({ access_token: accessToken });
    return google.gmail({ version: 'v1', auth: client });
  }

  // 2. Logic: Uses the client to fetch and save.
  async syncEmails(accessToken: string, userId: string, pageToken?: string) {
    const gmail = this.getUserClient(accessToken);

    // Pass the pageToken if we have one (to get the next page of history)
    const res = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 20,
      pageToken: pageToken,
    });

    const messages = res.data.messages || [];
    let syncedCount = 0;

    for (const msg of messages) {
      if (!msg.id) continue;

      // Check if exists
      const exists = await this.prisma.email.findUnique({
        where: { id: msg.id },
      });

      if (exists) continue;

      // Fetch details
      try {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date'],
        });

        const headers = detail.data.payload?.headers || [];
        const from = headers.find((h) => h.name === 'From')?.value || 'Unknown';
        const subject =
          headers.find((h) => h.name === 'Subject')?.value || '(No Subject)';
        const dateStr =
          headers.find((h) => h.name === 'Date')?.value ||
          new Date().toISOString();

        await this.prisma.email.create({
          data: {
            id: msg.id,
            from,
            subject,
            snippet: detail.data.snippet || '',
            date: new Date(dateStr),
            user: {
              connectOrCreate: {
                where: { id: userId },
                create: { id: userId, email: 'placeholder@user.com' },
              },
            },
          },
        });
        syncedCount++;
      } catch (e) {
        console.error(`Failed to sync msg ${msg.id}`, e);
      }
    }

    // Return the token for the NEXT page of history
    return {
      synced: syncedCount,
      nextPageToken: res.data.nextPageToken,
    };
  }

  async getLocalEmails(userId: string, page: number, category?: string) {
    const take = 10;
    const skip = (page - 1) * take;

    const whereClause: any = { userId };

    if (category && category !== 'All') {
      whereClause.category = category;
    }

    const [emails, total] = await this.prisma.$transaction([
      this.prisma.email.findMany({
        where: whereClause,
        take,
        skip,
        orderBy: { date: 'desc' },
      }),
      this.prisma.email.count({ where: whereClause }),
    ]);

    return { data: emails, total, page };
  }

  async getUserCategories(userId: string) {
    const categories = await this.prisma.email.findMany({
      where: { userId, category: { not: null } },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    return categories.map((c) => c.category).filter(Boolean);
  }

  async performBatchAction(
    accessToken: string,
    userId: string,
    ids: string[],
    action: 'archive' | 'delete',
  ) {
    const gmail = this.getUserClient(accessToken);

    try {
      if (action === 'delete') {
        await gmail.users.messages.batchModify({
          userId: 'me',
          requestBody: {
            ids: ids,
            addLabelIds: ['TRASH'],
            removeLabelIds: ['INBOX'],
          },
        });
      } else if (action === 'archive') {
        await gmail.users.messages.batchModify({
          userId: 'me',
          requestBody: {
            ids: ids,
            removeLabelIds: ['INBOX'],
          },
        });
      }
    } catch (error) {
      console.error('Gmail API Error during batch action:', error);
      throw new UnauthorizedException('Failed to communicate with Gmail');
    }

    await this.prisma.email.deleteMany({
      where: {
        userId,
        id: { in: ids },
      },
    });

    return { success: true, count: ids.length };
  }
}
