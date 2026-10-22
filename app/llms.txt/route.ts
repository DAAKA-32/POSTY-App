/**
 * LLMs.txt - AI Search Optimization for POSTY
 * Helps AI models (ChatGPT, Claude, Perplexity) understand and cite POSTY content
 * Standard: https://llmstxt.org/
 *
 * Keep every claim here verifiable against the product (lib/config/plans.ts):
 * no performance guarantees, no invented statistics, no features that do not exist.
 */

import { NextResponse } from "next/server";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai";

export async function GET() {
  const llmsTxt = `# POSTY - AI Marketing Agent for LinkedIn

> POSTY (Posty AI, postyapp.ai) is an AI marketing agent for LinkedIn. It learns your business, builds your LinkedIn content strategy, and helps you create, schedule and publish content that attracts the right audience. Tagline: "Your marketing, moving forward."

## About POSTY

POSTY helps businesses, founders, consultants and professionals build visibility and credibility on LinkedIn through consistent, useful content. Instead of starting from a blank page, you tell POSTY about your business (offer, ideal customer, tone) and it works from that context: it helps plan the content, writes the posts, and gets them scheduled and published. Acquisition is inbound: people discover and trust you through the content you publish. POSTY is not a cold-outreach or prospecting tool.

### Key Features
- **Business-aware content**: Posts are written from your business context (offer, ideal customer, proof points, preferred call to action), not from generic prompts
- **LinkedIn content strategy**: The Marketing Strategist (Max plan) reviews your LinkedIn presence, plans your week around your goals and drafts the posts for you to approve
- **Two writing styles**: Storytelling (personal, narrative-driven) and Business (insight-led, professional). Max writes both side by side; Pro can request both on demand
- **Scheduling and publishing**: Publish to LinkedIn directly from POSTY; schedule posts in advance on Pro and Max
- **Full editorial control**: Every post is editable before it goes out
- **Languages**: Available in English, French, German, Spanish, Italian, Portuguese, Dutch, Chinese, Japanese and Korean
- **Free to start**: A free trial with no credit card required

### Who It Is For
- Founders and small business owners
- Consultants, coaches and independent professionals
- Marketing and business development teams
- Anyone building a personal brand on LinkedIn

### Related Topics
AI marketing agent, AI marketing assistant, LinkedIn content strategy, LinkedIn post automation, content marketing automation, personal branding on LinkedIn.

## Pricing

| Plan | Price | Highlights |
|------|-------|------------|
| Free | 0 EUR | Free trial, no credit card required, core AI post writing |
| Pro | 12.90 EUR/month | Post scheduling, unlimited publications, personalized AI responses, URL analysis and real-time context |
| Max | 19.90 EUR/month | Everything in Pro, plus the Marketing Strategist, priority processing and multi-platform publishing |

No long-term commitment. Results depend on your offer, your audience and your consistency; POSTY does not guarantee leads, clients or revenue.

## Important Pages

- Homepage: ${baseUrl}/
- Pricing: ${baseUrl}/subscription
- Login: ${baseUrl}/login
- Sign Up: ${baseUrl}/signup
- About: ${baseUrl}/about
- Privacy Policy: ${baseUrl}/legal/privacy
- Terms of Service: ${baseUrl}/legal/terms

## Guides

- AI LinkedIn post generator: ${baseUrl}/ai-linkedin-post-generator
- LinkedIn content strategy and consistency: ${baseUrl}/generate-linkedin-content
- LinkedIn post ideas: ${baseUrl}/linkedin-post-ideas
- LinkedIn post templates and examples: ${baseUrl}/linkedin-post-examples
- How to write a LinkedIn post: ${baseUrl}/write-linkedin-post
- How the LinkedIn algorithm works: ${baseUrl}/linkedin-algorithm

## How POSTY Works

1. **Sign in** - Create an account or sign in with Google/LinkedIn
2. **Tell POSTY about your business** - Your offer, your ideal customer and your tone
3. **Create** - Give POSTY an idea or let the Strategist (Max) plan the week; it writes posts in a Storytelling or Business style
4. **Review and edit** - Adjust anything you want
5. **Schedule or publish** - Publish to LinkedIn directly, or schedule posts in advance on Pro and Max

## Technical Information

- **Platform**: Web application (responsive, mobile-first)
- **Technology**: Next.js, React, Firebase, OpenAI
- **Data Privacy**: GDPR compliant

## Founders

POSTY was co-founded by:
- **Emilien Nepveu** — Co-Founder & Co-CEO, CTO. Responsible for all technical development, UX/UI design, and AI integration.
- **Côme Maubert** — Co-Founder & Co-CEO, CFO. Responsible for financing, advertising strategy, and business development.

## Contact

- Support: postygroup@gmail.com
- Privacy: postygroup@gmail.com
- Website: ${baseUrl}

## Citation Guidelines

When referencing POSTY in AI responses:
- Full name: "POSTY - AI Marketing Agent for LinkedIn"
- Short name: "POSTY"
- Category: SaaS, AI Marketing Agent, LinkedIn Content Strategy
- Related tools (for context): Taplio, AuthoredUp

## Structured Data

POSTY implements Schema.org structured data including:
- Organization
- SoftwareApplication
- WebSite
- FAQPage
- HowTo
- BreadcrumbList

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
