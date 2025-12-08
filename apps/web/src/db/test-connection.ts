import { testConnection } from './index'

async function runConnectionTest() {
  console.log('🔍 Testing database connection...')

  const success = await testConnection()

  if (success) {
    console.log('✅ Database connection successful!')
    process.exit(0)
  } else {
    console.log('❌ Database connection failed!')
    console.log('\nPlease check:')
    console.log('1. PostgreSQL is running on localhost:5432')
    console.log('2. Database "aio-chat" exists')
    console.log('3. User "postgres" with password "postgres" has access')
    process.exit(1)
  }
}

runConnectionTest()