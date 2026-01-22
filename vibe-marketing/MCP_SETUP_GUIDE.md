# MCP Setup Guide for Vibe Marketing

> MCP (Model Context Protocol) servers enable Claude to interact with external services.

---

## Recommended MCPs for Marketing

| MCP | Purpose | Use Case |
|-----|---------|----------|
| **Firecrawl** | Website Crawling | Site audits, competitor analysis, content extraction |
| **Perplexity** | Search/Research | Market research, competitive intelligence, trend analysis |
| **Apify** | Web Scraping | Social media scraping, Google Maps data, lead generation |
| **Supabase** | Database | Store research data, build content libraries |
| **Google Sheets** | Spreadsheets | Data collection, content calendars |

---

## 1. Firecrawl MCP Setup

### Prerequisites
- Firecrawl account at [firecrawl.dev](https://firecrawl.dev)
- API key from dashboard

### Installation

1. Open Cursor Settings → Tools & Integrations → MCPs
2. Search for "Firecrawl" and add
3. Configure `mcp.json`:

```json
{
  "mcpServers": {
    "firecrawl": {
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": {
        "FIRECRAWL_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Verification
Run a test scrape in terminal to confirm functionality.

### Initial Audit Prompt
```
Using Firecrawl, analyze [URL] for:
- Industry positioning
- Target audience
- Value propositions
- Messaging tone
- Call-to-action elements

Save findings to Site-Exec-Summary.md
```

---

## 2. Perplexity MCP Setup

### Prerequisites
- Perplexity API key
- Cursor IDE installed

### Installation

1. Access Cursor Settings → MCPs
2. Add Perplexity MCP integration
3. Configure credentials in `mcp.json`:

```json
{
  "mcpServers": {
    "perplexity": {
      "command": "npx",
      "args": ["-y", "@anthropic/perplexity-mcp"],
      "env": {
        "PERPLEXITY_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Verification
Run a search query:
```
Search: "community-driven marketing competitors"
```

### Market Gap Prompt
```
Using Perplexity, find 5-7 gaps in the market for [your niche].
For each gap, identify:
- Current players
- Underserved needs
- Opportunity size

Output to Market-Gap-Analysis.md
```

---

## 3. Apify MCP Setup

### Purpose
- Scrape social media (Reddit, Twitter, LinkedIn)
- Extract Google Maps business data
- Build lead lists

### Use Cases for Marketing

| Task | Apify Actor |
|------|-------------|
| Reddit Monitoring | Reddit Scraper |
| Google Maps Leads | Google Maps Scraper |
| LinkedIn Profiles | LinkedIn Scraper |
| TikTok Trends | TikTok Scraper |

### Setup in n8n
See: [n8n Apify Integration Guide](https://docs.google.com/document/d/1oRxymW_JwND67UtQpFT8xB-YYrq53ZA4twZW5AkQfEk/edit)

---

## 4. Combined Workflow

### The Power Stack

```
Firecrawl (Site Analysis)
    ↓
Perplexity (Market Research)
    ↓
Claude (Synthesis & Strategy)
    ↓
n8n (Automation)
    ↓
Apify (Data Collection)
    ↓
Supabase (Storage)
```

### Example: Full Research Pipeline

**Step 1**: Site Audit
```
Use Firecrawl to analyze competitor.com
Extract: positioning, ICP, UVPs, brand voice
Save to: site-audit-competitor.md
```

**Step 2**: Market Intelligence
```
Use Perplexity to research:
- Top 10 competitors in [niche]
- Fastest growing keywords
- Emerging content formats
Save to: market-intelligence.md
```

**Step 3**: Synthesis
```
Analyze all research files:
- site-audit-competitor.md
- market-intelligence.md

Identify 3 high-impact opportunities for:
- Content gaps to fill
- Positioning angles to own
- Campaigns to launch

Save to: opportunity-brief.md
```

---

## MCP Best Practices

### Do's
- Start with Firecrawl for any new market/competitor
- Use Perplexity for trend validation and question discovery
- Combine multiple MCPs for comprehensive research
- Store all outputs in structured markdown

### Don'ts
- Don't rely on single MCP for full research
- Don't skip verification step after setup
- Don't hardcode API keys in committed files
- Don't ignore rate limits

---

## Troubleshooting

### Firecrawl Issues
- **401 Error**: Check API key is correct
- **Timeout**: Reduce page depth, use simpler selectors
- **Empty Results**: Verify URL is accessible

### Perplexity Issues
- **No Results**: Try more specific queries
- **Rate Limited**: Wait and retry, or upgrade plan
- **Outdated Info**: Specify date ranges in queries

### General MCP Issues
- Restart Cursor after config changes
- Check `mcp.json` syntax (valid JSON)
- Verify environment variables are set
