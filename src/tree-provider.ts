import * as vscode from "vscode";
import {
  Project,
  GitStatus,
  TreeItemType,
  TreeScope,
  ProjectGroup,
  ProjectRegistryNode
} from "./interfaces/models.interface";
import { IStorageManager, IGitService } from "./interfaces/services.interface";

/**
 * Item visual representando um nó na árvore lateral
 */
export class ProjectTreeItem extends vscode.TreeItem {
  /**
   * Constrói uma representação visual para o nó na árvore
   * @param label Texto principal exibido
   * @param collapsibleState Estado de expansão (Collapsed, Expanded ou None)
   * @param type Tipo do nó (root, grupo, projeto)
   * @param project Objeto de projeto associado (se for do tipo project)
   * @param groupNode Nó de grupo associado (se for do tipo group)
   * @param fullGroupPath Caminho de grupo absoluto lógico (se for do tipo group)
   * @param scope Escopo visual
   */
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly type: TreeItemType,
    public readonly project?: Project,
    public readonly groupNode?: ProjectGroup,
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
 * Provedor de dados (`TreeDataProvider`) que gerencia e renderiza os nós da barra lateral.
 * Depende das interfaces de serviço `IStorageManager` e `IGitService` por Injeção de Dependências.
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
  private gitInitialTimeout: NodeJS.Timeout | undefined;
  private gitUpdateTimer: NodeJS.Timeout | undefined;

  constructor(
    private storageManager: IStorageManager,
    private gitService: IGitService,
    private defaultScope: TreeScope = "all"
  ) {
    this.startGitStatusPoller();
  }

  /**
   * Força uma atualização visual completa em todos os nós da árvore lateral
   */
  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Descarta timers e limpa recursos associados
   */
  public dispose(): void {
    if (this.gitInitialTimeout) {
      clearTimeout(this.gitInitialTimeout);
    }
    if (this.gitUpdateTimer) {
      clearInterval(this.gitUpdateTimer);
    }
  }

  /**
   * Inicia o atualizador assíncrono em segundo plano para o status Git dos projetos
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
    this.gitInitialTimeout = setTimeout(updateStatus, 1000);

    const config = vscode.workspace.getConfiguration("projectOrganizer");
    const interval = config.get<number>("gitStatusInterval", 15000);

    this.gitUpdateTimer = setInterval(updateStatus, interval);
  }

  /**
   * Monta e enriquece os metadados do item de árvore para exibição gráfica
   * @param element O item de árvore correspondente
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

      // Constrói contextValue combinando favorite e deprecated
      let contextVal = "project";
      if (project.favorite) {
        contextVal += "-favorite";
      }
      if (project.deprecated) {
        contextVal += "-deprecated";
      }
      element.contextValue = contextVal;

      const cachedGit = this.gitStatusCache.get(project.id);

      const isGit = this.gitService.isGitRepository(project.path);
      element.iconPath = project.deprecated
        ? new vscode.ThemeIcon("archive")
        : isGit
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
        if (element.fullGroupPath) {
          parts.push(element.fullGroupPath);
        }
        if (gitDesc) {
          parts.push(gitDesc);
        }
        if (project.deprecated) {
          parts.push(vscode.l10n.t("(deprecated)"));
        }
        if (project.position !== undefined) {
          parts.push(`[${project.position}]`);
        }
        element.description = parts.length > 0 ? parts.join(" • ") : undefined;
      } else {
        // Exibição normal exibe indicador de estrela se favoritado
        let suffix = gitDesc;
        if (project.deprecated) {
          const depText = vscode.l10n.t("(deprecated)");
          suffix = suffix ? `${suffix} • ${depText}` : depText;
        }
        if (project.position !== undefined) {
          const posText = `[${project.position}]`;
          suffix = suffix ? `${suffix} • ${posText}` : posText;
        }
        if (suffix) {
          element.description = project.favorite ? `★ ${suffix}` : suffix;
        } else {
          element.description = project.favorite ? "★" : undefined;
        }
      }
    } else if (element.type === "group") {
      element.contextValue = "group";
      element.iconPath = new vscode.ThemeIcon("folder");
      if (element.groupNode && element.groupNode.position !== undefined) {
        element.description = `[${element.groupNode.position}]`;
      } else {
        element.description = undefined;
      }
    }

    return element;
  }

  /**
   * Filtra recursivamente projetos depreciados da árvore de nós
   */
  private filterDeprecatedNodes(nodes: ProjectRegistryNode[]): ProjectRegistryNode[] {
    const result: ProjectRegistryNode[] = [];
    for (const node of nodes) {
      if ("isFolder" in node && node.isFolder) {
        const filteredChildren = this.filterDeprecatedNodes(node.children);
        result.push({
          ...node,
          children: filteredChildren
        });
      } else {
        const project = node as Project;
        if (!project.deprecated) {
          result.push(node);
        }
      }
    }
    return result;
  }

