import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { EmailDto } from '../gmail/dto/email.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = 'https://api.llm7.io/v1';
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY') || 'unused';
  }

  async clusterEmails(emails: EmailDto[]) {
    if (!emails.length) return [];

    const input = emails
      .map((e) => `From: ${e.from}\nSubject: ${e.subject}`)
      .join('\n---\n');

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content:
                'You are an email assistant. Group the following emails into categories and suggest an action (archive, keep, delete) for each. Format JSON with fields: from, subject, category, action.',
            },
            { role: 'user', content: input },
          ],
          temperature: 0.4,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      const resultTextRaw =
        response.data.choices?.[0]?.message?.content || '[]';
      this.logger.debug('LLM7 raw response: ' + resultTextRaw);

      // Remove ```json or ``` at start/end
      const resultText = resultTextRaw
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/, '');

      try {
        const parsed = JSON.parse(resultText);
        return parsed;
      } catch (e) {
        this.logger.warn(
          'Failed to parse LLM7 response as JSON after cleaning',
        );
        return [];
      }
    } catch (error) {
      this.logger.error(error);
      return [];
    }
  }
}
