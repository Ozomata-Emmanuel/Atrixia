export interface ITool {
  readonly name: string;
  readonly description: string;
  execute(args: any): Promise<any>;
}

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools = new Map<string, ITool>();

  private constructor() {}

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  public registerTool(tool: ITool): void {
    this.tools.set(tool.name.toLowerCase(), tool);
  }

  public getTool(name: string): ITool | null {
    return this.tools.get(name.toLowerCase()) || null;
  }

  public async executeTool(name: string, args: any): Promise<any> {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool "${name}" is not registered in the ToolRegistry.`);
    }
    return tool.execute(args);
  }

  public listTools(): { name: string; description: string }[] {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
    }));
  }

  public clear(): void {
    this.tools.clear();
  }
}