  /**
   * Resolve e retorna os filhos de um determinado nó da árvore
   * @param element Nó pai (se omitido, carrega as raízes)
   */
  public async getChildren(element?: ProjectTreeItem): Promise<ProjectTreeItem[]> {
    const config = vscode.workspace.getConfiguration("projectOrganizer");
    const showDeprecated = config.get<boolean>("showDeprecated", true);

    let tree = await this.storageManager.getProjectsTree();
    if (!showDeprecated) {
      tree = this.filterDeprecatedNodes(tree);
    }

    const flatProjects = await this.storageManager.getProjects();
    const activeFlatProjects = showDeprecated
      ? flatProjects
      : flatProjects.filter((p) => !p.deprecated);

    if (!element) {
      if (activeFlatProjects.length === 0 && tree.length === 0) {
        return [];
      }

      if (this.defaultScope === "favorites") {
        const favorites = activeFlatProjects.filter((p) => p.favorite);
        const sortedFavorites = this.sortProjects(favorites);
        return Promise.all(
          sortedFavorites.map(async (project) => {
            const groupPath = await this.storageManager.getProjectGroupPath(project.id);
            return new ProjectTreeItem(
              project.deprecated ? strikethrough(project.name) : project.name,
              vscode.TreeItemCollapsibleState.None,
              "project",
              project,
              undefined,
              groupPath,
              "favorites"
            );
          })
        );
      } else {
        const expanded = config.get<boolean>("treeExpanded", false);
        const collapsibleState = expanded
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed;

        const sortedNodes = this.sortRegistryNodes(tree);
        return sortedNodes.map((node) => {
          if ("isFolder" in node && node.isFolder) {
            return new ProjectTreeItem(
              node.name,
              collapsibleState,
              "group",
              undefined,
              node,
              node.name,
              "all"
            );
          } else {
            const project = node as Project;
            return new ProjectTreeItem(
              project.deprecated ? strikethrough(project.name) : project.name,
              vscode.TreeItemCollapsibleState.None,
              "project",
              project,
              undefined,
              undefined,
              "all"
            );
          }
        });
      }
    }

    const scope = element.scope || "all";

    // Lógica para favoritos
    if (element.type === "root-favorites") {
      const favorites = activeFlatProjects.filter((p) => p.favorite);
      const sortedFavorites = this.sortProjects(favorites);
      return Promise.all(
        sortedFavorites.map(
          async (project) => {
            const groupPath = await this.storageManager.getProjectGroupPath(project.id);
            return new ProjectTreeItem(
              project.deprecated ? strikethrough(project.name) : project.name,
              vscode.TreeItemCollapsibleState.None,
              "project",
              project,
              undefined,
              groupPath,
              "favorites"
            );
          }
        )
      );
    }

    const expanded = config.get<boolean>("treeExpanded", false);
    const collapsibleState = expanded
      ? vscode.TreeItemCollapsibleState.Expanded
      : vscode.TreeItemCollapsibleState.Collapsed;

    // Lógica para a raiz de projetos
    if (element.type === "root-projects") {
      const sortedNodes = this.sortRegistryNodes(tree);
      return sortedNodes.map((node) => {
        if ("isFolder" in node && node.isFolder) {
          return new ProjectTreeItem(
            node.name,
            collapsibleState,
            "group",
            undefined,
            node,
            node.name,
            scope
          );
        } else {
          const project = node as Project;
          return new ProjectTreeItem(
            project.deprecated ? strikethrough(project.name) : project.name,
            vscode.TreeItemCollapsibleState.None,
            "project",
            project,
            undefined,
            undefined,
            scope
          );
        }
      });
    }

    // Lógica para subgrupos
    if (element.type === "group" && element.groupNode) {
      const sortedNodes = this.sortRegistryNodes(element.groupNode.children);
      return Promise.all(
        sortedNodes.map(async (node) => {
          if ("isFolder" in node && node.isFolder) {
            const subGroupPath = element.fullGroupPath
              ? `${element.fullGroupPath}/${node.name}`
              : node.name;
            return new ProjectTreeItem(
              node.name,
              collapsibleState,
              "group",
              undefined,
              node,
              subGroupPath,
              scope
            );
          } else {
            const project = node as Project;
            return new ProjectTreeItem(
              project.deprecated ? strikethrough(project.name) : project.name,
              vscode.TreeItemCollapsibleState.None,
              "project",
              project,
              undefined,
              undefined,
              scope
            );
          }
        })
      );
    }

    return [];
  }

