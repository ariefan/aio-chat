import { db } from '@/db'
import { knowledgeDocuments, operators } from '@/db/schema'
import { eq } from 'drizzle-orm'

const sampleDocuments = [
  {
    title: 'Payment Options and Methods',
    content: `AIO-CHAT accepts multiple payment methods to make it convenient for our customers:

1. **Online Payment Portal**
   - Credit/Debit cards (Visa, Mastercard, American Express)
   - Bank transfers (ACH)
   - Digital wallets (PayPal, Apple Pay, Google Pay)

2. **Automatic Payments**
   - Set up recurring automatic payments
   - Choose your payment date (1st-28th of each month)
   - Easily modify or cancel automatic payments anytime

3. **Payment Plans**
   - Standard payment plan: Pay in full within 30 days
   - Extended payment plan: Spread payments over 3-6 months
   - hardship assistance: Contact us for personalized payment arrangements

4. **Payment Processing Times**
   - Online payments: Immediate processing
   - Bank transfers: 2-3 business days
   - Automatic payments: Processed on scheduled date

5. **Payment Confirmation**
   - Email confirmation sent within 24 hours
   - SMS notifications available
   - Online account access for payment history

To set up automatic payments or discuss payment arrangements, please contact our customer service team.`,
    type: 'policy',
    category: 'Payments',
    tags: 'payment, billing, options, methods, automatic',
    status: 'published' as const
  },
  {
    title: 'Account Privacy and Security',
    content: `Protecting your personal information is our top priority at AIO-CHAT:

**Data Protection Measures:**
- End-to-end encryption for all communications
- Secure storage of personal data
- Regular security audits and updates
- Compliance with GDPR and data protection regulations

**Your Privacy Rights:**
- Access to your personal data
- Correction of inaccurate information
- Data deletion upon request
- Opt-out of marketing communications
- Portability of your data

**Security Best Practices for Customers:**
1. Use strong, unique passwords
2. Enable two-factor authentication
3. Regularly review account activity
4. Report suspicious activity immediately
5. Keep contact information updated

**Information We Collect:**
- Name and contact details
- Payment information (encrypted)
- Communication records
- Service usage data
- Technical information for service improvement

**How We Use Your Information:**
- Provide and maintain our services
- Process payments and manage accounts
- Send important notifications
- Improve our services and develop new features
- Comply with legal obligations

For detailed privacy policies or to exercise your data rights, contact our privacy team at privacy@aio-chat.com.`,
    type: 'policy',
    category: 'Privacy',
    tags: 'privacy, security, data, protection, GDPR',
    status: 'published' as const
  },
  {
    title: 'Service Subscription Management',
    content: `Managing your AIO-CHAT subscription is easy and flexible:

**Subscription Tiers:**
1. **Basic Plan**
   - Up to 1,000 messages/month
   - Email support
   - Basic analytics
   - $29/month

2. **Professional Plan**
   - Up to 5,000 messages/month
   - Priority email and chat support
   - Advanced analytics and reporting
   - Custom integrations
   - $79/month

3. **Enterprise Plan**
   - Unlimited messages
   - 24/7 phone support
   - Dedicated account manager
   - Custom features and SLA
   - Contact for pricing

**Managing Your Subscription:**
- Upgrade or downgrade anytime
- Changes take effect at next billing cycle
- No long-term contracts required
- Pause subscription for up to 3 months

**Billing and Payments:**
- Monthly or annual billing options
- 15% discount with annual billing
- Automatic renewal enabled by default
- Refund policy: 30-day money-back guarantee

**Cancellation Policy:**
- Cancel anytime without penalty
- Access continues until paid period ends
- Data export available before cancellation
- Reactivation within 6 months preserves settings

**Add-on Services:**
- Additional message blocks: $10 per 1,000 messages
- Priority support: $29/month
- Custom training: Starting at $199
- API access: Included in Professional and Enterprise

For plan changes or billing questions, contact our customer success team.`,
    type: 'manual',
    category: 'Subscriptions',
    tags: 'subscription, billing, plans, pricing, management',
    status: 'published' as const
  },
  {
    title: 'Technical Troubleshooting Guide',
    content: `Common technical issues and their solutions:

**Connection Issues:**
1. **Cannot connect to service**
   - Check internet connection
   - Verify firewall settings
   - Try alternative browser or device
   - Clear browser cache and cookies

2. **Slow performance**
   - Check internet speed (minimum 5 Mbps recommended)
   - Close other applications using bandwidth
   - Restart your device
   - Update to latest browser version

**Account Access Issues:**
1. **Forgot password**
   - Use "Forgot Password" link on login page
   - Check spam folder for reset email
   - Reset link expires after 24 hours

2. **Two-factor authentication problems**
   - Ensure correct time zone settings
   - Try backup codes
   - Contact support for account recovery

**Message and Communication Issues:**
1. **Messages not sending**
   - Check character limits (4,000 characters max)
   - Verify recipient information
   - Try sending a shorter test message

2. **Not receiving responses**
   - Check spam/junk folders
   - Verify notification settings
   - Confirm delivery status in message history

**Mobile App Issues:**
1. **App crashing**
   - Update to latest version
   - Restart device
   - Reinstall app if issues persist
   - Check available storage space

2. **Sync problems**
   - Ensure stable internet connection
   - Pull to refresh manually
   - Check last sync time in settings

**When to Contact Technical Support:**
- Issues persist after trying these solutions
- Error messages not covered in this guide
- Account-specific problems
- Service outages affecting multiple users

Include screenshots and error messages when contacting support for faster resolution.`,
    type: 'manual',
    category: 'Technical Support',
    tags: 'troubleshooting, technical, support, issues, solutions',
    status: 'published' as const
  },
  {
    title: 'Debt Collection Process and Rights',
    content: `Understanding the debt collection process and your rights:

**Our Collection Process:**
1. **Initial Contact (Day 1-30)**
   - Friendly payment reminders
   - Multiple contact attempts
   - Payment arrangement options offered

2. **Formal Notice (Day 31-60)**
   - Written notice of outstanding balance
   - Detailed payment history
   - Formal payment plan options

3. **Collection Agency (Day 61+)**
   - Account may be transferred to collection agency
   - Credit reporting may be affected
   - Additional fees may apply

**Your Rights Under Fair Debt Collection Practices:**
- Right to dispute the debt within 30 days
- Protection from harassment or abuse
- Right to request debt verification
- Control over communication methods and times
- Right to privacy regarding debt disclosure

**Communication Guidelines:**
- Contact between 8 AM and 9 PM, your time zone
- No contact at work if prohibited
- No disclosure to third parties
- Respect for requested communication preferences

**Payment Arrangements:**
- Partial payments accepted
- Payment plans based on financial situation
- Temporary hardship programs available
- Settlement options for qualifying accounts

**Dispute Resolution:**
1. **Formal Dispute Process**
   - Submit dispute in writing
   - Provide supporting documentation
   - Investigation within 30 days

2. **Independent Review**
   - Request third-party mediation
   - Credit bureau dispute options
   - Legal counsel consultation rights

**Hardship Considerations:**
- Medical circumstances
- Job loss or income reduction
- Natural disaster impact
- Military deployment

**For Assistance:**
- Customer service: 1-800-555-0123
- Financial hardship: hardship@aio-chat.com
- Formal disputes: disputes@aio-chat.com
- Complaint resolution: compliance@aio-chat.com

We are committed to fair treatment and finding reasonable solutions for all customers facing financial difficulties.`,
    type: 'policy',
    category: 'Debt Collection',
    tags: 'debt, collection, rights, process, payment',
    status: 'published' as const
  }
]

