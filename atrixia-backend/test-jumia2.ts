import { JumiaAdapter } from './src/lib/ai/adapters/jumia';

async function run() {
  const adapter = new JumiaAdapter();
  console.log('Searching long query...');
  const res1 = await adapter.search('comfortable ergonomic chair for home office under $300');
  console.log('Long query results:', res1.length);
  
  console.log('Searching short query...');
  const res2 = await adapter.search('ergonomic chair');
  console.log('Short query results:', res2.length);
}
run();
