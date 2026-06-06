import * as vscode from "vscode";
import { IStorageManager } from "../interfaces/services.interface";
import { getProjectFromArg } from "./project-actions";

/**
 * Registra os comandos relacionados ao arquivamento/depreciação de projetos
 * @param context Contexto da extensão
 * @param storage Serviço de persistência de dados
 * @param refreshCallback Callback para atualizar visualmente a árvore de projetos
 */
export function registerProjectDeprecatedActions(
  context: vscode.ExtensionContext,
  storage: IStorageManager,
  refreshCallback: () => void
): void {
  // Comando: Depreciar/Arquivar Projeto
  const deprecateProjectCommand = vscode.commands.registerCommand(
    "projectOrganizer.deprecateProject",
    async (arg: any) => {
      const project = getProjectFromArg(arg);
      if (project) {
        try {
          await storage.updateProject(project.id, {
            deprecated: true,
          });
          refreshCallback();
          vscode.window.showInformationMessage(
            vscode.l10n.t("Project '{0}' has been deprecated.", project.name)
          );
        } catch (err) {
          vscode.window.showErrorMessage((err as Error).message);
        }
      }
    }
  );

  // Comando: Reativar/Desarquivar Projeto
  const undeprecateProjectCommand = vscode.commands.registerCommand(
    "projectOrganizer.undeprecateProject",
    async (arg: any) => {
      const project = getProjectFromArg(arg);
      if (project) {
        try {
          await storage.updateProject(project.id, {
            deprecated: false,
          });
          refreshCallback();
          vscode.window.showInformationMessage(
            vscode.l10n.t("Project '{0}' is now active.", project.name)
          );
        } catch (err) {
          vscode.window.showErrorMessage((err as Error).message);
        }
      }
    }
  );

  context.subscriptions.push(
    deprecateProjectCommand,
    undeprecateProjectCommand
  );
}
