#!/usr/bin/env tsx

import { db } from '../src/db/index.js'
import { knowledgeDocuments } from '../src/db/schema.js'
import { eq } from 'drizzle-orm'

const seedDocuments = [
  {
    title: 'Getting Started with AIO-Chat',
    content: `
# Getting Started with AIO-Chat

AIO-Chat is an enterprise-grade AI-powered customer support platform that combines multiple messaging platforms with intelligent automation and RAG-powered responses.

## Key Features

### Multi-Platform Support
- **WhatsApp**: Direct integration with WhatsApp Business API
- **Telegram**: Full bot integration with rich media support
- **Web Chat**: Embeddable chat widget for websites
- **Email**: Automated email responses and ticketing

### AI-Powered Features
- **RAG (Retrieval-Augmented Generation)**: Context-aware responses from your knowledge base
- **Smart Automation**: Rule-based triggers and actions
- **Sentiment Analysis**: Understand customer emotions and priorities
- **Multi-language Support**: Automatic translation and localization

### Operator Tools
- **Real-time Dashboard**: Monitor conversations and system performance
- **Conversation Management**: Seamless handover between AI and human operators
- **Analytics**: Detailed insights into customer interactions
- **Quality Assurance**: Monitor and improve response quality

## Quick Setup

1. **Configure Messaging Platforms**: Connect your WhatsApp, Telegram, or other platforms
2. **Set Up Knowledge Base**: Import your documentation, FAQs, and support materials
3. **Configure Automation**: Set up rules for common scenarios
4. **Invite Operators**: Add your support team members
5. **Go Live**: Start handling customer inquiries intelligently

## Best Practices

- Keep your knowledge base updated regularly
- Review AI responses for accuracy
- Monitor customer satisfaction scores
- Use analytics to identify improvement areas
- Train operators on handling escalations

For detailed setup instructions, see the Configuration Guide.
    `.trim(),
    type: 'manual',
    status: 'published',
    category: 'Getting Started',
    tags: ['setup', 'introduction', 'features'],
  },
  {
    title: 'AIO-Chat Configuration Guide',
    content: `
# Configuration Guide

## Database Setup

AIO-Chat supports both PostgreSQL (recommended) and SQLite databases.

### PostgreSQL (Recommended)
\`\`\`bash
# Environment variables
DATABASE_URL=postgresql://username:password@localhost:5432/aio-chat
\`\`\`

### SQLite (Development)
\`\`\`bash
# Environment variables
DATABASE_URL=file:./aio-chat.db
\`\`\`

## AI Provider Configuration

### OpenRouter Setup
1. Sign up at OpenRouter.ai
2. Get your API key
3. Configure environment variables:
\`\`\`bash
OPENAI_API_KEY=sk-or-v1-your-openrouter-api-key
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=meta-llama/llama-3.1-8b-instruct:free
\`\`\`

## Platform Integration

### Telegram Bot
1. Create a bot via @BotFather on Telegram
2. Get the bot token
3. Set the token in your environment:
\`\`\`bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
\`\`\`

### WhatsApp Business
1. Set up WhatsApp Business API
2. Configure webhook endpoints
3. Verify your phone number

## Authentication
\`\`\`bash
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
\`\`\`

## WebSocket Configuration
WebSocket endpoint: \`ws://localhost:3000/api/websocket\`

## Environment Variables Checklist
- [ ] DATABASE_URL
- [ ] OPENAI_API_KEY
- [ ] TELEGRAM_BOT_TOKEN
- [ ] NEXTAUTH_SECRET
- [ ] NEXTAUTH_URL
    `.trim(),
    type: 'manual',
    status: 'published',
    category: 'Configuration',
    tags: ['database', 'ai', 'authentication', 'environment'],
  },
  {
    title: 'Automation Rules Setup',
    content: `
# Automation Rules Setup

Automation rules allow you to create intelligent workflows that respond to customer interactions automatically.

## Rule Types

### 1. Keyword Triggers
Respond to specific keywords or phrases in customer messages.

**Example**: Trigger when customer mentions "refund"
\`\`\`json
{
  "triggerType": "keyword",
  "triggerConditions": {
    "keywords": ["refund", "money back", "return policy"],
    "matchType": "any",
    "caseSensitive": false
  },
  "actions": [
    {
      "type": "send_message",
      "template": "I understand you're asking about a refund. Let me help you with that..."
    },
    {
      "type": "create_ticket",
      "priority": "high",
      "category": "refund"
    }
  ]
}
\`\`\`

### 2. Time-Based Triggers
Execute actions at specific times or intervals.

**Example**: Send follow-up message after 24 hours
\`\`\`json
{
  "triggerType": "time_based",
  "triggerConditions": {
    "schedule": "0 9 * * *",
    "timezone": "America/New_York"
  },
  "actions": [
    {
      "type": "send_message",
      "template": "Just checking in - was your issue resolved?"
    }
  ]
}
\`\`\`

### 3. Message Count Triggers
React after a certain number of messages in a conversation.

**Example**: Escalate after 5 messages without resolution
\`\`\`json
{
  "triggerType": "message_count",
  "triggerConditions": {
    "operator": "gte",
    "count": 5,
    "timeframe": "30m"
  },
  "actions": [
    {
      "type": "escalate",
      "assignTo": "human_agent"
    }
  ]
}
\`\`\`

## Action Types

### Message Actions
- \`send_message\`: Send automated response
- \`assign_operator\`: Assign conversation to specific operator
- \`set_status\`: Change conversation status

### System Actions
- \`create_ticket\`: Create support ticket
- \`send_email\`: Send email notification
- \`webhook\`: Call external API
- \`escalate\`: Escalate to higher priority

### Conditional Actions
- \`if_condition\`: Execute actions based on conditions
- \`delay\`: Wait before executing next action

## Best Practices

1. **Start Simple**: Begin with basic keyword triggers
2. **Test Thoroughly**: Use the rule testing interface
3. **Monitor Performance**: Track automation success rates
4. **Avoid Over-automation**: Keep human touch for complex issues
5. **Regular Updates**: Review and update rules monthly

## Rule Examples

### Welcome Message
\`\`\`json
{
  "name": "Welcome New Customer",
  "triggerType": "conversation_started",
  "actions": [
    {
      "type": "send_message",
      "template": "Welcome! How can I assist you today?"
    }
  ]
}
\`\`\`

### Office Hours
\`\`\`json
{
  "name": "Office Hours Check",
  "triggerType": "message_received",
  "triggerConditions": {
    "timeRange": {
      "start": "09:00",
      "end": "17:00",
      "timezone": "America/New_York",
      "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
    }
  },
  "actions": [
    {
      "type": "if_condition",
      "condition": "{{isOfficeHours}} == false",
      "then": [
        {
          "type": "send_message",
          "template": "We're currently closed. We'll respond during business hours."
        }
      ]
    }
  ]
}
\`\`\`
    `.trim(),
    type: 'manual',
    status: 'published',
    category: 'Automation',
    tags: ['automation', 'rules', 'workflows', 'triggers'],
  },
  {
    title: 'RAG Knowledge Base Management',
    content: `
# RAG Knowledge Base Management

RAG (Retrieval-Augmented Generation) combines your internal knowledge with AI responses for accurate, context-aware answers.

## Knowledge Base Structure

### Document Types
1. **FAQs**: Frequently asked questions and answers
2. **Policies**: Company policies and procedures
3. **Manuals**: Product documentation and user guides
4. **Procedures**: Step-by-step instructions
5. **General**: Other relevant information

### Document Categories
- Customer Support
- Technical Documentation
- Sales & Marketing
- Human Resources
- Product Information

## Adding Documents

### Manual Upload
1. Navigate to Knowledge Base in dashboard
2. Click "Add Document"
3. Fill in details:
   - Title (required)
   - Content (required)
   - Type (dropdown)
   - Category (optional)
   - Tags (comma-separated)
4. Set status to "Published" to make searchable

### Bulk Import
\`\`\`javascript
// Example bulk import script
const documents = [
  {
    title: "Return Policy",
    content: "Our return policy allows 30-day returns...",
    type: "policy",
    category: "Customer Support",
    tags: ["returns", "refunds", "policy"]
  }
];

// Import via API or direct database insertion
\`\`\`

## Content Best Practices

### Writing Style
- Use clear, concise language
- Break content into sections with headers
- Use bullet points for lists
- Include examples where helpful
- Keep answers self-contained

### SEO for Internal Search
- Include relevant keywords naturally
- Use synonyms and related terms
- Structure content for easy scanning
- Update content regularly

### Formatting Guidelines
- Use Markdown for formatting
- Include code blocks with language hints
- Add tables for structured data
- Use links for cross-references

## Managing Embeddings

### Automatic Processing
- Documents are automatically chunked into 500-token segments
- Embeddings generated using OpenAI's text-embedding-3-small
- Similarity search finds relevant content for queries

### Manual Reindexing
\`\`\`bash
# Reindex all documents
pnpm run knowledge:reindex

# Reindex specific document
pnpm run knowledge:reindex --doc-id=123
\`\`\`

## Search Optimization

### Improving Results
1. **Quality Content**: Write comprehensive, accurate information
2. **Proper Tagging**: Use relevant tags for categorization
3. **Regular Updates**: Keep information current
4. **User Feedback**: Monitor search result ratings

### Search Parameters
- \`threshold\`: Similarity threshold (0.7-0.9 recommended)
- \`maxResults\`: Maximum documents to retrieve (5-10 typical)
- \`chunkSize\`: Text chunk size for embeddings (500 tokens default)

## Analytics and Monitoring

### Search Metrics
- Query volume and patterns
- Result relevance scores
- User feedback ratings
- Popular vs unpopular content

### Content Performance
- Most accessed documents
- Search success rates
- User satisfaction scores
- Content gap identification

## Security and Access Control

### Document Permissions
- Role-based access to sensitive information
- Document-level privacy settings
- Audit logging for content changes

### Data Privacy
- PII detection and redaction
- GDPR compliance features
- Data retention policies
- Export/deletion capabilities

## Troubleshooting

### Common Issues
1. **Poor Search Results**: Check content quality and tagging
2. **Slow Performance**: Consider reindexing or reducing document size
3. **Missing Content**: Verify document status is "Published"
4. **Irrelevant Answers**: Improve chunking and adjust thresholds

### Performance Tuning
- Optimize database indexes
- Cache frequently accessed documents
- Monitor embedding generation queue
- Adjust chunk sizes for better relevance
    `.trim(),
    type: 'manual',
    status: 'published',
    category: 'Knowledge Management',
    tags: ['rag', 'knowledge base', 'embeddings', 'search'],
  },
  {
    title: 'Troubleshooting Common Issues',
    content: `
# Troubleshooting Common Issues

This guide covers the most common issues and their solutions.

## Connection Issues

### Database Connection Failed
**Symptoms**: "Database connection failed" error messages
**Causes**: Incorrect DATABASE_URL, database not running, network issues

**Solutions**:
1. Verify DATABASE_URL environment variable
2. Check if PostgreSQL service is running:
   \`\`\`bash
   # Windows
   Get-Service postgresql*

   # Linux/Mac
   sudo systemctl status postgresql
   \`\`\`
3. Test connection manually:
   \`\`\`bash
   # PostgreSQL
   psql "postgresql://postgres:postgres@localhost:5432/aio-chat"

   # SQLite
   sqlite3 aio-chat.db ".tables"
   \`\`\`

### WebSocket Connection Errors
**Symptoms**: Real-time updates not working, connection timeouts
**Causes**: Port conflicts, firewall blocking, incorrect WebSocket URL

**Solutions**:
1. Check if WebSocket server is running on port 3001
2. Verify WebSocket URL: \`ws://localhost:3001/api/websocket\`
3. Check browser console for error messages
4. Ensure no VPN/firewall is blocking WebSocket connections

## AI/LLM Issues

### OpenAI API Errors
**Symptoms**: Failed AI responses, authentication errors
**Causes**: Invalid API key, incorrect base URL, model unavailability

**Solutions**:
1. Verify OPENAI_API_KEY environment variable
2. Check OpenRouter account status and credits
3. Test API directly:
   \`\`\`bash
   curl -H "Authorization: Bearer $OPENAI_API_KEY" \\
        -H "Content-Type: application/json" \\
        -d '{"model":"meta-llama/llama-3.1-8b-instruct:free","messages":[{"role":"user","content":"Hello"}]}' \\
        https://openrouter.ai/api/v1/chat/completions
   \`\`\`

### Poor AI Response Quality
**Symptoms**: Irrelevant or generic responses
**Causes**: Insufficient knowledge base, poor RAG configuration

**Solutions**:
1. Add more relevant documents to knowledge base
2. Check document indexing status
3. Improve search parameters:
   - Lower similarity threshold to 0.6
   - Increase maxResults to 10
   - Verify document quality and relevance

## Performance Issues

### Slow Page Loading
**Symptoms**: Pages taking >5 seconds to load
**Causes**: Large database queries, missing indexes, slow API calls

**Solutions**:
1. Enable query logging to identify slow queries
2. Add database indexes on frequently queried columns
3. Implement response caching
4. Optimize API response sizes

### High Memory Usage
**Symptoms**: Out of memory errors, slow performance
**Causes**: Memory leaks, large data processing, insufficient resources

**Solutions**:
1. Monitor memory usage with process stats
2. Check for memory leaks in long-running processes
3. Optimize data processing batch sizes
4. Increase available memory if needed

## Platform Integration Issues

### Telegram Bot Not Responding
**Symptoms**: No response from Telegram bot
**Causes**: Incorrect bot token, webhook not set, bot permissions

**Solutions**:
1. Verify TELEGRAM_BOT_TOKEN environment variable
2. Test bot via direct message
3. Check webhook registration:
   \`\`\`bash
   curl https://api.telegram.org/bot$TOKEN/getWebhookInfo
   \`\`\`
4. Ensure bot has necessary permissions

### WhatsApp Webhook Issues
**Symptoms**: WhatsApp messages not received
**Causes**: Webhook URL not accessible, SSL certificate issues, verification failed

**Solutions**:
1. Verify webhook URL is publicly accessible
2. Check SSL certificate validity
3. Test webhook endpoint with WhatsApp's verification tool
4. Review WhatsApp Business API setup

## Development Issues

### TypeScript Compilation Errors
**Symptoms**: Build failures, type errors
**Causes**: Missing dependencies, incorrect types, version conflicts

**Solutions**:
1. Clear Next.js cache: \`rm -rf .next\`
2. Reinstall dependencies: \`pnpm install\`
3. Check TypeScript version compatibility
4. Review error messages for specific issues

### Module Import Errors
**Symptoms**: "Module not found" errors
**Causes**: Incorrect import paths, missing exports, module resolution issues

**Solutions**:
1. Verify import paths are correct
2. Check for missing exports in source files
3. Ensure module resolution is configured properly
4. Check for circular dependencies

## Getting Help

### Debug Information Collection
When reporting issues, include:
1. Environment variables (sanitized)
2. Database configuration
3. Error logs and stack traces
4. Steps to reproduce
5. Expected vs actual behavior

### Community Support
- GitHub Issues: Report bugs and feature requests
- Documentation: Check latest guides and examples
- Community Forums: Get help from other users

### Professional Support
- Priority email support
- Scheduled troubleshooting sessions
- Custom integration assistance
- Performance optimization consulting

## Prevention Best Practices

### Regular Maintenance
1. Update dependencies regularly
2. Monitor system health metrics
3. Backup database and configurations
4. Test disaster recovery procedures

### Monitoring Setup
1. Set up application logging
2. Monitor database performance
3. Track API usage and limits
4. Set up alerting for critical issues

### Documentation
1. Document custom configurations
2. Keep setup guides updated
3. Maintain troubleshooting logs
4. Share solutions with team
    `.trim(),
    type: 'manual',
    status: 'published',
    category: 'Support',
    tags: ['troubleshooting', 'debugging', 'common issues', 'support'],
  },
]

async function seedKnowledgeBase() {
  console.log('🚀 Starting knowledge base seeding...')

  try {
    // Clear existing documents
    await db.delete(knowledgeDocuments)
    console.log('🧹 Cleared existing knowledge base')

    // Insert new documents
    for (const doc of seedDocuments) {
      const result = await db.insert(knowledgeDocuments).values({
        title: doc.title,
        content: doc.content,
        type: doc.type as any, // Cast to any for enum compatibility
        category: doc.category,
        status: doc.status as any, // Cast to any for enum compatibility
        tags: JSON.stringify(doc.tags),
        metadata: JSON.stringify({
          version: '1.0',
          lastReviewed: new Date().toISOString(),
          wordCount: doc.content.split(' ').length,
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning()

      console.log(`✅ Created document: ${doc.title}`)
    }

    console.log(`\n🎉 Successfully seeded ${seedDocuments.length} knowledge base documents!`)

  } catch (error) {
    console.error('❌ Error seeding knowledge base:', error)
    process.exit(1)
  }
}

// Run the seed function
seedKnowledgeBase().then(() => {
  console.log('✨ Knowledge base seeding completed!')
  process.exit(0)
}).catch((error) => {
  console.error('💥 Seeding failed:', error)
  process.exit(1)
})