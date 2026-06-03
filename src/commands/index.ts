import * as vscode from "vscode";
import { IStorageManager, IGitService, IProjectScanner } from "../interfaces/services.interface";
import { registerProjectActions } from "./project-actions";
import { registerProjectManagement } from "./project-manage";
import { registerFavoriteAndTreeActions } from "./favorite-actions";

/**
 * Registra todos os comandos expostos pela extensão, distribuindo-os para seus respectivos handlers modulares.
 * @param context Contexto de ativação da extensão.
 * @param storage Serviço de persistência de dados.
 * @param git Serviço de integração com Git.
 * @param scanner Serviço de escaneamento automático de pastas.
 * @param treeProvider Provedor de visualização em árvore.
 * @param treeView Instância física da TreeView do VS Code.
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  storage: IStorageManager,
  git: IGitService,
  scanner: IProjectScanner,
  treeProvider: any,
  treeView: vscode.TreeView<any>
): void {
  const refreshCallback = () => treeProvider.refresh();

  // 1. Registra ações diretas em projetos (abrir, terminal, finder)
  registerProjectActions(context, storage);

  // 2. Registra gerenciamento administrativo de projetos (CRUD, busca, scan)
  registerProjectManagement(context, storage, scanner, refreshCallback);

  // 3. Registra controle de favoritos e visualização de árvore (expandir, colapsar)
  const treeItemCreator = (
    name: string,
    state: vscode.TreeItemCollapsibleState,
    type: string,
    project: any,
    fullGroupPath: string
  ) => {
    // Importa dinamicamente para evitar dependências circulares durante a transpilação
    const { ProjectTreeItem } = require("../tree-provider");
    return new ProjectTreeItem(name, state, type, project, fullGroupPath);
  };

  registerFavoriteAndTreeActions(
    context,
    storage,
    treeView,
    refreshCallback,
    treeItemCreator
  );
}
