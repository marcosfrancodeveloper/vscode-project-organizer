import * as vscode from "vscode";
import {
  Project,
  GitStatus,
  TreeItemType,
  TreeScope,
  ProjectGroup
} from "./interfaces/models.interface";
import { IStorageManager, IGitService } from "./interfaces/services.interface";

/**
 * Item visual representando um nó na árvore lateral (pode ser a raiz, um grupo/pasta ou um projeto).
 */
export class ProjectTreeItem extends vscode.TreeItem {
  /**
   * Constrói uma representação visual para o nó na árvore.
   * @param label Texto principal exibido.
   * @param collapsibleState Estado de expansão (Collapsed, Expanded ou None).
   * @param type Tipo do nó (root, grupo, projeto).
   * @param project Objeto de projeto associado (se for do tipo project).
   * @param fullGroupPath Caminho de grupo absoluto lógico (se for do tipo group).
   * @param scope Escopo visual (Favoritos ou Todos).
   */
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly type: TreeItemType,
    public readonly project?: Project,
    public readonly fullGroupPath?: string,
    public readonly scope?: TreeScope
  ) {
    super(label, collapsibleState);

    this.contextValue = type;

    if (type === "project" && project) {
      this.id = `${scope || "all"}_project_${project.id}`;
      const hasNotes = project.notes && project.notes.trim() !== "";
      const hasTags = project.tags && project.tags.length > 0;

      if (hasNotes || hasTags) {
        const md = new vscode.MarkdownString();
        md.isTrusted = true;

        if (hasNotes) {
          md.appendMarkdown(`**${vscode.l10n.t("Project Notes ({0}):", project.name)}**\n\n${project.notes}`);
        }

        if (hasNotes && hasTags) {
          md.appendMarkdown("\n\n---\n\n");
        }

        if (hasTags) {
          const tagsStr = project.tags!.map((t) => `\`${t}\``).join(", ");
          md.appendMarkdown(`🏷️ **${vscode.l10n.t("Tags:")}** ${tagsStr}`);
        }

        this.tooltip = md;
      } else {
        this.tooltip = "";
      }

      // Comando executado ao clicar com botão esquerdo (abrir pasta no editor)
      this.command = {
        command: "projectOrganizer.openProject",
        title: "Open Project",
        arguments: [project],
      };
    } else if (type === "group" && fullGroupPath) {
      this.id = `${scope || "all"}_group_${fullGroupPath}`;
      this.tooltip = "";
    } else if (type === "root-favorites") {
      this.id = "root_favorites";
      this.tooltip = "";
    } else if (type === "root-projects") {
      this.id = "root_projects";
      this.tooltip = "";
    }
  }
}

/**
 * Provedor de dados (TreeDataProvider) que gerencia e renderiza os nós da barra lateral.
 * Depende das interfaces de serviço IStorageManager e IGitService por Injeção de Dependências.
 */
