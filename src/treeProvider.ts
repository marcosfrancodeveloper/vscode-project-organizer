import * as vscode from "vscode";
import * as path from "path";
import { Project, GitStatus } from "./types";
import { StorageManager } from "./storage";
import { GitService } from "./gitService";

export class ProjectTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly type: "group" | "project",
    public readonly project?: Project,
    public readonly fullGroupPath?: string
  ) {
    super(label, collapsibleState);

    this.contextValue = type;

    if (type === "project" && project) {
      this.id = project.id;
      const hasNotes = project.notes && project.notes.trim() !== "";
      const hasTags = project.tags && project.tags.length > 0;

      if (hasNotes || hasTags) {
        const md = new vscode.MarkdownString();
        md.isTrusted = true;

        if (hasNotes) {
          md.appendMarkdown(`**Notas do Projeto (${project.name}):**\n\n${project.notes}`);
        }

        if (hasNotes && hasTags) {
          md.appendMarkdown("\n\n---\n\n");
        }

        if (hasTags) {
          const tagsStr = project.tags!.map((t) => `\`${t}\``).join(", ");
          md.appendMarkdown(`🏷️ **Tags:** ${tagsStr}`);
        }

        this.tooltip = md;
      } else {
        this.tooltip = "";
      }

      // Configura comando padrão ao clicar (abre na mesma janela)
      this.command = {
        command: "projectOrganizer.openProject",
        title: "Open Project",
        arguments: [project],
      };
    } else if (type === "group" && fullGroupPath) {
      this.id = `group_${fullGroupPath}`;
      this.tooltip = "";
    }
  }
}

interface TreeNode {
  name: string;
  fullPath: string;
  subgroups: Map<string, TreeNode>;
  projects: Project[];
}

