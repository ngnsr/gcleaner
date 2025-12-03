import { Injectable, UnauthorizedException } from '@nestjs/common';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GmailService {
  private oauth2Client: any;

  constructor(private readonly configService: ConfigService) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_REDIRECT_URI'),
    );
  }

  getAuthUrl(): string {
    const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];
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

  async listEmails(accessToken: string, maxResults = 10) {
    if (!accessToken) {
      throw new UnauthorizedException('Missing access token');
    }

    const gmail = this.getUserClient(accessToken);

    try {
      const res = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
      });

      const messages = res.data.messages || [];

      const validMessages = messages.filter((msg) => msg.id);

      const emailDetails = await Promise.all(
        validMessages.map(async (msg) => {
          const messageId = msg.id as string;

          const detail = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date'],
          });

          const headers = detail.data.payload?.headers || [];

          const from = headers.find((h) => h.name === 'From')?.value || '';
          const subject =
            headers.find((h) => h.name === 'Subject')?.value || '';
          const date = headers.find((h) => h.name === 'Date')?.value || '';

          return {
            id: messageId,
            from,
            subject,
            date,
          };
        }),
      );

      return emailDetails;
    } catch (error) {
      console.error('Gmail API Error:', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
