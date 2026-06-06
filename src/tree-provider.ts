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
import { strikethrough } from "./utils/strikethrough.util";

/**
 * Item visual representando um nó na árvore lateral
 * @extends vscode.TreeItem
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

  private gitStatusCache: Map<string, { isGit: boolean; status: GitStatus | null }> = new Map();
  private gitInitialTimeout: NodeJS.Timeout | undefined;
  private gitUpdateTimer: NodeJS.Timeout | undefined;
  private gitPollInProgress = false;

  constructor(
    private storageManager: IStorageManager,
    private gitService: IGitService,
    private defaultScope: TreeScope = "all"
  ) {
    this.startGitStatusPoller();
  }

  /**
   * Força uma atualização visual completa em todos os nós da árvore lateral
   * e agenda uma verificação imediata de status do Git
   */
  public refresh(): void {
    this._onDidChangeTreeData.fire();
    // Agenda verificação imediata de status do Git (debounce de 100ms) para refletir as alterações rápidas do projects.json
    if (this.gitInitialTimeout) {
      clearTimeout(this.gitInitialTimeout);
    }
    this.gitInitialTimeout = setTimeout(() => this.runGitPoll(), 100);
  }

  /**
   * Descarta timers e limpa recursos associados
   */
  public dispose(): void {
    if (this.gitInitialTimeout) {
      clearTimeout(this.gitInitialTimeout);
    }
    if (this.gitUpdateTimer) {
      clearTimeout(this.gitUpdateTimer);
    }
  }

  /**
   * Inicializa o agendamento do atualizador em segundo plano
   * (não-bloqueante) para o status Git dos projetos
   */
  private startGitStatusPoller(): void {
    this.gitInitialTimeout = setTimeout(() => this.runGitPoll(), 1000);
  }

  /**
   * Executa a rotina de varredura de status do Git para todos os projetos cadastrados
   */
  private async runGitPoll(): Promise<void> {
    if (this.gitPollInProgress) {
      return;
    }
    this.gitPollInProgress = true;

    try {
      const config = vscode.workspace.getConfiguration("projectOrganizer");
      const enabled = config.get<boolean>("gitStatusEnabled", true);
      if (!enabled) {
        return;
      }

      const projects = await this.storageManager.getProjects();
      let changed = false;

      // Processa os projetos sequencialmente para manter pegada de CPU/Processo mínima
      for (const project of projects) {
        try {
          const isGit = this.gitService.isGitRepository(project.path);
          const cached = this.gitStatusCache.get(project.id);

          if (isGit) {
            const currentStatus = await this.gitService.getStatus(project.path);

            if (
              !cached ||
              !cached.isGit ||
              !cached.status ||
              !currentStatus ||
              cached.status.branch !== currentStatus.branch ||
              cached.status.isDirty !== currentStatus.isDirty ||
              cached.status.unpushed !== currentStatus.unpushed
            ) {
              this.gitStatusCache.set(project.id, { isGit: true, status: currentStatus });
              changed = true;
            }
          } else {
            // Se não for repositório Git, mas estava cacheado como Git ou não estava no cache
            if (!cached || cached.isGit) {
              this.gitStatusCache.set(project.id, { isGit: false, status: null });
              changed = true;
            }
          }
        } catch {
          // Ignora erros individuais de projeto
        }
      }

      // Limpa chaves do cache para projetos que foram removidos da base
      const projectIds = new Set(projects.map((p) => p.id));
      for (const cachedId of this.gitStatusCache.keys()) {
        if (!projectIds.has(cachedId)) {
          this.gitStatusCache.delete(cachedId);
          changed = true;
        }
      }

      if (changed) {
        this._onDidChangeTreeData.fire();
      }
    } catch {
      // Ignora erros globais da execução da rotina
    } finally {
      this.gitPollInProgress = false;

      if (this.gitUpdateTimer) {
        clearTimeout(this.gitUpdateTimer);
      }
      // Agenda o próximo ciclo periódico
      const config = vscode.workspace.getConfiguration("projectOrganizer");
      const interval = config.get<number>("gitStatusInterval", 15000);
      this.gitUpdateTimer = setTimeout(() => this.runGitPoll(), interval);
    }
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
      const isGit = cachedGit ? cachedGit.isGit : false;

      element.iconPath = project.deprecated
        ? new vscode.ThemeIcon("archive")
        : isGit
          ? new vscode.ThemeIcon("repo")
          : new vscode.ThemeIcon("root-folder");

      let gitDesc = "";
      if (isGit && cachedGit && cachedGit.status) {
        const status = cachedGit.status;
        gitDesc = `(${status.branch})`;
        let statusIndicators = "";
        if (status.isDirty) {
          statusIndicators += "*";
        }
        if (status.unpushed && status.unpushed > 0) {
          statusIndicators += `↑${status.unpushed}`;
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
    const sortMultiplier = sortOrder === "desc" ? -1 : 1;

    const folders: ProjectGroup[] = [];
    const projects: Project[] = [];
    for (const node of nodes) {
      if ("isFolder" in node && node.isFolder) {
        folders.push(node);
      } else {
        projects.push(node as Project);
      }
    }

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

      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) * sortMultiplier;
    });

    // 2. Ordena os projetos irmãos seguindo as regras de pinning e preferências
    projects.sort((a, b) => {
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
        return (a.lastAccessed - b.lastAccessed) * sortMultiplier;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) * sortMultiplier;
    });

    return [...folders, ...projects];
  }

  /**
   * Ordena uma lista de projetos planos (para exibição em favoritos)
   */
  private sortProjects(projects: Project[]): Project[] {
    const config = vscode.workspace.getConfiguration("projectOrganizer");
    const sortBy = config.get<string>("sortBy", "name");
    const sortOrder = config.get<string>("sortOrder", "asc");
    const sortMultiplier = sortOrder === "desc" ? -1 : 1;

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
        return (a.lastAccessed - b.lastAccessed) * sortMultiplier;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) * sortMultiplier;
    });
  }

  /**
   * Constrói em uma única varredura linear O(N) um mapa de hierarquia e caminhos lógicos de todos os nós.
   * Evita consultas redundantes ao banco e leituras do disco no getParent.
   */
  private buildHierarchyMap(
    nodes: ProjectRegistryNode[]
  ): Map<string, { parent: ProjectGroup | undefined; path: string }> {
    const map = new Map<string, { parent: ProjectGroup | undefined; path: string }>();

    const traverse = (
      nodesList: ProjectRegistryNode[],
      currentParent?: ProjectGroup,
      currentPath: string = ""
    ) => {
      for (const node of nodesList) {
        if ("isFolder" in node && node.isFolder) {
          const groupPath = currentPath ? `${currentPath}/${node.name}` : node.name;
          map.set(node.name, { parent: currentParent, path: groupPath });
          traverse(node.children, node, groupPath);
        } else {
          const project = node as Project;
          map.set(project.id, { parent: currentParent, path: currentPath });
        }
      }
    };

    traverse(nodes);
    return map;
  }

  /**
   * Retorna o item pai lógico para permitir a navegação e reveal corretos na TreeView do VS Code
   */
  public async getParent(element: ProjectTreeItem): Promise<ProjectTreeItem | undefined> {
    const scope = element.scope || "all";
    if (element.type === "root-projects" || element.type === "root-favorites") {
      return undefined;
    }

    const tree = await this.storageManager.getProjectsTree();
    const hierarchy = this.buildHierarchyMap(tree);

    if (element.type === "project" && element.project) {
      if (scope === "favorites") {
        return undefined;
      }

      const meta = hierarchy.get(element.project.id);
      if (!meta || !meta.parent) {
        return undefined;
      }

      return new ProjectTreeItem(
        meta.parent.name,
        vscode.TreeItemCollapsibleState.Expanded,
        "group",
        undefined,
        meta.parent,
        meta.path,
        scope
      );
    }

    if (element.type === "group" && element.groupNode) {
      const meta = hierarchy.get(element.groupNode.name);
      if (!meta || !meta.parent) {
        return undefined;
      }

      const parentMeta = hierarchy.get(meta.parent.name);
      return new ProjectTreeItem(
        meta.parent.name,
        vscode.TreeItemCollapsibleState.Expanded,
        "group",
        undefined,
        meta.parent,
        parentMeta ? parentMeta.path : meta.parent.name,
        scope
      );
    }

    return undefined;
  }
}
