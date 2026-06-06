import * as vscode from "vscode";
import { StorageService } from "./services/storage.service";
import { GitService } from "./services/git.service";
import { ProjectScanner } from "./services/scanner.service";
import { ProjectTreeProvider } from "./tree-provider";
import { registerCommands } from "./commands";
import { ProjectTreeDragAndDropController } from "./tree-dnd";

/**
 * Ponto de ativação principal da extensão (Bootstrapping e Injeção de Dependências)
 * @param context Contexto da extensão fornecido pela API do VS Code
 */
export function activate(context: vscode.ExtensionContext): void {
  // 1. Instancia os serviços de infraestrutura (SOLID - DIP/SRP)
  const storage = new StorageService(context);
  const git = new GitService();
  const scanner = new ProjectScanner();

  // 2. Inicializa os provedores de dados visuais injetando as dependências necessárias
  const favoritesTreeProvider = new ProjectTreeProvider(storage, git, "favorites");
  const projectsTreeProvider = new ProjectTreeProvider(storage, git, "all");

  const refreshAll = () => {
    favoritesTreeProvider.refresh();
    projectsTreeProvider.refresh();
  };

  // 3. Registra e inicializa os componentes de visualização lateral (TreeView) com suporte a Drag and Drop
  const dndController = new ProjectTreeDragAndDropController(storage, refreshAll);

  const favoritesTreeView = vscode.window.createTreeView("projectOrganizer.favoritesView", {
    treeDataProvider: favoritesTreeProvider,
    showCollapseAll: false,
    dragAndDropController: dndController,
  });

  const projectsTreeView = vscode.window.createTreeView("projectOrganizer.projectsView", {
    treeDataProvider: projectsTreeProvider,
    showCollapseAll: true,
    dragAndDropController: dndController,
  });

  context.subscriptions.push(
    favoritesTreeView,
    projectsTreeView,
    favoritesTreeProvider,
    projectsTreeProvider
  );

  // 4. Registra centralizadamente os comandos da extensão (SRP)
  registerCommands(
    context,
    storage,
    git,
    scanner,
    favoritesTreeProvider,
    projectsTreeProvider,
    favoritesTreeView,
    projectsTreeView
  );

  // 5. Configura monitoramento (Watcher) do arquivo de dados físico para recarga em tempo real
  let fileWatcher: vscode.FileSystemWatcher | undefined;

  const setupWatcher = () => {
    if (fileWatcher) {
      fileWatcher.dispose();
    }
    const filePath = storage.getProjectsFilePath();
    fileWatcher = vscode.workspace.createFileSystemWatcher(filePath);
    fileWatcher.onDidChange(refreshAll);
    fileWatcher.onDidCreate(refreshAll);
    fileWatcher.onDidDelete(refreshAll);
    context.subscriptions.push(fileWatcher);
  };

  setupWatcher();

  // 6. Configura watcher de alterações de configurações da IDE relacionadas à extensão
  const configWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("projectOrganizer.customProjectsFile")) {
      setupWatcher();
      refreshAll();
    } else if (
      e.affectsConfiguration("projectOrganizer.treeExpanded") ||
      e.affectsConfiguration("projectOrganizer.showDeprecated") ||
      e.affectsConfiguration("projectOrganizer.sortBy") ||
      e.affectsConfiguration("projectOrganizer.sortOrder")
    ) {
      refreshAll();
    }
  });

  context.subscriptions.push(configWatcher);
}

/**
 * Ponto de desativação executado quando o VS Code desliga a extensão
 */
export function deactivate(): void { }