  /**
   * Ordena uma lista contendo tanto subgrupos quanto projetos de acordo com as preferências
   */
  private sortRegistryNodes(nodes: ProjectRegistryNode[]): ProjectRegistryNode[] {
    const config = vscode.workspace.getConfiguration("projectOrganizer");
    const sortBy = config.get<string>("sortBy", "name");
    const sortOrder = config.get<string>("sortOrder", "asc");

    const folders = nodes.filter((n) => "isFolder" in n && n.isFolder) as ProjectGroup[];
    const projects = nodes.filter((n) => !("isFolder" in n && n.isFolder)) as Project[];

    // 1. Ordena os subgrupos
    folders.sort((a, b) => {
      const posA = a.position;
      const posB = b.position;

      if (posA !== undefined && posB !== undefined) {
        return posA - posB;
      }
      if (posA !== undefined) {
        return -1;
      }
      if (posB !== undefined) {
        return 1;
      }

      const diff = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      return sortOrder === "desc" ? -diff : diff;
    });

    // 2. Ordena os projetos irmãos seguindo as regras de pinning e preferências
    const sortedProjects = [...projects].sort((a, b) => {
      const posA = a.position;
      const posB = b.position;

      if (posA !== undefined && posB !== undefined) {
        return posA - posB;
      }
      if (posA !== undefined) {
        return -1;
      }
      if (posB !== undefined) {
        return 1;
      }

      if (sortBy === "lastAccessed") {
        const diff = a.lastAccessed - b.lastAccessed;
        return sortOrder === "desc" ? -diff : diff;
      }
      const diff = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      return sortOrder === "desc" ? -diff : diff;
    });

    return [...folders, ...sortedProjects];
  }

  /**
   * Ordena uma lista de projetos planos (para exibição em favoritos)
   */
  private sortProjects(projects: Project[]): Project[] {
    const config = vscode.workspace.getConfiguration("projectOrganizer");
    const sortBy = config.get<string>("sortBy", "name");
    const sortOrder = config.get<string>("sortOrder", "asc");

    return [...projects].sort((a, b) => {
      const posA = a.position;
      const posB = b.position;

      if (posA !== undefined && posB !== undefined) {
        return posA - posB;
      }
      if (posA !== undefined) {
        return -1;
      }
      if (posB !== undefined) {
        return 1;
      }

      if (sortBy === "lastAccessed") {
        const diff = a.lastAccessed - b.lastAccessed;
        return sortOrder === "desc" ? -diff : diff;
      }
      const diff = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      return sortOrder === "desc" ? -diff : diff;
    });
  }

  /**
   * Helper assíncrono para encontrar o nó pai de um projeto ou subgrupo
   */
  private async findParentOfNode(
    idOrName: string,
    isSearchingFolder: boolean = false
  ): Promise<ProjectGroup | undefined> {
    const tree = await this.storageManager.getProjectsTree();
    let parentGroup: ProjectGroup | undefined;

    const search = (nodes: ProjectRegistryNode[], parent?: ProjectGroup): boolean => {
      for (const node of nodes) {
        if (isSearchingFolder) {
          if ("isFolder" in node && node.isFolder) {
            if (node.name === idOrName) {
              parentGroup = parent;
              return true;
            }
            if (search(node.children, node)) {
              return true;
            }
          }
        } else {
          if (!("isFolder" in node && node.isFolder)) {
            const project = node as Project;
            if (project.id === idOrName) {
              parentGroup = parent;
              return true;
            }
          } else {
            if (search(node.children, node)) {
              return true;
            }
          }
        }
      }
      return false;
    };

    search(tree);
    return parentGroup;
  }

  /**
   * Helper assíncrono para construir o caminho absoluto lógico de um grupo
   */
  private async getGroupNodePath(groupNode: ProjectGroup): Promise<string> {
    const parts: string[] = [groupNode.name];
    let parent = await this.findParentOfNode(groupNode.name, true);
    while (parent) {
      parts.unshift(parent.name);
      parent = await this.findParentOfNode(parent.name, true);
    }
    return parts.join("/");
  }

  /**
   * Retorna o item pai lógico para permitir a navegação e reveal corretos na TreeView do VS Code
   */
  public async getParent(element: ProjectTreeItem): Promise<ProjectTreeItem | undefined> {
    const scope = element.scope || "all";
    if (element.type === "project" && element.project) {
      if (scope === "favorites") {
        return undefined;
      }

      const parentNode = await this.findParentOfNode(element.project.id, false);
      if (!parentNode) {
        return undefined;
      }

      const parentPath = await this.getGroupNodePath(parentNode);
      return new ProjectTreeItem(
        parentNode.name,
        vscode.TreeItemCollapsibleState.Expanded,
        "group",
        undefined,
        parentNode,
        parentPath,
        scope
      );
    }

    if (element.type === "group" && element.groupNode) {
      const parentNode = await this.findParentOfNode(element.groupNode.name, true);
      if (!parentNode) {
        return undefined;
      }

      const parentPath = await this.getGroupNodePath(parentNode);
      return new ProjectTreeItem(
        parentNode.name,
        vscode.TreeItemCollapsibleState.Expanded,
        "group",
        undefined,
        parentNode,
        parentPath,
        scope
      );
    }

    return undefined;
  }
}

/**
 * Função auxiliar para aplicar riscado (strikethrough) em texto utilizando caracteres Unicode
 */
function strikethrough(text: string): string {
  return text.split("").map((c) => c + "\u0336").join("");
}
