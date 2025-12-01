import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GmailService {
  private oauth2Client: any;
  private gmail: any;

  constructor(private readonly configService: ConfigService) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_REDIRECT_URI'),
    );

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
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
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  async listEmails(maxResults = 10) {
    const res = await this.gmail.users.messages.list({
      userId: 'me',
      maxResults,
    });
    const messages = res.data.messages || [];

    const emailDetails = await Promise.all(
      messages.map(async (msg) => {
        const detail = await this.gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date'],
        });
        const headers = detail.data.payload?.headers || [];
        const from = headers.find((h) => h.name === 'From')?.value || '';
        const subject = headers.find((h) => h.name === 'Subject')?.value || '';
        const date = headers.find((h) => h.name === 'Date')?.value || '';
        return { id: msg.id, from, subject, date };
      }),
    );

    return emailDetails;
  }
}
