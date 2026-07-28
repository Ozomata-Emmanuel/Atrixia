import { AIOrchestrator } from './src/lib/ai/orchestrator/orchestrator';

async function run() {
  try {
    const orchestrator = new AIOrchestrator();
    console.log('Testing orchestrator...');
    const result = await orchestrator.processQuery('test-user', {
      query: 'comfortable ergonomic chair for home office under $300',
      context: { messages: [] }
    });
    console.log(result);
  } catch (e) {
    console.error(e);
  }
}
run();