export class ProjectTreeProvider
  implements vscode.TreeDataProvider<ProjectTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    ProjectTreeItem | undefined | null | void
  > = new vscode.EventEmitter<ProjectTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    ProjectTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private gitStatusCache: Map<string, GitStatus> = new Map();
  private gitUpdateTimer: NodeJS.Timeout | undefined;

  constructor(private storageManager: StorageManager) {
    this.startGitStatusPoller();
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public dispose(): void {
    if (this.gitUpdateTimer) {
      clearInterval(this.gitUpdateTimer);
    }
  }

  /**
   * Inicia o atualizador periódico do status Git dos projetos.
   */
  private startGitStatusPoller(): void {
    const updateStatus = async () => {
      const config = vscode.workspace.getConfiguration("projectOrganizer");
      const enabled = config.get<boolean>("gitStatusEnabled", true);
      if (!enabled) {
        return;
      }

      const projects = await this.storageManager.getProjects();
      let changed = false;

      // Executa de forma concorrente para todos os projetos
      await Promise.all(
        projects.map(async (project) => {
          if (GitService.isGitRepository(project.path)) {
            const currentStatus = await GitService.getStatus(project.path);
            const cachedStatus = this.gitStatusCache.get(project.id);

            if (
              !cachedStatus ||
              cachedStatus.branch !== currentStatus?.branch ||
              cachedStatus.isDirty !== currentStatus?.isDirty ||
              cachedStatus.unpushed !== currentStatus?.unpushed
            ) {
              if (currentStatus) {
                this.gitStatusCache.set(project.id, currentStatus);
                changed = true;
              }
            }
          }
        })
      );

      // Só atualiza a interface gráfica se houver mudança de fato no Git status
      if (changed) {
        this.refresh();
      }
    };

    // Primeira execução logo após iniciar
    setTimeout(updateStatus, 1000);

    const config = vscode.workspace.getConfiguration("projectOrganizer");
    const interval = config.get<number>("gitStatusInterval", 15000);

    this.gitUpdateTimer = setInterval(updateStatus, interval);
  }

  getTreeItem(element: ProjectTreeItem): vscode.TreeItem {
    if (element.type === "project" && element.project) {
      element.contextValue = "project";
      const project = element.project;
      const cachedGit = this.gitStatusCache.get(project.id);

      // Define ícone e descrição do projeto
      const isGit = GitService.isGitRepository(project.path);
      element.iconPath = isGit
        ? new vscode.ThemeIcon("repo")
        : new vscode.ThemeIcon("root-folder");

      if (isGit && cachedGit) {
        let desc = `${cachedGit.branch}`;
        if (cachedGit.isDirty) {
          desc += " • *";
        }
        if (cachedGit.unpushed && cachedGit.unpushed > 0) {
          desc += ` ↑${cachedGit.unpushed}`;
        }
        element.description = desc;
      } else {
        element.description = undefined;
      }
    } else if (element.type === "group") {
      element.contextValue = "group";
      element.iconPath = new vscode.ThemeIcon("folder");
    }

    return element;
  }

  async getChildren(element?: ProjectTreeItem): Promise<ProjectTreeItem[]> {
    const projects = await this.storageManager.getProjects();

    // Constrói árvore lógica na primeira chamada do root
    const rootNode = this.buildLogicalTree(projects);

    if (!element) {
      // Retorna itens do nível raiz
      return this.getNodeChildren(rootNode);
    }

    if (element.type === "group" && element.fullGroupPath) {
      const targetNode = this.findLogicalNode(rootNode, element.fullGroupPath);
      if (targetNode) {
        return this.getNodeChildren(targetNode);
      }
    }

    return [];
  }

  /**
   * Constrói a estrutura lógica hierárquica baseada nos caminhos de grupo.
   */
  private buildLogicalTree(projects: Project[]): TreeNode {
    const root: TreeNode = {
      name: "root",
      fullPath: "",
      subgroups: new Map(),
      projects: [],
    };

    for (const project of projects) {
      if (!project.group) {
        root.projects.push(project);
        continue;
      }

      const parts = project.group.split("/");
      let currentNode = root;
      let currentPath = "";

      for (const part of parts) {
        const trimmedPart = part.trim();
        if (trimmedPart === "") {
          continue;
        }

        currentPath = currentPath
          ? `${currentPath}/${trimmedPart}`
          : trimmedPart;

        if (!currentNode.subgroups.has(trimmedPart)) {
          currentNode.subgroups.set(trimmedPart, {
            name: trimmedPart,
            fullPath: currentPath,
            subgroups: new Map(),
            projects: [],
          });
        }
        currentNode = currentNode.subgroups.get(trimmedPart)!;
      }

      currentNode.projects.push(project);
    }

    return root;
  }

  /**
   * Encontra um nó lógico da árvore com base em seu caminho de grupo completo.
   */
  private findLogicalNode(node: TreeNode, targetPath: string): TreeNode | undefined {
    if (node.fullPath === targetPath) {
      return node;
    }

    for (const subgroup of node.subgroups.values()) {
      const found = this.findLogicalNode(subgroup, targetPath);
      if (found) {
        return found;
      }
    }

    return undefined;
  }

  /**
   * Retorna os itens de árvore filhos para um determinado nó lógico.
   */
  private getNodeChildren(node: TreeNode): ProjectTreeItem[] {
    const items: ProjectTreeItem[] = [];

    // Obter configuração de expansão da árvore
    const config = vscode.workspace.getConfiguration("projectOrganizer");
    const expanded = config.get<boolean>("treeExpanded", false);
    const collapsibleState = expanded
      ? vscode.TreeItemCollapsibleState.Expanded
      : vscode.TreeItemCollapsibleState.Collapsed;

    // 1. Adicionar subgrupos (pastas) ordenados alfabeticamente
    const sortedSubgroupKeys = Array.from(node.subgroups.keys()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );

    for (const key of sortedSubgroupKeys) {
      const sub = node.subgroups.get(key)!;
      items.push(
        new ProjectTreeItem(
          sub.name,
          collapsibleState,
          "group",
          undefined,
          sub.fullPath
        )
      );
    }

    // 2. Adicionar projetos ordenados alfabeticamente pelo nome
    const sortedProjects = [...node.projects].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );

    for (const project of sortedProjects) {
      items.push(
        new ProjectTreeItem(
          project.name,
          vscode.TreeItemCollapsibleState.None,
          "project",
          project
        )
      );
    }

    return items;
  }

  getParent(element: ProjectTreeItem): ProjectTreeItem | undefined {
    if (element.type === "project" && element.project) {
      const project = element.project;
      if (!project.group) {
        return undefined;
      }
      const parts = project.group.split("/");
      const parentName = parts[parts.length - 1];
      return new ProjectTreeItem(
        parentName,
        vscode.TreeItemCollapsibleState.Expanded,
        "group",
        undefined,
        project.group
      );
    }

    if (element.type === "group" && element.fullGroupPath) {
      const parts = element.fullGroupPath.split("/");
      if (parts.length <= 1) {
        return undefined;
      }
      const parentPath = parts.slice(0, -1).join("/");
      const parentName = parts[parts.length - 2];
      return new ProjectTreeItem(
        parentName,
        vscode.TreeItemCollapsibleState.Expanded,
        "group",
        undefined,
        parentPath
      );
    }

    return undefined;
  }
}
