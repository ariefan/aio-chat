const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_TDWkVJGyEp94@ep-autumn-wildflower-a1rqhzux-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

client.connect()
  .then(() => client.query('SELECT COUNT(*) as count FROM pandawa_knowledge_base'))
  .then(res => {
    console.log('KB entries count:', res.rows[0].count);
    client.end();
  })
  .catch(err => {
    console.error('Error:', err.message);
    client.end();
    process.exit(1);
  });
