import * as vscode from "vscode";
import { StorageService } from "./services/storage.service";
import { GitService } from "./services/git.service";
import { ProjectScanner } from "./services/scanner.service";
import { ProjectTreeProvider } from "./tree-provider";
import { registerCommands } from "./commands";

/**
 * Ponto de ativação principal da extensão (Bootstrapping e Injeção de Dependências).
 * @param context Contexto da extensão fornecido pela API do VS Code.
 */
export function activate(context: vscode.ExtensionContext): void {
  // 1. Instancia os serviços de infraestrutura (SOLID - DIP/SRP)
  const storage = new StorageService(context);
  const git = new GitService();
  const scanner = new ProjectScanner();

  // 2. Inicializa o provedor de dados visuais injetando as dependências necessárias
  const treeProvider = new ProjectTreeProvider(storage, git);

  // 3. Registra e inicializa o componente de visualização lateral (TreeView)
  const treeView = vscode.window.createTreeView("projectOrganizer.projectsView", {
    treeDataProvider: treeProvider,
    showCollapseAll: false,
  });

  context.subscriptions.push(treeView);
  context.subscriptions.push(treeProvider);

  // 4. Registra centralizadamente os comandos da extensão (SRP)
  registerCommands(context, storage, git, scanner, treeProvider, treeView);

  // 5. Configura monitoramento (Watcher) do arquivo de dados físico para recarga em tempo real
  let fileWatcher: vscode.FileSystemWatcher | undefined;

  const setupWatcher = () => {
    if (fileWatcher) {
      fileWatcher.dispose();
    }
    const filePath = storage.getProjectsFilePath();
    fileWatcher = vscode.workspace.createFileSystemWatcher(filePath);
    fileWatcher.onDidChange(() => treeProvider.refresh());
    fileWatcher.onDidCreate(() => treeProvider.refresh());
    fileWatcher.onDidDelete(() => treeProvider.refresh());
    context.subscriptions.push(fileWatcher);
  };

  setupWatcher();

  // 6. Configura watcher de alterações de configurações da IDE relacionadas à extensão
  const configWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("projectOrganizer.customProjectsFile")) {
      setupWatcher();
      treeProvider.refresh();
    } else if (e.affectsConfiguration("projectOrganizer.treeExpanded")) {
      treeProvider.refresh();
    }
  });

  context.subscriptions.push(configWatcher);
}

/**
 * Ponto de desativação executado quando o VS Code desliga a extensão.
 */
export function deactivate(): void {}
