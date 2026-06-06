import * as vscode from "vscode";
import { exec } from "child_process";
import { Project } from "../interfaces/models.interface";
import { IStorageManager } from "../interfaces/services.interface";

/**
 * Helper utilitário para extrair o objeto `Project`
 * a partir do argumento recebido pelo comando do VS Code
 * @param arg Argumento que pode ser um ProjectTreeItem ou o objeto Project bruto
 */
export function getProjectFromArg(arg: any): Project | undefined {
  if (!arg) {
    return undefined;
  }
  if (typeof arg.path === "string") {
    return arg as Project;
  }
  if (arg.type === "project" && arg.project) {
    return arg.project as Project;
  }
  return undefined;
}

/**
 * Registra os comandos relacionados a ações diretas em projetos
 * @param context Contexto da extensão
 * @param storage Serviço de persistência
 */
export function registerProjectActions(
  context: vscode.ExtensionContext,
  storage: IStorageManager
): void {
  // Comando: Abrir Projeto (Mesma Janela)
  const openProjectCommand = vscode.commands.registerCommand(
    "projectOrganizer.openProject",
    async (arg: any) => {
      const project = getProjectFromArg(arg);
      if (!project) {
        return;
      }

      // Atualiza timestamp de último acesso
      await storage.updateProject(project.id, {
        lastAccessed: Date.now(),
      });

      const uri = vscode.Uri.file(project.path);
      await vscode.commands.executeCommand("vscode.openFolder", uri, {
        forceNewWindow: false,
      });
    }
  );

  // Comando: Abrir Projeto em Nova Janela
  const openProjectInNewWindowCommand = vscode.commands.registerCommand(
    "projectOrganizer.openProjectInNewWindow",
    async (arg: any) => {
      const project = getProjectFromArg(arg);
      if (!project) {
        return;
      }

      await storage.updateProject(project.id, {
        lastAccessed: Date.now(),
      });

      const uri = vscode.Uri.file(project.path);
      await vscode.commands.executeCommand("vscode.openFolder", uri, {
        forceNewWindow: true,
      });
    }
  );

  // Comando: Abrir Terminal Integrado
  const openTerminalCommand = vscode.commands.registerCommand(
    "projectOrganizer.openTerminal",
    (arg: any) => {
      const project = getProjectFromArg(arg);
      if (project) {
        const terminal = vscode.window.createTerminal({
          name: project.name,
          cwd: project.path,
        });
        terminal.show();
      }
    }
  );

  // Comando: Revelar no Finder/Explorer
  const revealInFinderCommand = vscode.commands.registerCommand(
    "projectOrganizer.revealInFinder",
    (arg: any) => {
      const project = getProjectFromArg(arg);
      if (project) {
        const projectPath = project.path;
        if (process.platform === "darwin") {
          exec(`open "${projectPath}"`);
        } else if (process.platform === "win32") {
          exec(`explorer.exe "${projectPath}"`);
        } else {
          exec(`xdg-open "${projectPath}"`);
        }
      }
    }
  );

  context.subscriptions.push(
    openProjectCommand,
    openProjectInNewWindowCommand,
    openTerminalCommand,
    revealInFinderCommand
  );
}
