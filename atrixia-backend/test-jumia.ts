import { JumiaAdapter } from './src/lib/ai/adapters/jumia';

async function run() {
  const adapter = new JumiaAdapter();
  console.log('Searching Jumia...');
  const res = await adapter.search('comfortable ergonomic chair');
  console.log('Results:', res);
}
run();
