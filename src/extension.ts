import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { exec } from "child_process";
import { StorageManager } from "./storage";
import { ProjectTreeProvider, ProjectTreeItem } from "./treeProvider";
import { ProjectScanner } from "./scanner";
import { Project } from "./types";

export function activate(context: vscode.ExtensionContext) {
  const storageManager = new StorageManager(context);
  const treeProvider = new ProjectTreeProvider(storageManager);

  // Registrar Tree View
  const treeView = vscode.window.createTreeView("projectOrganizer.projectsView", {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });

  context.subscriptions.push(treeView);
  context.subscriptions.push(treeProvider);

  // Comando: Atualizar Lista
  const refreshCommand = vscode.commands.registerCommand(
    "projectOrganizer.refresh",
    () => {
      treeProvider.refresh();
      vscode.window.showInformationMessage("Lista de projetos atualizada.");
    }
  );
  context.subscriptions.push(refreshCommand);

  // Comando: Adicionar Projeto Atual
  const addProjectCommand = vscode.commands.registerCommand(
    "projectOrganizer.addProject",
    async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage(
          "Não há nenhuma pasta aberta no workspace atual."
        );
        return;
      }

      // Se for multi-root, pega a primeira pasta
      const workspaceFolder = workspaceFolders[0];
      const folderPath = workspaceFolder.uri.fsPath;
      const defaultName = workspaceFolder.name;

      const name = await vscode.window.showInputBox({
        prompt: "Digite o nome do projeto",
        value: defaultName,
        placeHolder: "Ex: Portal Web",
      });

      if (!name) {
        return;
      }

      const group = await vscode.window.showInputBox({
        prompt: "Digite o grupo do projeto (opcional, use '/' para subníveis)",
        placeHolder: "Ex: Trabalho/Frontend",
      });

      try {
        await storageManager.addProject(name, folderPath, group);
        treeProvider.refresh();
        vscode.window.showInformationMessage(
          `Projeto '${name}' adicionado com sucesso!`
        );
      } catch (err) {
        vscode.window.showErrorMessage((err as Error).message);
      }
    }
  );
  context.subscriptions.push(addProjectCommand);

  // Comando: Adicionar Pasta como Projeto...
  const addProjectFolderCommand = vscode.commands.registerCommand(
    "projectOrganizer.addProjectFolder",
    async () => {
      const folderUri = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: "Selecionar Pasta do Projeto",
      });

      if (!folderUri || folderUri.length === 0) {
        return;
      }

      const folderPath = folderUri[0].fsPath;
      const defaultName = path.basename(folderPath);

      const name = await vscode.window.showInputBox({
        prompt: "Digite o nome do projeto",
        value: defaultName,
      });

      if (!name) {
        return;
      }

      const group = await vscode.window.showInputBox({
        prompt: "Digite o grupo do projeto (opcional, use '/' para subníveis)",
        placeHolder: "Ex: Trabalho/Backend",
      });

      try {
        await storageManager.addProject(name, folderPath, group);
        treeProvider.refresh();
        vscode.window.showInformationMessage(
          `Projeto '${name}' adicionado com sucesso!`
        );
      } catch (err) {
        vscode.window.showErrorMessage((err as Error).message);
      }
    }
  );
  context.subscriptions.push(addProjectFolderCommand);

  // Comando: Remover Projeto
  const removeProjectCommand = vscode.commands.registerCommand(
    "projectOrganizer.removeProject",
    async (item?: ProjectTreeItem) => {
      let projectToRemove: Project | undefined;

      if (item && item.type === "project" && item.project) {
        projectToRemove = item.project;
      } else {
        // Se chamado sem contexto, exibe um seletor rápido
        const projects = await storageManager.getProjects();
        if (projects.length === 0) {
          vscode.window.showInformationMessage("Nenhum projeto registrado.");
          return;
        }

        const picked = await vscode.window.showQuickPick(
          projects.map((p) => ({
            label: p.name,
            description: p.group || "Sem grupo",
            detail: p.path,
            project: p,
          })),
          { placeHolder: "Selecione o projeto que deseja remover" }
        );

        if (picked) {
          projectToRemove = picked.project;
        }
      }

      if (!projectToRemove) {
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        `Tem certeza que deseja remover o projeto '${projectToRemove.name}' do Project Organizer?`,
        { modal: true },
        "Sim",
        "Não"
      );

      if (confirm === "Sim") {
        await storageManager.removeProject(projectToRemove.id);
        treeProvider.refresh();
        vscode.window.showInformationMessage(
          `Projeto '${projectToRemove.name}' removido.`
        );
      }
    }
  );
  context.subscriptions.push(removeProjectCommand);

  // Comando: Renomear ou Alterar Grupo
  const renameProjectCommand = vscode.commands.registerCommand(
    "projectOrganizer.renameProject",
    async (item?: ProjectTreeItem) => {
      let project: Project | undefined;

      if (item && item.type === "project" && item.project) {
        project = item.project;
      } else {
        const projects = await storageManager.getProjects();
        if (projects.length === 0) {
          vscode.window.showInformationMessage("Nenhum projeto cadastrado.");
          return;
        }

        const picked = await vscode.window.showQuickPick(
          projects.map((p) => ({
            label: p.name,
            description: p.group || "Sem grupo",
            project: p,
          })),
          { placeHolder: "Selecione o projeto que deseja renomear/editar" }
        );

        if (picked) {
          project = picked.project;
        }
      }

      if (!project) {
        return;
      }

      const newName = await vscode.window.showInputBox({
        prompt: "Digite o novo nome do projeto",
        value: project.name,
      });

      if (newName === undefined) {
        return; // cancelado
      }

      const newGroup = await vscode.window.showInputBox({
        prompt: "Digite o novo grupo (use '/' para subníveis ou deixe em branco para nenhum)",
        value: project.group || "",
      });

      if (newGroup === undefined) {
        return; // cancelado
      }

      try {
        await storageManager.updateProject(project.id, {
          name: newName.trim() !== "" ? newName : project.name,
          group: newGroup,
        });
        treeProvider.refresh();
        vscode.window.showInformationMessage("Projeto atualizado.");
      } catch (err) {
        vscode.window.showErrorMessage((err as Error).message);
      }
    }
  );
  context.subscriptions.push(renameProjectCommand);

  // Comando: Abrir Projeto (Mesma Janela)
  const openProjectCommand = vscode.commands.registerCommand(
    "projectOrganizer.openProject",
    async (projectOrItem: any) => {
      let project: Project | undefined;

      if (projectOrItem && projectOrItem.path) {
        project = projectOrItem;
      } else if (
        projectOrItem &&
        projectOrItem.type === "project" &&
        projectOrItem.project
      ) {
        project = projectOrItem.project;
      }

      if (!project) {
        return;
      }

      // Atualiza timestamp de acesso
      await storageManager.updateProject(project.id, {
        lastAccessed: Date.now(),
      });

      const uri = vscode.Uri.file(project.path);
      await vscode.commands.executeCommand("vscode.openFolder", uri, {
        forceNewWindow: false,
      });
    }
  );
  context.subscriptions.push(openProjectCommand);

  // Comando: Abrir Projeto em Nova Janela
  const openProjectInNewWindowCommand = vscode.commands.registerCommand(
    "projectOrganizer.openProjectInNewWindow",
    async (projectOrItem: any) => {
      let project: Project | undefined;

      if (projectOrItem && projectOrItem.path) {
        project = projectOrItem;
      } else if (
        projectOrItem &&
        projectOrItem.type === "project" &&
        projectOrItem.project
      ) {
        project = projectOrItem.project;
      }

      if (!project) {
        return;
      }

      // Atualiza timestamp de acesso
      await storageManager.updateProject(project.id, {
        lastAccessed: Date.now(),
      });

      const uri = vscode.Uri.file(project.path);
      await vscode.commands.executeCommand("vscode.openFolder", uri, {
        forceNewWindow: true,
      });
    }
  );
  context.subscriptions.push(openProjectInNewWindowCommand);

  // Comando: Escanear Pastas Base configuradas
  const scanProjectsCommand = vscode.commands.registerCommand(
    "projectOrganizer.scanProjects",
    async () => {
      const config = vscode.workspace.getConfiguration("projectOrganizer");
      const scanPaths = config.get<string[]>("scanPaths", []);
      const scanDepth = config.get<number>("scanDepth", 3);
      const ignoredFolders = config.get<string[]>("ignoredFolders", []);

      if (scanPaths.length === 0) {
        vscode.window.showWarningMessage(
          "Nenhum caminho de escaneamento configurado. Adicione pastas nas configurações 'projectOrganizer.scanPaths'.",
          "Abrir Configurações"
        ).then((selection) => {
          if (selection === "Abrir Configurações") {
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
          title: "Project Organizer: Escaneando diretórios...",
          cancellable: false,
        },
        async (progress) => {
          const currentProjects = await storageManager.getProjects();
          const existingPaths = new Set(
            currentProjects.map((p) => path.resolve(p.path))
          );
          let newCount = 0;

          for (let i = 0; i < scanPaths.length; i++) {
            const scanPath = scanPaths[i];
            progress.report({
              message: `Escaneando ${path.basename(scanPath)}... (${
                i + 1
              }/${scanPaths.length})`,
            });

            const found = await ProjectScanner.scan(
              scanPath,
              scanDepth,
              ignoredFolders
            );

            for (const item of found) {
              const resolved = path.resolve(item.path);
              if (!existingPaths.has(resolved)) {
                await storageManager.addProject(item.name, item.path, item.group);
                existingPaths.add(resolved);
                newCount++;
              }
            }
          }

          treeProvider.refresh();
          vscode.window.showInformationMessage(
            `Escaneamento concluído! ${newCount} novos projetos encontrados.`
          );
        }
      );
    }
  );
  context.subscriptions.push(scanProjectsCommand);

  // Comando: Busca Rápida (Fuzzy Quick Open)
  const searchProjectCommand = vscode.commands.registerCommand(
    "projectOrganizer.searchProject",
    async () => {
      const projects = await storageManager.getProjects();
      if (projects.length === 0) {
        vscode.window.showInformationMessage("Nenhum projeto cadastrado.");
        return;
      }

      // Ordenar por último acesso (LRU)
      const sorted = [...projects].sort((a, b) => b.lastAccessed - a.lastAccessed);

      const items = sorted.map((p) => {
        let label = p.name;
        if (p.group) {
          label = `$(folder) [${p.group}] ${p.name}`;
        }
        return {
          label,
          description: p.path,
          project: p,
        };
      });

      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: "Pesquise pelo nome do projeto, grupo ou caminho...",
        matchOnDescription: true,
        matchOnDetail: true,
      });

      if (picked) {
        const option = await vscode.window.showQuickPick(
          ["Abrir nesta Janela", "Abrir em Nova Janela"],
          { placeHolder: `Como abrir o projeto '${picked.project.name}'?` }
        );

        if (option === "Abrir nesta Janela") {
          vscode.commands.executeCommand(
            "projectOrganizer.openProject",
            picked.project
          );
        } else if (option === "Abrir em Nova Janela") {
          vscode.commands.executeCommand(
            "projectOrganizer.openProjectInNewWindow",
            picked.project
          );
        }
      }
    }
  );
  context.subscriptions.push(searchProjectCommand);

  // Comando: Abrir Terminal
  const openTerminalCommand = vscode.commands.registerCommand(
    "projectOrganizer.openTerminal",
    (item: ProjectTreeItem) => {
      if (item && item.project) {
        const terminal = vscode.window.createTerminal({
          name: item.project.name,
          cwd: item.project.path,
        });
        terminal.show();
      }
    }
  );
  context.subscriptions.push(openTerminalCommand);

  // Comando: Revelar no Finder
  const revealInFinderCommand = vscode.commands.registerCommand(
    "projectOrganizer.revealInFinder",
    (item: ProjectTreeItem) => {
      if (item && item.project) {
        const projectPath = item.project.path;
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
  // Comando: Editar arquivo JSON de projetos
  const editProjectsJsonCommand = vscode.commands.registerCommand(
    "projectOrganizer.editProjectsJson",
    async () => {
      const filePath = storageManager.getProjectsFilePath();
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
        } catch {}
      }

      // Garante que o arquivo exista com o template se estiver vazio ou não existir
      if (isEmpty) {
        const template = StorageManager.getDefaultTemplate();
        await storageManager.saveProjects(template);
        // Atualiza a visualização imediatamente para mostrar o template
        treeProvider.refresh();
      }

      try {
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
      } catch (err) {
        vscode.window.showErrorMessage(
          `Não foi possível abrir o arquivo de projetos: ${(err as Error).message}`
        );
      }
    }
  );
  context.subscriptions.push(editProjectsJsonCommand);
}

export function deactivate() {}
