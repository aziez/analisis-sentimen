/**
 * types/vader-sentiment.d.ts
 * Manual type declarations for vader-sentiment npm package (no @types available).
 */

declare module "vader-sentiment" {
  export class SentimentIntensityAnalyzer {
    static polarity_scores(text: string): {
      neg: number;
      neu: number;
      pos: number;
      compound: number;
    };
  }
}