export class ProjectTreeProvider
  implements vscode.TreeDataProvider<ProjectTreeItem>, vscode.Disposable {
  private _onDidChangeTreeData: vscode.EventEmitter<
    ProjectTreeItem | undefined | null | void
  > = new vscode.EventEmitter<ProjectTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    ProjectTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private gitStatusCache: Map<string, GitStatus> = new Map();
  private gitUpdateTimer: NodeJS.Timeout | undefined;

  /**
   * Inicializa o provedor de dados da árvore.
   * @param storageManager Serviço de armazenamento persistente.
   * @param gitService Serviço de monitoramento do status Git.
   */
  constructor(
    private storageManager: IStorageManager,
    private gitService: IGitService
  ) {
    this.startGitStatusPoller();
  }

  /**
   * Força uma atualização visual completa em todos os nós da árvore lateral.
   */
  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Descarta timers e limpa recursos associados.
   */
  public dispose(): void {
    if (this.gitUpdateTimer) {
      clearInterval(this.gitUpdateTimer);
    }
  }

  /**
   * Inicia o atualizador assíncrono em segundo plano para o status Git dos projetos.
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

      // Executa de forma concorrente para todos os projetos visíveis
      await Promise.all(
        projects.map(async (project) => {
          if (this.gitService.isGitRepository(project.path)) {
            const currentStatus = await this.gitService.getStatus(project.path);
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

      // Atualiza a interface gráfica somente se houver mudanças reais detectadas
      if (changed) {
        this.refresh();
      }
    };

    // Agenda execuções inicial e periódicas
    setTimeout(updateStatus, 1000);

    const config = vscode.workspace.getConfiguration("projectOrganizer");
    const interval = config.get<number>("gitStatusInterval", 15000);

    this.gitUpdateTimer = setInterval(updateStatus, interval);
  }

  /**
   * Monta e enriquece os metadados do item de árvore para exibição gráfica.
   * @param element O item de árvore correspondente.
   */
  public getTreeItem(element: ProjectTreeItem): vscode.TreeItem {
    if (element.type === "root-favorites") {
      element.contextValue = "root";
      // INFO: element.iconPath = new vscode.ThemeIcon("star");
      element.iconPath = undefined;
    } else if (element.type === "root-projects") {
      element.contextValue = "root";
      // Sem ícone no item de raiz de projetos
      element.iconPath = undefined;
    } else if (element.type === "project" && element.project) {
      const project = element.project;
      element.contextValue = project.favorite ? "project-favorite" : "project";
      const cachedGit = this.gitStatusCache.get(project.id);

      const isGit = this.gitService.isGitRepository(project.path);
      element.iconPath = isGit
        ? new vscode.ThemeIcon("repo")
        : new vscode.ThemeIcon("root-folder");

      let gitDesc = "";
      if (isGit && cachedGit) {
        gitDesc = `(${cachedGit.branch})`;
        let statusIndicators = "";
        if (cachedGit.isDirty) {
          statusIndicators += "*";
        }
        if (cachedGit.unpushed && cachedGit.unpushed > 0) {
          statusIndicators += `↑${cachedGit.unpushed}`;
        }
        if (statusIndicators) {
          gitDesc += ` ${statusIndicators}`;
        }
      }

      if (element.scope === "favorites") {
        // Favoritos exibe o caminho do grupo como contexto
        const parts: string[] = [];
        if (project.group) {
          parts.push(project.group);
        }
        if (gitDesc) {
          parts.push(gitDesc);
        }
        element.description = parts.length > 0 ? parts.join(" • ") : undefined;
      } else {
        // Exibição normal exibe indicador de estrela se favoritado
        if (gitDesc) {
          element.description = project.favorite ? `★ ${gitDesc}` : gitDesc;
        } else {
          element.description = project.favorite ? "★" : undefined;
        }
      }
    } else if (element.type === "group") {
      element.contextValue = "group";
      element.iconPath = new vscode.ThemeIcon("folder");
    }

    return element;
  }

  /**
   * Resolve e retorna os filhos de um determinado nó da árvore.
   * @param element Nó pai (se omitido, carrega as raízes).
   */
  public async getChildren(element?: ProjectTreeItem): Promise<ProjectTreeItem[]> {
    const projects = await this.storageManager.getProjects();

    if (!element) {
      const favoritesCount = projects.filter((p) => p.favorite).length;
      return [
        new ProjectTreeItem(
          vscode.l10n.t("Favorites ({0})", favoritesCount),
          vscode.TreeItemCollapsibleState.Expanded,
          "root-favorites",
          undefined,
          undefined,
          "favorites"
        ),
        new ProjectTreeItem(
          vscode.l10n.t("All Projects ({0})", projects.length),
          vscode.TreeItemCollapsibleState.Expanded,
          "root-projects",
          undefined,
          undefined,
          "all"
        ),
      ];
    }

    const scope = element.scope || "all";

    // Lógica diferenciada para favoritos: exibe uma lista plana direta de projetos
    if (element.type === "root-favorites") {
      const favorites = projects.filter((p) => p.favorite);
      const sortedFavorites = [...favorites].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );
      return sortedFavorites.map(
        (project) =>
          new ProjectTreeItem(
            project.name,
            vscode.TreeItemCollapsibleState.None,
            "project",
            project,
            undefined,
            "favorites"
          )
      );
    }

    // Lógica padrão de Todos os Projetos: agrupa em pastas hierárquicas
    const filteredProjects = scope === "favorites"
      ? projects.filter((p) => p.favorite)
      : projects;

    const rootNode = this.buildLogicalTree(filteredProjects);

    if (element.type === "root-projects") {
      return this.getNodeChildren(rootNode, scope);
    }

    if (element.type === "group" && element.fullGroupPath) {
      const targetNode = this.findLogicalNode(rootNode, element.fullGroupPath);
      if (targetNode) {
        return this.getNodeChildren(targetNode, scope);
      }
    }

    return [];
  }

  /**
   * Constrói a estrutura de árvore lógica e recursiva baseada no delimitador "/" do grupo de cada projeto.
   * @param projects Array de projetos para agrupar.
   */
  private buildLogicalTree(projects: Project[]): ProjectGroup {
    const root: ProjectGroup = {
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
   * Encontra de forma recursiva um determinado nó da árvore através de seu caminho lógico.
   * @param node Nó inicial da busca.
   * @param targetPath Caminho lógico buscado (ex: "Trabalho/Frontend").
   */
  private findLogicalNode(node: ProjectGroup, targetPath: string): ProjectGroup | undefined {
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
   * Retorna os subgrupos e projetos filhos convertidos para itens de exibição.
   * @param node Nó lógico pai.
   * @param scope Escopo de visualização da árvore.
   */
  private getNodeChildren(node: ProjectGroup, scope: TreeScope): ProjectTreeItem[] {
    const items: ProjectTreeItem[] = [];

    const config = vscode.workspace.getConfiguration("projectOrganizer");
    const expanded = config.get<boolean>("treeExpanded", false);
    const collapsibleState = expanded
      ? vscode.TreeItemCollapsibleState.Expanded
      : vscode.TreeItemCollapsibleState.Collapsed;

    // 1. Adiciona subpastas (subgrupos) ordenadas alfabeticamente
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
          sub.fullPath,
          scope
        )
      );
    }

    // 2. Adiciona projetos filhos ordenados alfabeticamente
    const sortedProjects = [...node.projects].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );

    for (const project of sortedProjects) {
      items.push(
        new ProjectTreeItem(
          project.name,
          vscode.TreeItemCollapsibleState.None,
          "project",
          project,
          undefined,
          scope
        )
      );
    }

    return items;
  }

  /**
   * Retorna o item pai lógico para permitir a navegação e reveal corretos na TreeView do VS Code.
   * @param element Item de árvore cujo pai deseja-se resolver.
   */
  public getParent(element: ProjectTreeItem): ProjectTreeItem | undefined {
    const scope = element.scope || "all";
    if (element.type === "project" && element.project) {
      const project = element.project;
      if (scope === "favorites") {
        return new ProjectTreeItem(
          vscode.l10n.t("Favorites"),
          vscode.TreeItemCollapsibleState.Expanded,
          "root-favorites",
          undefined,
          undefined,
          "favorites"
        );
      }
      if (!project.group) {
        return new ProjectTreeItem(
          vscode.l10n.t("All Projects"),
          vscode.TreeItemCollapsibleState.Expanded,
          "root-projects",
          undefined,
          undefined,
          scope
        );
      }
      const parts = project.group.split("/");
      const parentName = parts[parts.length - 1];
      return new ProjectTreeItem(
        parentName,
        vscode.TreeItemCollapsibleState.Expanded,
        "group",
        undefined,
        project.group,
        scope
      );
    }

    if (element.type === "group" && element.fullGroupPath) {
      const parts = element.fullGroupPath.split("/");
      if (parts.length <= 1) {
        return new ProjectTreeItem(
          vscode.l10n.t("All Projects"),
          vscode.TreeItemCollapsibleState.Expanded,
          "root-projects",
          undefined,
          undefined,
          scope
        );
      }
      const parentPath = parts.slice(0, -1).join("/");
      const parentName = parts[parts.length - 2];
      return new ProjectTreeItem(
        parentName,
        vscode.TreeItemCollapsibleState.Expanded,
        "group",
        undefined,
        parentPath,
        scope
      );
    }

    return undefined;
  }
}
