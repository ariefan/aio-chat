import { db } from './index'
import { operators, users, conversations, messages, messageTemplates, automationRules } from './schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

async function seedDatabase() {
  console.log('🌱 Starting database seeding...')

  try {
    // Clear existing data (in reverse order of dependencies)
    await db.delete(messages)
    await db.delete(conversations)
    await db.delete(users)
    await db.delete(messageTemplates)
    await db.delete(automationRules)
    await db.delete(operators)

    // Create admin operator
    const adminPasswordHash = await bcrypt.hash('admin123', 10)
    const [admin] = await db.insert(operators).values({
      email: 'admin@aio-chat.com',
      name: 'Admin User',
      passwordHash: adminPasswordHash,
      role: 'admin',
      isActive: true,
    }).returning()

    // Create operator user
    const operatorPasswordHash = await bcrypt.hash('operator123', 10)
    const [operator] = await db.insert(operators).values({
      email: 'operator@aio-chat.com',
      name: 'Chat Operator',
      passwordHash: operatorPasswordHash,
      role: 'operator',
      isActive: true,
    }).returning()

    if (!admin || !operator) {
      throw new Error('Failed to create operators')
    }

    console.log('✅ Created operators:', { admin: admin.email, operator: operator.email })

    // Create test users (end users)
    const [user1] = await db.insert(users).values({
      platformId: '6281234567890', // WhatsApp format
      platformType: 'whatsapp',
      status: 'verified',
      phone: '+6281234567890',
      name: 'John Doe',
      metadata: {
        policyNumber: 'POL-001',
        premiumAmount: 500000,
        dueDate: '2025-01-15',
      },
      verifiedAt: new Date(),
    }).returning()

    const [user2] = await db.insert(users).values({
      platformId: '6289876543210', // WhatsApp format
      platformType: 'whatsapp',
      status: 'active',
      phone: '+6289876543210',
      name: 'Jane Smith',
      metadata: {
        policyNumber: 'POL-002',
        premiumAmount: 750000,
        dueDate: '2025-01-20',
      },
      verifiedAt: new Date(),
    }).returning()

    const [user3] = await db.insert(users).values({
      platformId: '123456789', // Telegram format
      platformType: 'telegram',
      status: 'pending',
      name: 'Bob Wilson',
      metadata: {
        policyNumber: 'POL-003',
        premiumAmount: 300000,
        dueDate: '2025-01-25',
      },
    }).returning()

    if (!user1 || !user2 || !user3) {
      throw new Error('Failed to create users')
    }

    console.log('✅ Created test users:', {
      user1: user1.name,
      user2: user2.name,
      user3: user3.name
    })

    // Create conversations
    const [conv1] = await db.insert(conversations).values({
      userId: user1.id,
      assignedOperatorId: operator.id,
      status: 'active',
    }).returning()

    const [conv2] = await db.insert(conversations).values({
      userId: user2.id,
      status: 'active',
    }).returning()

    const [conv3] = await db.insert(conversations).values({
      userId: user3.id,
      assignedOperatorId: admin.id,
      status: 'active',
    }).returning()

    if (!conv1 || !conv2 || !conv3) {
      throw new Error('Failed to create conversations')
    }

    console.log('✅ Created conversations')

    // Create sample messages
    await db.insert(messages).values([
      {
        conversationId: conv1.id,
        direction: 'outbound',
        content: 'Hello John! This is a reminder about your insurance premium payment of IDR 500,000 due on January 15, 2025.',
        messageType: 'text',
        status: 'delivered',
        sentAt: new Date('2025-01-10T10:00:00Z'),
        deliveredAt: new Date('2025-01-10T10:01:00Z'),
      },
      {
        conversationId: conv1.id,
        direction: 'inbound',
        content: 'Thank you for the reminder. I will make the payment soon.',
        messageType: 'text',
        status: 'read',
        sentAt: new Date('2025-01-10T10:30:00Z'),
        deliveredAt: new Date('2025-01-10T10:30:00Z'),
        readAt: new Date('2025-01-10T11:00:00Z'),
      },
      {
        conversationId: conv2.id,
        direction: 'outbound',
        content: 'Hi Jane! Your insurance premium of IDR 750,000 is due on January 20, 2025.',
        messageType: 'text',
        status: 'sent',
        sentAt: new Date('2025-01-12T14:00:00Z'),
      },
      {
        conversationId: conv3.id,
        direction: 'outbound',
        content: 'Welcome to our chat service! Please verify your account to continue.',
        messageType: 'text',
        status: 'sent',
        sentAt: new Date('2025-01-13T09:00:00Z'),
      },
    ])

    console.log('✅ Created sample messages')

    // Create message templates
    await db.insert(messageTemplates).values([
      {
        name: 'Payment Reminder',
        description: 'Template for reminding users about premium payments',
        content: 'Hello {name}! This is a reminder about your insurance premium payment of IDR {amount} due on {dueDate}.',
        variables: JSON.stringify(['name', 'amount', 'dueDate']),
        category: 'payment',
        language: 'en',
        isActive: true,
        createdBy: admin.id,
      },
      {
        name: 'Welcome Message',
        description: 'Welcome message for new users',
        content: 'Welcome to AIO-CHAT! Please verify your account to access personalized services.',
        variables: JSON.stringify([]),
        category: 'welcome',
        language: 'en',
        isActive: true,
        createdBy: admin.id,
      },
      {
        name: 'Verification Request',
        description: 'Template for requesting user verification',
        content: 'To complete verification, please confirm your phone number: {phone}',
        variables: JSON.stringify(['phone']),
        category: 'verification',
        language: 'en',
        isActive: true,
        createdBy: admin.id,
      },
    ])

    console.log('✅ Created message templates')

    // Create automation rules - DISABLED for now to avoid schema issues
    // await db.insert(automationRules).values([
    //   {
    //     name: 'Payment Reminder - 7 Days Before Due',
    //     description: 'Send reminder 7 days before payment due date',
    //     triggerType: 'time_based' as any,
    //     triggerConfig: JSON.stringify({
    //       type: 'payment_due',
    //       daysBefore: 7,
    //     }),
    //     actions: JSON.stringify({
    //       type: 'send_message',
    //       template: 'Payment Reminder',
    //     }),
    //     isActive: true,
    //     priority: 1,
    //     createdBy: admin.id,
    //   },
    //   {
    //     name: 'Payment Reminder - 1 Day Before Due',
    //     description: 'Send final reminder 1 day before payment due date',
    //     triggerType: 'time_based' as any,
    //     triggerConfig: JSON.stringify({
    //       type: 'payment_due',
    //       daysBefore: 1,
    //     }),
    //     actions: JSON.stringify({
    //       type: 'send_message',
    //       template: 'Payment Reminder',
    //     }),
    //     isActive: true,
    //     priority: 2,
    //     createdBy: admin.id,
    //   },
    // ])

    console.log('✅ Automation rules skipped (disabled to avoid schema issues)')

    console.log('🎉 Database seeding completed successfully!')

    console.log('\n📊 Summary:')
    console.log(`   - Operators: 2`)
    console.log(`   - Users: ${3}`)
    console.log(`   - Conversations: ${3}`)
    console.log(`   - Messages: ${4}`)
    console.log(`   - Templates: ${3}`)
    console.log(`   - Automation Rules: ${2}`)

    console.log('\n🔑 Login credentials:')
    console.log(`   - Admin: admin@aio-chat.com / admin123`)
    console.log(`   - Operator: operator@aio-chat.com / operator123`)

  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error)
      process.exit(1)
    })
}

export { seedDatabase }