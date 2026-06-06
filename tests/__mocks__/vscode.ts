export const workspace = {
  getConfiguration: jest.fn().mockReturnValue({
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      if (key === "customProjectsFile") {
        return "";
      }
      return defaultValue;
    })
  })
};

export const window = {
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn()
};

export const l10n = {
  t: jest.fn().mockImplementation((str: string, ...args: any[]) => {
    let result = str;
    args.forEach((val, index) => {
      result = result.replace(`{${index}}`, String(val));
    });
    return result;
  })
};

export class Uri {
  static file(path: string) {
    return new Uri("file", "", path, "", "");
  }
  static parse(val: string) {
    return new Uri("http", "", val, "", "");
  }
  private constructor(
    public readonly scheme: string,
    public readonly authority: string,
    public readonly path: string,
    public readonly query: string,
    public readonly fragment: string
  ) {}
  get fsPath(): string {
    return this.path;
  }
  toString() {
    return `${this.scheme}://${this.path}`;
  }
}

export interface ExtensionContext {
  globalStorageUri: Uri;
  globalState: {
    get<T>(key: string): T | undefined;
    get<T>(key: string, defaultValue: T): T;
    update(key: string, value: any): Promise<void>;
  };
}

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2
}

export class TreeItem {
  public id?: string;
  public iconPath?: ThemeIcon | Uri | { light: Uri | ThemeIcon; dark: Uri | ThemeIcon };
  public tooltip?: string | any;
  public description?: string | boolean;
  public contextValue?: string;
  public command?: any;

  constructor(
    public readonly label: string | any,
    public readonly collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.None
  ) {}
}

export class ThemeIcon {
  constructor(public readonly id: string, public readonly color?: any) {}
}

export class EventEmitter<T> {
  private listeners: ((e: T) => any)[] = [];
  get event() {
    return (listener: (e: T) => any) => {
      this.listeners.push(listener);
      return {
        dispose: () => {
          this.listeners = this.listeners.filter(l => l !== listener);
        }
      };
    };
  }
  fire(data: T): void {
    this.listeners.forEach(l => l(data));
  }
}

