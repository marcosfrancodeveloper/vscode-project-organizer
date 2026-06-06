import * as vscode from "vscode";
import { IStorageManager } from "../interfaces/services.interface";

/**
 * Registra os comandos relacionados à ordenação e definição de posição de itens na árvore
 * @param context Contexto da extensão
 * @param storage Serviço de persistência de dados
 * @param refreshCallback Callback para atualizar visualmente a árvore de projetos
 */
export function registerSortActions(
  context: vscode.ExtensionContext,
  storage: IStorageManager,
  refreshCallback: () => void
): void {
  // Comando: Alterar Critério de Ordenação (Nome ou Último Acesso)
  const changeSortByCommand = vscode.commands.registerCommand(
    "projectOrganizer.changeSortBy",
    async () => {
      const config = vscode.workspace.getConfiguration("projectOrganizer");
      const currentSortBy = config.get<string>("sortBy", "name");

      const items = [
        {
          label: `$(tag) ${vscode.l10n.t("Sort by Name")}`,
          description: currentSortBy === "name" ? vscode.l10n.t("(Active)") : "",
          value: "name"
        },
        {
          label: `$(history) ${vscode.l10n.t("Sort by Last Accessed")}`,
          description: currentSortBy === "lastAccessed" ? vscode.l10n.t("(Active)") : "",
          value: "lastAccessed"
        }
      ];

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: vscode.l10n.t("Select sorting criteria")
      });

      if (selected) {
        await config.update("sortBy", selected.value, vscode.ConfigurationTarget.Global);
        refreshCallback();
        vscode.window.showInformationMessage(
          vscode.l10n.t("Sorting criteria changed to: {0}.", selected.value === "name" ? vscode.l10n.t("Name") : vscode.l10n.t("Last Accessed"))
        );
      }
    }
  );

  // Comando: Alternar Sentido de Ordenação (Ascendente ou Descendente)
  const changeSortOrderCommand = vscode.commands.registerCommand(
    "projectOrganizer.changeSortOrder",
    async () => {
      const config = vscode.workspace.getConfiguration("projectOrganizer");
      const currentOrder = config.get<string>("sortOrder", "asc");
      const newOrder = currentOrder === "asc" ? "desc" : "asc";

      await config.update("sortOrder", newOrder, vscode.ConfigurationTarget.Global);
      refreshCallback();
      vscode.window.showInformationMessage(
        vscode.l10n.t("Sort order changed to {0}.", newOrder === "asc" ? vscode.l10n.t("Ascending") : vscode.l10n.t("Descending"))
      );
    }
  );

  // Comando: Definir Posição Customizada
  const setPositionCommand = vscode.commands.registerCommand(
    "projectOrganizer.setPosition",
    async (arg: any) => {
      if (!arg) {
        vscode.window.showErrorMessage(
          vscode.l10n.t("This command must be triggered from a project or group row.")
        );
        return;
      }

      const isGroup = arg.type === "group";
      const isProject = arg.type === "project";

      if (!isGroup && !isProject) {
        vscode.window.showErrorMessage(
          vscode.l10n.t("Invalid target for setting position.")
        );
        return;
      }

      let currentPosition: number | undefined;
      let displayName = "";

      if (isProject && arg.project) {
        currentPosition = arg.project.position;
        displayName = arg.project.name;
      } else if (isGroup && arg.groupNode) {
        currentPosition = arg.groupNode.position;
        displayName = arg.groupNode.name;
      }

      const input = await vscode.window.showInputBox({
        title: vscode.l10n.t("Set Position for '{0}'", displayName),
        prompt: vscode.l10n.t("Enter a numeric position (e.g. 1, 2, 3...) or leave empty to clear:"),
        value: currentPosition !== undefined ? String(currentPosition) : "",
        validateInput: (value) => {
          if (value.trim() === "") {
            return null;
          }
          const num = Number(value);
          if (isNaN(num) || !Number.isInteger(num)) {
            return vscode.l10n.t("Please enter a valid integer.");
          }
          return null;
        },
      });

      if (input === undefined) {
        return; // cancelado
      }

      const newPosition = input.trim() === "" ? undefined : parseInt(input.trim(), 10);

      try {
        if (isProject && arg.project) {
          await storage.updateProject(arg.project.id, {
            position: newPosition,
          });
        } else if (isGroup && arg.fullGroupPath) {
          await storage.updateGroupPosition(arg.fullGroupPath, newPosition);
        }
        refreshCallback();
        if (newPosition !== undefined) {
          vscode.window.showInformationMessage(
            vscode.l10n.t("Position set to {0} for '{1}'.", newPosition, displayName)
          );
        } else {
          vscode.window.showInformationMessage(
            vscode.l10n.t("Position cleared for '{0}'.", displayName)
          );
        }
      } catch (err) {
        vscode.window.showErrorMessage((err as Error).message);
      }
    }
  );

  context.subscriptions.push(
    changeSortByCommand,
    changeSortOrderCommand,
    setPositionCommand
  );
}
