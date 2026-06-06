import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { IStorageManager, IProjectScanner } from "../interfaces/services.interface";
import { getProjectFromArg } from "./project-actions";

/**
 * Registra os comandos relacionados ao gerenciamento
 * estrutural de projetos (CRUD, busca fuzzy, escaneamento e importações)
 * @param context Contexto da extensão
 * @param storage Serviço de persistência de dados
 * @param scanner Serviço de escaneamento automático
 * @param refreshCallback Callback para atualizar a interface gráfica da árvore
 */
export function registerProjectManagement(
  context: vscode.ExtensionContext,
  storage: IStorageManager,
  scanner: IProjectScanner,
  refreshCallback: () => void
): void {
  // Comando: Adicionar Projeto Ativo (Workspace Atual)
  const addProjectCommand = vscode.commands.registerCommand(
    "projectOrganizer.addProject",
    async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage(
          vscode.l10n.t("There is no folder open in the current workspace.")
        );
        return;
      }

      const workspaceFolder = workspaceFolders[0];
      const folderPath = workspaceFolder.uri.fsPath;
      const defaultName = workspaceFolder.name;

      const name = await vscode.window.showInputBox({
        prompt: vscode.l10n.t("Enter project name"),
        value: defaultName,
        placeHolder: vscode.l10n.t("Ex: Web Portal"),
      });

      if (!name) {
        return;
      }

      const group = await vscode.window.showInputBox({
        prompt: vscode.l10n.t("Enter project group (optional, use '/' for subfolders)"),
        placeHolder: vscode.l10n.t("Ex: Work/Frontend"),
      });

      try {
        await storage.addProject(name, folderPath, group);
        refreshCallback();
        vscode.window.showInformationMessage(
          vscode.l10n.t("Project '{0}' added successfully!", name)
        );
      } catch (err) {
        vscode.window.showErrorMessage((err as Error).message);
      }
    }
  );

  // Comando: Adicionar Pasta Física como Projeto...
  const addProjectFolderCommand = vscode.commands.registerCommand(
    "projectOrganizer.addProjectFolder",
    async () => {
      const folderUri = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: vscode.l10n.t("Select Project Folder"),
      });

      if (!folderUri || folderUri.length === 0) {
        return;
      }

      const folderPath = folderUri[0].fsPath;
      const defaultName = path.basename(folderPath);

      const name = await vscode.window.showInputBox({
        prompt: vscode.l10n.t("Enter project name"),
        value: defaultName,
      });

      if (!name) {
        return;
      }

      const group = await vscode.window.showInputBox({
        prompt: vscode.l10n.t("Enter project group (optional, use '/' for subfolders)"),
        placeHolder: vscode.l10n.t("Ex: Work/Backend"),
      });

      try {
        await storage.addProject(name, folderPath, group);
        refreshCallback();
        vscode.window.showInformationMessage(
          vscode.l10n.t("Project '{0}' added successfully!", name)
        );
      } catch (err) {
        vscode.window.showErrorMessage((err as Error).message);
      }
    }
  );

  // Comando: Remover Projeto
  const removeProjectCommand = vscode.commands.registerCommand(
    "projectOrganizer.removeProject",
    async (arg?: any) => {
      let projectToRemove = getProjectFromArg(arg);

      if (!projectToRemove) {
        const projects = await storage.getProjects();
        if (projects.length === 0) {
          vscode.window.showInformationMessage(vscode.l10n.t("No projects registered."));
          return;
        }

        const picked = await vscode.window.showQuickPick(
          await Promise.all(
            projects.map(async (p) => {
              const groupPath = await storage.getProjectGroupPath(p.id);
              return {
                label: p.name,
                description: groupPath || vscode.l10n.t("No group"),
                detail: p.path,
                project: p,
              };
            })
          ),
          { placeHolder: vscode.l10n.t("Select the project you want to remove") }
        );

        if (picked) {
          projectToRemove = picked.project;
        }
      }

      if (!projectToRemove) {
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        vscode.l10n.t("Are you sure you want to remove project '{0}' from Project Organizer?", projectToRemove.name),
        { modal: true },
        vscode.l10n.t("Yes"),
        vscode.l10n.t("No")
      );

      if (confirm === vscode.l10n.t("Yes")) {
        await storage.removeProject(projectToRemove.id);
        refreshCallback();
        vscode.window.showInformationMessage(
          vscode.l10n.t("Project '{0}' removed.", projectToRemove.name)
        );
      }
    }
  );

  // Comando: Renomear ou Alterar Grupo de um Projeto
  const renameProjectCommand = vscode.commands.registerCommand(
    "projectOrganizer.renameProject",
    async (arg?: any) => {
      let project = getProjectFromArg(arg);

      if (!project) {
        const projects = await storage.getProjects();
        if (projects.length === 0) {
          vscode.window.showInformationMessage(vscode.l10n.t("No projects registered."));
          return;
        }

        const picked = await vscode.window.showQuickPick(
          await Promise.all(
            projects.map(async (p) => {
              const groupPath = await storage.getProjectGroupPath(p.id);
              return {
                label: p.name,
                description: groupPath || vscode.l10n.t("No group"),
                project: p,
              };
            })
          ),
          { placeHolder: vscode.l10n.t("Select the project you want to rename/edit") }
        );

        if (picked) {
          project = picked.project;
        }
      }

      if (!project) {
        return;
      }

      const newName = await vscode.window.showInputBox({
        prompt: vscode.l10n.t("Enter new project name"),
        value: project.name,
      });

      if (newName === undefined) {
        return;
      }

      const currentGroup = await storage.getProjectGroupPath(project.id);
      const newGroup = await vscode.window.showInputBox({
        prompt: vscode.l10n.t("Enter new group (use '/' for subfolders or leave blank for none)"),
        value: currentGroup || "",
      });

      if (newGroup === undefined) {
        return;
      }

      try {
        await storage.updateProject(project.id, {
          name: newName.trim() !== "" ? newName : project.name,
          group: newGroup,
        });
        refreshCallback();
        vscode.window.showInformationMessage(vscode.l10n.t("Project updated."));
      } catch (err) {
        vscode.window.showErrorMessage((err as Error).message);
      }
    }
  );

  // Comando: Escanear Pastas de Busca Configuradas
  const scanProjectsCommand = vscode.commands.registerCommand(
    "projectOrganizer.scanProjects",
    async () => {
      const config = vscode.workspace.getConfiguration("projectOrganizer");
      const scanPaths = config.get<string[]>("scanPaths", []);
      const scanDepth = config.get<number>("scanDepth", 3);
      const ignoredFolders = config.get<string[]>("ignoredFolders", []);

      if (scanPaths.length === 0) {
        vscode.window.showWarningMessage(
          vscode.l10n.t("No scan paths configured. Add folders in 'projectOrganizer.scanPaths' settings."),
          vscode.l10n.t("Open Settings")
        ).then((selection) => {
          if (selection === vscode.l10n.t("Open Settings")) {
            vscode.commands.executeCommand(
              "workbench.action.openSettings",
              "projectOrganizer.scanPaths"
            );
          }
        });
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: vscode.l10n.t("Project Organizer: Scanning directories..."),
          cancellable: false,
        },
        async (progress) => {
          const currentProjects = await storage.getProjects();
          const existingPaths = new Set(
            currentProjects.map((p) => path.resolve(p.path))
          );
          let newCount = 0;

          for (let i = 0; i < scanPaths.length; i++) {
            const scanPath = scanPaths[i];
            progress.report({
              message: vscode.l10n.t("Scanning {0}... ({1}/{2})", path.basename(scanPath), i + 1, scanPaths.length),
            });

            const found = await scanner.scan(
              scanPath,
              scanDepth,
              ignoredFolders
            );

            for (const item of found) {
              const resolved = path.resolve(item.path);
              if (!existingPaths.has(resolved)) {
                await storage.addProject(item.name, item.path, item.groupPath);
                existingPaths.add(resolved);
                newCount++;
              }
            }
          }

          refreshCallback();
          vscode.window.showInformationMessage(
            vscode.l10n.t("Scan completed! {0} new projects found.", newCount)
          );
        }
      );
    }
  );

  // Comando: Pesquisa Rápida Global de Projetos (Fuzzy Quick Open)
  const searchProjectCommand = vscode.commands.registerCommand(
    "projectOrganizer.searchProject",
    async () => {
      const projects = await storage.getProjects();
      if (projects.length === 0) {
        vscode.window.showInformationMessage(vscode.l10n.t("No projects registered."));
        return;
      }

      const sorted = [...projects].sort((a, b) => b.lastAccessed - a.lastAccessed);

      const items = await Promise.all(
        sorted.map(async (p) => {
          let label = p.name;
          const groupPath = await storage.getProjectGroupPath(p.id);
          if (groupPath) {
            label = `$(folder) [${groupPath}] ${p.name}`;
          }

          let description = p.path;
          if (p.tags && p.tags.length > 0) {
            description += ` • $(tag) ${p.tags.join(", ")}`;
          }

          return {
            label,
            description,
            detail: p.notes,
            project: p,
          };
        })
      );

      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: vscode.l10n.t("Search by project name, group or path..."),
        matchOnDescription: true,
        matchOnDetail: true,
      });

      if (picked) {
        const option = await vscode.window.showQuickPick(
          [vscode.l10n.t("Open in Active Window"), vscode.l10n.t("Open in New Window")],
          { placeHolder: vscode.l10n.t("How to open project '{0}'?", picked.project.name) }
        );

        if (option === vscode.l10n.t("Open in Active Window")) {
          vscode.commands.executeCommand(
            "projectOrganizer.openProject",
            picked.project
          );
        } else if (option === vscode.l10n.t("Open in New Window")) {
          vscode.commands.executeCommand(
            "projectOrganizer.openProjectInNewWindow",
            picked.project
          );
        }
      }
    }
  );

  // Comando: Abrir arquivo JSON físico para edição direta
  const editProjectsJsonCommand = vscode.commands.registerCommand(
    "projectOrganizer.editProjectsJson",
    async () => {
      const filePath = storage.getProjectsFilePath();
      const uri = vscode.Uri.file(filePath);

      let isEmpty = true;
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, "utf-8").trim();
          if (
            content !== "" &&
            content !== "{}" &&
            content !== "[]" &&
            content !== "{\n}" &&
            content !== "{\r\n}" &&
            content !== "[\n]" &&
            content !== "[\r\n]"
          ) {
            isEmpty = false;
          }
        } catch {
          // Ignora erro
        }
      }

      if (isEmpty) {
        // Inicializa com dados fictícios caso vazio
        const template = (storage.constructor as any).getDefaultTemplate
          ? (storage.constructor as any).getDefaultTemplate()
          : [];
        await storage.saveProjectsTree(template);
        refreshCallback();
      }

      try {
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
      } catch (err) {
        vscode.window.showErrorMessage(
          vscode.l10n.t("Could not open projects file: {0}", (err as Error).message)
        );
      }
    }
  );

  // Comando: Importar dados da extensão Project Manager
  const importProjectManagerCommand = vscode.commands.registerCommand(
    "projectOrganizer.importProjectManager",
    async () => {
      const option = await vscode.window.showQuickPick(
        [
          {
            label: vscode.l10n.t("Merge"),
            description: vscode.l10n.t("Keep current projects and add newly imported ones."),
            value: true,
          },
          {
            label: vscode.l10n.t("Replace"),
            description: vscode.l10n.t("Remove all current projects and import only from Project Manager."),
            value: false,
          },
        ],
        { placeHolder: vscode.l10n.t("How would you like to handle imported projects?") }
      );

      if (!option) {
        return;
      }

      try {
        const count = await storage.importFromProjectManager(option.value);
        if (count > 0) {
          refreshCallback();
          vscode.window.showInformationMessage(
            vscode.l10n.t("Import completed! {0} projects imported successfully.", count)
          );
        } else {
          vscode.window.showInformationMessage(
            vscode.l10n.t("No new projects were imported (all already exist).")
          );
        }
      } catch (err) {
        vscode.window.showErrorMessage(
          vscode.l10n.t("Import failed: {0}", (err as Error).message)
        );
      }
    }
  );

  context.subscriptions.push(
    addProjectCommand,
    addProjectFolderCommand,
    removeProjectCommand,
    renameProjectCommand,
    scanProjectsCommand,
    searchProjectCommand,
    editProjectsJsonCommand,
    importProjectManagerCommand
  );
}
