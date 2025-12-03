import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.baseUrl = 'https://api.llm7.io/v1';
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY') || 'unused';
  }

  /**
   * Main function: Picks up unanalyzed emails from DB,
   * asks AI to categorize them based on history, and updates DB.
   */
  async processUnanalyzedEmails(userId: string) {
    // 1. Find emails needing analysis
    const pending = await this.prisma.email.findMany({
      where: { userId, isAnalyzed: false },
      take: 20, // Process in batches to avoid token limits
      orderBy: { date: 'desc' },
    });

    if (pending.length === 0) {
      this.logger.log('No pending emails to analyze.');
      return { processed: 0 };
    }

    // 2. "Learn" - Get existing categories for context
    // This makes the AI consistent with previous categorizations
    const existingCategories = await this.prisma.email.findMany({
      where: { userId, category: { not: null } },
      select: { category: true },
      distinct: ['category'],
    });

    // Create a comma-separated string of unique categories (e.g., "Work, Newsletters, Bills")
    const categoryList = existingCategories
      .map((c) => c.category)
      .filter(Boolean)
      .join(', ');

    this.logger.log(
      `Analyzing ${pending.length} emails. Context: [${categoryList}]`,
    );

    // 3. Prepare Prompt
    // We MUST include the ID so we can map the result back to the DB
    const input = pending
      .map(
        (e) =>
          `ID: ${e.id}\nFrom: ${e.from}\nSubject: ${e.subject}\nSnippet: ${e.snippet?.substring(0, 150) || ''}`,
      )
      .join('\n---\n');

    const systemPrompt = `
      You are an email organization assistant.
      
      Your goal is to categorize emails and suggest an action (archive, delete, keep).
      
      CONTEXT - The user already uses these categories: 
      [${categoryList || 'None yet'}]
      Use these existing categories if they fit, otherwise create a short, simple new one.

      INSTRUCTIONS:
      1. Analyze the provided emails.
      2. Return a valid JSON array of objects.
      3. Each object must have: "id", "category", "action", "reasoning".
      4. Action must be one of: "archive", "delete", "keep".
      5. Do not include markdown formatting (like \`\`\`json). Just the raw JSON array.
    `;

    try {
      // 4. Call LLM
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'gpt-4', // or gpt-3.5-turbo if you want it cheaper/faster
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: input },
          ],
          temperature: 0.3,
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
      const resultText = this.cleanJson(resultTextRaw);

      let parsedResults: any[] = [];
      try {
        parsedResults = JSON.parse(resultText);
      } catch (e) {
        this.logger.error(`Failed to parse AI response: ${resultTextRaw}`);
        return { processed: 0, error: 'JSON Parse Error' };
      }

      let successCount = 0;

      for (const res of parsedResults) {
        if (!res.id || !res.category || !res.action) continue;

        try {
          await this.prisma.email.update({
            where: { id: res.id },
            data: {
              category: res.category,
              suggestedAction: res.action.toLowerCase(),
              reasoning: res.reasoning || '',
              isAnalyzed: true,
            },
          });
          successCount++;
        } catch (dbError) {
          this.logger.warn(
            `Failed to update email ${res.id}: ${dbError.message}`,
          );
        }
      }

      this.logger.log(`Successfully classified ${successCount} emails.`);
      return { processed: successCount };
    } catch (error) {
      this.logger.error('AI Service Error', error);
      return { processed: 0, error: error.message };
    }
  }

  /**
   * Helper to remove Markdown code blocks often added by LLMs
   */
  private cleanJson(text: string): string {
    return text
      .trim()
      .replace(/^```json\s*/i, '') // Remove start ```json
      .replace(/^```\s*/i, '') // Remove start ```
      .replace(/```$/, ''); // Remove end ```
  }
}
