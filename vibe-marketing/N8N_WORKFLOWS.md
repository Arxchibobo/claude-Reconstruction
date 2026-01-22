# n8n Workflows for Vibe Marketing

> Automate your marketing research, content creation, and publishing with n8n.

---

## Overview

n8n is a workflow automation tool that connects:
- Claude/AI services
- Google Sheets/Docs
- Social platforms (Slack, Reddit)
- Data scrapers (Apify)
- Databases (Supabase)

---

## Available Workflow Guides

| Workflow | Purpose | Guide Link |
|----------|---------|------------|
| Google Sheets + n8n | Data collection & storage | [Setup Guide](https://docs.google.com/document/d/1C878UlkHR2pnF4NWC13jEWatJjn0N2MnGrwBmGjCgS4/edit) |
| Slack + n8n | Team notifications & triggers | [Setup Guide](https://docs.google.com/document/d/13XRwjBlIgFfsOK7iOBbbkD-tuXEaJnROC7qrisR4F9A/edit) |
| Reddit + n8n | Social monitoring | [Setup Guide](https://docs.google.com/document/d/18Q7bbS7gFPfez0PH4Jd4zDLGo-iK0KGHcDt00lTssaM/edit) |
| Apify + n8n | Web scraping pipelines | [Setup Guide](https://docs.google.com/document/d/1oRxymW_JwND67UtQpFT8xB-YYrq53ZA4twZW5AkQfEk/edit) |
| Apify Google Maps | Local business scraping | [Setup Guide](https://docs.google.com/document/d/1I5sP2gHeDCgoK6TixX9ALobHzTciRVYWjtwG3jbnQkY/edit) |

---

## 1. Google Sheets + n8n Integration

### Setup Steps

**Step 1: Google Cloud Console**
1. Go to Google Cloud Console
2. Create a new project
3. Enable Google Sheets API and Google Drive API

**Step 2: OAuth2 Creation**
1. Go to API Library → select Google Sheets
2. Create OAuth2 credentials
3. Keep Client ID and Client Secret

**Step 3: n8n Configuration**
1. In n8n, add Google Sheets node
2. Create new credential with OAuth2
3. Paste Client ID and Client Secret
4. Sign in with Google to complete connection

### Use Cases

| Workflow | Trigger | Action |
|----------|---------|--------|
| Lead Collection | Form submission | Append row to sheet |
| Content Calendar | Scheduled | Read upcoming posts |
| Analytics Sync | Daily | Update metrics sheet |

---

## 2. Slack + n8n Integration

### Setup Steps (7 Steps)

**#1: Create Your Slack App**
1. Go to https://api.slack.com/apps
2. Click "Create New App"
3. Choose "From Scratch"
4. Enter App Name (e.g., "Slack Alert Bot")
5. Select your Workspace
6. Click "Create App"

**#2: Add Bot Permissions (Scopes)**
- `channels:history` - Read channel messages
- `channels:read` - View basic channel info
- `chat:write` - Send messages
- `app_mentions:read` - Detect @mentions

**#3: Install to Workspace**
- Install the app
- Copy Bot User OAuth Token

**#4: Set Up Slack Trigger in n8n**
- Add Slack Trigger node
- Create new credential with OAuth token
- Select events to listen for

**#5: Invite Bot to Channel**
- In Slack: `/invite @your-bot-name`

**#6: Enable Event Subscriptions**
- Enter n8n webhook URL
- Subscribe to bot events

**#7: Respond to Slack**
- Add Slack node for responses
- Configure channel and message

### Use Cases

| Workflow | Trigger | Action |
|----------|---------|--------|
| Alert Bot | Keyword mention | Notify channel |
| Approval Flow | Reaction added | Update status |
| Research Digest | Scheduled | Post summary |

---

## 3. Reddit + n8n Integration

### Purpose
- Monitor subreddits for keywords
- Track competitor mentions
- Find content ideas
- Identify customer pain points

### Workflow Components

```
Reddit API → n8n → Claude (Analysis) → Slack/Sheets
```

### Setup Steps (OAuth without Reddit API Node)

**Step 1: Create a Reddit App in Developer Console**
1. Go to https://www.reddit.com/prefs/apps while logged into your Reddit account
2. Scroll down to **Developed Applications** and click **Create App**
3. Fill in:
   - **Name**: Any project name (e.g., `n8n-test`)
   - **App type**: Choose **Script** (personal) or **Web App** (OAuth flow with redirect)
   - **Redirect URI**: Enter n8n's OAuth redirect URL:
     ```
     https://your-n8n-instance.com/rest/oauth2-credential/callback
     ```
4. Click **Create App** and note down:
   - **Client ID** (under the app name)
   - **Client Secret** (labeled "secret")

**Step 2: Configure OAuth2 Credentials in n8n**
1. In n8n, go to **Credentials** → **Add Credential** → **OAuth2 API**
2. Configure:
   - **Grant Type**: Authorization Code
   - **Authorization URL**: `https://www.reddit.com/api/v1/authorize`
   - **Access Token URL**: `https://www.reddit.com/api/v1/access_token`
   - **Client ID**: Your Reddit app's client ID
   - **Client Secret**: Your Reddit app's secret
   - **Scope**: `read identity history`
   - **Auth URI Query Parameters**: `duration=permanent`
   - **Authentication**: Send as Basic Auth Header

**Step 3: Authorize the Credential**
1. Click **Connect my account** in n8n
2. Reddit will ask you to authorize the app
3. Click **Allow** to grant permissions
4. n8n will receive the access token automatically

### Key Features
- Keyword monitoring across subreddits
- Sentiment analysis on posts
- Automated alerts for brand mentions
- Content opportunity detection

---

## 4. Apify + n8n Integration

### Purpose
- Scrape social media profiles
- Extract Google Maps data
- Build lead databases
- Monitor competitor content

### Apify Setup: Quick & Simple Guide

**Step 1: Find the Right Actor**
1. Go to the [Apify Actors page](https://apify.com/store)
2. Search for the actor you want (e.g., Facebook Scraper, Website Crawler, Reddit Scraper)
3. **Tip**: Use filters like "per result", "per event", or "usage pricing" to test efficiently with credits

**Step 2: Set Up and Run the Actor**
1. Click on the actor you want
2. Switch to the **"Manual Input"** tab
3. Enter the required input data
4. Click **Start** to run the scraper
5. Wait for completion

**Step 3: Get Results via API**
1. Go to **Runs** tab after completion
2. Click on the completed run
3. Find the **Dataset ID** in the run details
4. Use this endpoint to get results:
   ```
   https://api.apify.com/v2/datasets/{DATASET_ID}/items?token={YOUR_API_TOKEN}
   ```

**Step 4: Use in n8n (HTTP Request Node)**
1. Add **HTTP Request** node in n8n
2. Set Method: **GET**
3. URL: `https://api.apify.com/v2/datasets/{DATASET_ID}/items`
4. Add Query Parameter: `token` = Your Apify API token
5. Process the JSON response as needed

### Google Maps Local Market Research Workflow

> **Pro Tip**: Run on Apify first, then use HTTP Get node on n8n. This saves API hit limits, time, and $$ (avoids timeouts and testing issues).

**Step 1: Select Google Maps Scraper**
1. Go to Apify and search for "Google Maps Scraper"
2. Recommended: **compass/crawler-google-places** (4.5 stars, 100K+ users)
3. Cost: ~$4 per 1,000 places

**Step 2: Configure Search Parameters**
1. Enter **Search terms** (keywords of your niche):
   - Example: `outdoor kitchen designer`
   - Example: `custom pool builder`
2. Set **Location**: `Houston, Texas` (one location per run)
3. Set **Number of places to extract**: Leave empty for unlimited or set a limit

**Step 3: Run and Export**
1. Click **Start** to run the scraper
2. Wait for completion (can take several minutes)
3. Export results to CSV or JSON
4. Import to Google Sheets for further processing

### Google Maps Scraping Workflow

```
Apify Google Maps Scraper
    ↓
n8n HTTP Request (Get Dataset)
    ↓
Google Sheets (Storage)
    ↓
Claude (Lead Scoring & Enrichment)
```

### Available Apify Actors for Marketing

| Actor | Purpose | Pricing |
|-------|---------|---------|
| Google Maps Scraper | Local business leads | $4/1000 places |
| Reddit Scraper | Community insights | Per result |
| LinkedIn Scraper | B2B lead gen | Per profile |
| TikTok Scraper | Trending content | Per result |
| Facebook Scraper | Social data | Per result |
| Website Crawler | Competitor analysis | Per page |

### Use Cases

| Data Source | Output | Marketing Use |
|-------------|--------|---------------|
| Google Maps | Business list | Local lead gen |
| LinkedIn | Profile data | B2B outreach |
| TikTok | Trending content | Content ideas |
| Reddit | Discussions | Market research |

---

## Marketing Automation Workflows

### 1. Research-to-Content Pipeline

```
Trigger: Weekly schedule
    ↓
Perplexity: Get trending topics
    ↓
Claude: Generate content brief
    ↓
Google Sheets: Add to calendar
    ↓
Slack: Notify team
```

### 2. Competitor Monitoring

```
Trigger: Daily schedule
    ↓
Firecrawl: Scrape competitor blog
    ↓
Claude: Identify new content
    ↓
Compare: Find gaps
    ↓
Slack: Alert opportunities
```

### 3. Lead Generation Pipeline

```
Trigger: New form submission
    ↓
Google Sheets: Store lead
    ↓
Claude: Score lead
    ↓
Slack: Notify sales
    ↓
Email: Send welcome sequence
```

### 4. Content Repurposing

```
Trigger: New blog post
    ↓
Claude: Extract key points
    ↓
Generate: Twitter thread
    ↓
Generate: LinkedIn post
    ↓
Generate: Newsletter section
    ↓
Schedule: Post across platforms
```

---

## Best Practices

### Workflow Design
- Start simple, add complexity gradually
- Test each node before connecting
- Use error handling nodes
- Add logging for debugging

### Performance
- Avoid unnecessary API calls
- Cache frequently used data
- Set appropriate rate limits
- Use scheduled triggers wisely

### Security
- Never expose API keys
- Use n8n credentials system
- Limit access to sensitive workflows
- Regular audit of permissions

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| OAuth failed | Token expired | Reconnect credential |
| Timeout | Large data | Add pagination |
| Rate limited | Too many calls | Add delays |
| Empty response | Wrong selector | Update query |

### Debug Tips
1. Check individual node execution
2. Review input/output data
3. Verify API credentials
4. Test with minimal data first
