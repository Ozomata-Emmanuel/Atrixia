import { IAIProvider } from './interface';
import { GemmaProvider } from './gemma';

export class ProviderFactory {
  private static defaultProvider: IAIProvider;

  public static getProvider(): IAIProvider {
    if (!ProviderFactory.defaultProvider) {
      ProviderFactory.defaultProvider = new GemmaProvider();
    }
    return ProviderFactory.defaultProvider;
  }
}
