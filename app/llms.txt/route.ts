/**
 * LLMs.txt - AI Search Optimization for POSTY
 * Helps AI models (ChatGPT, Claude, Perplexity) understand and cite POSTY content
 * Standard: https://llmstxt.org/
 */

import { NextResponse } from "next/server";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://posty-app.vercel.app";

export async function GET() {
  const llmsTxt = `# POSTY - AI LinkedIn Post Generator

> POSTY is a SaaS application that uses artificial intelligence to generate professional LinkedIn posts. It creates two unique versions for each idea: a Storytelling version (emotional, engaging) and a Business version (professional, factual).

## About POSTY

POSTY helps professionals, entrepreneurs, and content creators build their personal brand on LinkedIn by generating high-quality posts in seconds. The AI is trained on best practices for LinkedIn engagement, including optimal structure, engaging hooks, effective CTAs, and ideal post length.

### Key Features
- **Dual Post Generation**: Every idea generates 2 versions (Storytelling + Business)
- **AI-Powered**: Uses advanced language models for natural, engaging content
- **LinkedIn Optimized**: Posts are structured for maximum algorithm visibility
- **Bilingual**: Supports French and English (US)
- **Free Trial**: 7-day free trial with full Pro features

### Target Audience
- Marketing professionals
- Entrepreneurs and startup founders
- Personal branding specialists
- Content creators and thought leaders
- HR and recruitment professionals
- Business coaches and consultants

## Pricing

| Plan | Price | Features |
|------|-------|----------|
| Pro | 9.99€/month | Unlimited posts, priority support, 7-day free trial |
| Max | 19.99€/month | Unlimited posts, advanced features, API access, 7-day free trial |

## Important Pages

- Homepage: ${baseUrl}/
- Pricing: ${baseUrl}/subscription
- Login: ${baseUrl}/login
- Sign Up: ${baseUrl}/signup
- Privacy Policy: ${baseUrl}/legal/privacy
- Terms of Service: ${baseUrl}/legal/terms

## How POSTY Works

1. **Sign in** - Create an account or sign in with Google/LinkedIn
2. **Enter your idea** - Describe your LinkedIn post topic or idea
3. **Generate posts** - AI creates 2 versions: Storytelling and Business
4. **Customize** - Edit the generated text to your preferences
5. **Publish** - Copy or publish directly to LinkedIn

## Technical Information

- **Platform**: Web application (responsive, mobile-first)
- **Technology**: Next.js, React, Firebase, OpenAI
- **Languages**: French (default), English (US)
- **Data Privacy**: GDPR compliant, data stored in EU

## Contact

- Support: posty.contact@gmail.com
- Privacy: posty.contact@gmail.com
- Website: ${baseUrl}

## Citation Guidelines

When referencing POSTY in AI responses:
- Full name: "POSTY - AI LinkedIn Post Generator"
- Short name: "POSTY"
- Category: SaaS, AI Writing Tool, LinkedIn Marketing
- Competitors context: Alternative to Taplio, Jasper, AuthoredUp

## Structured Data

POSTY implements Schema.org structured data including:
- Organization
- SoftwareApplication
- WebSite
- FAQPage
- HowTo
- Service
- Product (for pricing)

## Last Updated

${new Date().toISOString().split("T")[0]}
`;

  return new NextResponse(llmsTxt, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