export async function seedKnowledgeBase() {
  try {
    console.log('📚 Starting knowledge base seeding...')

    // Get the first operator to use as created_by
    const [operator] = await db
      .select()
      .from(operators)
      .where(eq(operators.email, 'admin@aio-chat.com'))
      .limit(1)

    if (!operator) {
      console.log('❌ No admin operator found. Please create an admin operator first.')
      return
    }

    console.log(`👤 Using operator ${operator.name} as document creator`)

    let createdCount = 0
    let updatedCount = 0

    for (const doc of sampleDocuments) {
      try {
        // Check if document already exists
        const [existingDoc] = await db
          .select()
          .from(knowledgeDocuments)
          .where(eq(knowledgeDocuments.title, doc.title))
          .limit(1)

        if (existingDoc) {
          // Update existing document
          await db
            .update(knowledgeDocuments)
            .set({
              title: doc.title,
              content: doc.content,
              type: doc.type as any, // Cast for enum compatibility
              category: doc.category,
              status: doc.status as any, // Cast for enum compatibility
              tags: doc.tags,
              updatedAt: new Date(),
            })
            .where(eq(knowledgeDocuments.id, existingDoc.id))

          console.log(`📝 Updated existing document: ${doc.title}`)
          updatedCount++
        } else {
          // Create new document
          await db.insert(knowledgeDocuments).values({
            title: doc.title,
            content: doc.content,
            type: doc.type as any, // Cast for enum compatibility
            category: doc.category,
            status: doc.status as any, // Cast for enum compatibility
            tags: doc.tags,
          })

          console.log(`✅ Created new document: ${doc.title}`)
          createdCount++
        }
      } catch (error) {
        console.error(`❌ Failed to process document "${doc.title}":`, error)
      }
    }

    console.log(`📊 Knowledge base seeding complete:`)
    console.log(`   - Created: ${createdCount} new documents`)
    console.log(`   - Updated: ${updatedCount} existing documents`)
    console.log(`   - Total: ${createdCount + updatedCount} documents processed`)

    return {
      success: true,
      created: createdCount,
      updated: updatedCount,
      total: createdCount + updatedCount
    }

  } catch (error) {
    console.error('❌ Knowledge base seeding failed:', error)
    throw error
  }
}

// Run if this file is executed directly
if (require.main === module) {
  seedKnowledgeBase()
    .then((result) => {
      console.log('✅ Knowledge base seeding completed successfully:', result)
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Knowledge base seeding failed:', error)
      process.exit(1)
    })
}