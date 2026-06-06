import * as vscode from "vscode";
import { IStorageManager } from "../interfaces/services.interface";
import { getProjectFromArg } from "./project-actions";

/**
 * Registra os comandos relacionados a favoritos e controle de visualização da árvore lateral.
 * @param context Contexto da extensão.
 * @param storage Serviço de persistência de dados.
 * @param treeView Instância da TreeView de projetos.
 * @param refreshCallback Callback para atualizar visualmente a árvore de projetos.
 * @param treeItemCreator Função fábrica para criar instâncias de ProjectTreeItem para reveal.
 */
export function registerFavoriteAndTreeActions(
  context: vscode.ExtensionContext,
  storage: IStorageManager,
  treeView: vscode.TreeView<any>,
  refreshCallback: () => void,
  treeItemCreator: (name: string, state: vscode.TreeItemCollapsibleState, type: string, project: any, path: string) => any
): void {
  // Comando: Favoritar Projeto
  const favoriteProjectCommand = vscode.commands.registerCommand(
    "projectOrganizer.favoriteProject",
    async (arg: any) => {
      const project = getProjectFromArg(arg);
      if (project) {
        try {
          await storage.updateProject(project.id, {
            favorite: true,
          });
          refreshCallback();
          vscode.window.showInformationMessage(
            vscode.l10n.t("Project '{0}' added to favorites.", project.name)
          );
        } catch (err) {
          vscode.window.showErrorMessage((err as Error).message);
        }
      }
    }
  );

  // Comando: Desfavoritar Projeto
  const unfavoriteProjectCommand = vscode.commands.registerCommand(
    "projectOrganizer.unfavoriteProject",
    async (arg: any) => {
      const project = getProjectFromArg(arg);
      if (project) {
        try {
          await storage.updateProject(project.id, {
            favorite: false,
          });
          refreshCallback();
          vscode.window.showInformationMessage(
            vscode.l10n.t("Project '{0}' removed from favorites.", project.name)
          );
        } catch (err) {
          vscode.window.showErrorMessage((err as Error).message);
        }
      }
    }
  );

  // Comando: Expandir todas as pastas de grupos na árvore lateral
  const expandAllCommand = vscode.commands.registerCommand(
    "projectOrganizer.expandAll",
    async () => {
      await vscode.workspace
        .getConfiguration("projectOrganizer")
        .update("treeExpanded", true, vscode.ConfigurationTarget.Global);

      try {
        const projects = await storage.getProjects();
        const groups = new Set<string>();
        for (const p of projects) {
          if (p.group) {
            const parts = p.group.split("/");
            let pathAcc = "";
            for (const part of parts) {
              pathAcc = pathAcc ? `${pathAcc}/${part}` : part;
              groups.add(pathAcc);
            }
          }
        }

        const sortedGroups = Array.from(groups).sort((a, b) => {
          return a.split("/").length - b.split("/").length;
        });

        for (const g of sortedGroups) {
          const parts = g.split("/");
          const name = parts[parts.length - 1];
          const item = treeItemCreator(
            name,
            vscode.TreeItemCollapsibleState.Expanded,
            "group",
            undefined,
            g
          );

          await treeView.reveal(item, {
            expand: true,
            select: false,
            focus: false,
          });
        }
      } catch (err) {
        // Ignora silenciosamente se o TreeView não estiver pronto
      }
    }
  );

  // Comando: Colapsar todas as pastas de grupos na árvore lateral
  const collapseAllCommand = vscode.commands.registerCommand(
    "projectOrganizer.collapseAll",
    async () => {
      await vscode.workspace
        .getConfiguration("projectOrganizer")
        .update("treeExpanded", false, vscode.ConfigurationTarget.Global);

      try {
        await vscode.commands.executeCommand(
          "workbench.actions.treeView.projectOrganizer.projectsView.collapseAll"
        );
      } catch (err) {
        // Ignora erros
      }
    }
  );

  // Comando: Atualizar a visualização em árvore
  const refreshCommand = vscode.commands.registerCommand(
    "projectOrganizer.refresh",
    () => {
      refreshCallback();
    }
  );

  context.subscriptions.push(
    favoriteProjectCommand,
    unfavoriteProjectCommand,
    expandAllCommand,
    collapseAllCommand,
    refreshCommand
  );
}
