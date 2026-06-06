import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Project, ProjectGroup, ProjectRegistryNode } from "../interfaces/models.interface";
import { IStorageManager } from "../interfaces/services.interface";

/**
 * Gerenciador de persistência dos projetos e importação de extensões legadas
 * @implements Implementa a interface `IStorageManager`
 */
export class StorageService implements IStorageManager {
  private static readonly STORAGE_KEY = "projectOrganizer.projects";

  /**
   * Inicializa o serviço de persistência
   * @param context Contexto global da extensão do VS Code
   */
  constructor(private context: vscode.ExtensionContext) { }

  /**
   * Obtém o caminho do arquivo de persistência customizado se
   * configurado pelo usuário nas configurações globais
   * @returns Caminho absoluto ou `undefined` se não configurado
   */
  private getCustomFilePath(): string | undefined {
    const config = vscode.workspace.getConfiguration("projectOrganizer");
    const filePath = config.get<string>("customProjectsFile");
    if (filePath && filePath.trim() !== "") {
      if (filePath.startsWith("~/")) {
        const home = process.env.HOME || process.env.USERPROFILE || "";
        return path.join(home, filePath.slice(2));
      }
      return path.resolve(filePath);
    }
    return undefined;
  }

  /**
   * Retorna o caminho definitivo do arquivo de projetos
   * ativo (customizado ou local padrão no globalStorage)
   */
  public getProjectsFilePath(): string {
    const customPath = this.getCustomFilePath();
    if (customPath) {
      return customPath;
    }
    const dir = this.context.globalStorageUri.fsPath;
    return path.join(dir, "projects.json");
  }

  /**
   * Retorna os dados do template inicial padrão caso não existam projetos cadastrados
   */
  public static getDefaultTemplate(): ProjectRegistryNode[] {
    return [
      {
        name: "DivisaoA",
        isFolder: true,
        children: [
          {
            id: Buffer.from("/caminhos/ficticios/divisao-a/prime-app").toString("base64url"),
            name: "Prime Portal Web",
            path: "/caminhos/ficticios/divisao-a/prime-app",
            notes: "Portal corporativo de exemplo - mock",
            lastAccessed: Date.now()
          }
        ]
      },
      {
        name: "DivisaoB",
        isFolder: true,
        children: [
          {
            id: Buffer.from("/caminhos/ficticios/divisao-b/second-app").toString("base64url"),
            name: "Second App",
            path: "/caminhos/ficticios/divisao-b/second-app",
            notes: "Portal de suporte secundário - mock",
            lastAccessed: Date.now()
          }
        ]
      },
      {
        name: "DivisaoC",
        isFolder: true,
        children: [
          {
            id: Buffer.from("/caminhos/ficticios/divisao-c/portal-app").toString("base64url"),
            name: "Portal App",
            path: "/caminhos/ficticios/divisao-c/portal-app",
            notes: "Painel de controle unificado - mock",
            lastAccessed: Date.now()
          }
        ]
      }
    ];
  }

  /**
   * Converte a estrutura recursiva multinível do arquivo JSON físico em uma árvore em memória
   */
  private parseNestedRegistry(obj: any): ProjectRegistryNode[] {
    const nodes: ProjectRegistryNode[] = [];
    if (!obj || typeof obj !== "object") {
      return nodes;
    }

    for (const key of Object.keys(obj)) {
      if (key === "$position") {
        continue;
      }
      const val = obj[key];
      if (val && typeof val === "object") {
        if (typeof val.path === "string") {
          // É um projeto físico (folha)
          nodes.push({
            id: val.id || Buffer.from(path.resolve(val.path)).toString("base64url"),
            name: key,
            path: val.path,
            tags: Array.isArray(val.tags) ? val.tags : undefined,
            notes: val.notes || undefined,
            lastAccessed: typeof val.lastAccessed === "number" ? val.lastAccessed : Date.now(),
            favorite: typeof val.favorite === "boolean" ? val.favorite : undefined,
            deprecated: typeof val.deprecated === "boolean" ? val.deprecated : undefined,
            position: typeof val.position === "number" ? val.position : undefined,
          });
        } else {
          // É um grupo de projetos (pasta recursiva)
          const position = typeof val["$position"] === "number" ? val["$position"] : undefined;
          nodes.push({
            name: key,
            isFolder: true,
            position,
            children: this.parseNestedRegistry(val)
          });
        }
      }
    }

    return nodes;
  }

  /**
   * Converte a árvore de nós em memória para a estrutura
   * recursiva de objetos no formato JSON físico
   */
  private serializeNestedRegistry(nodes: ProjectRegistryNode[]): any {
    const obj: any = {};
    for (const node of nodes) {
      if ("isFolder" in node && node.isFolder) {
        const serializedChildren = this.serializeNestedRegistry(node.children);
        if (node.position !== undefined) {
          serializedChildren["$position"] = node.position;
        }
        obj[node.name] = serializedChildren;
      } else {
        const project = node as Project;
        obj[project.name] = {
          path: project.path,
          notes: project.notes || undefined,
          tags: project.tags && project.tags.length > 0 ? project.tags : undefined,
          lastAccessed: project.lastAccessed,
          id: project.id,
          favorite: project.favorite || undefined,
          deprecated: project.deprecated || undefined,
          position: project.position !== undefined ? project.position : undefined,
        };
      }
    }
    return obj;
  }

  /**
   * Importa projetos da extensão popular **alefragnani.project-manager**
   * @see {@link https://marketplace.visualstudio.com/items?itemName=alefragnani.project-manager | Project Manager}
   * @param merge Indica se os projetos devem ser mesclados com os projetos existentes ou se devem substituir os projetos existentes
   * @returns Número de projetos importados
   */
  public async importFromProjectManager(merge: boolean): Promise<number> {
    const globalStorageRoot = path.dirname(this.context.globalStorageUri.fsPath);
    const pmProjectsPath = path.join(
      globalStorageRoot,
      "alefragnani.project-manager",
      "projects.json"
    );

    if (!fs.existsSync(pmProjectsPath)) {
      throw new Error("Arquivo de projetos do Project Manager não encontrado.");
    }

    const content = await fs.promises.readFile(pmProjectsPath, "utf-8");
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("O arquivo de projetos do Project Manager está vazio.");
    }

    const currentTree = merge ? await this.getProjectsTree() : [];
    const flatProjects = await this.getProjects();
    const currentPaths = new Set(flatProjects.map((p) => path.resolve(p.path)));
    let count = 0;

    for (const p of parsed) {
      const pPath = p.rootPath || p.path;
      if (typeof pPath !== "string") {
        continue;
      }
      try {
        const resolvedPath = path.resolve(pPath);
        if (merge && currentPaths.has(resolvedPath)) {
          continue;
        }

        const group = Array.isArray(p.tags) && p.tags.length > 0 ? p.tags[0] : undefined;
        const newProj: Project = {
          id: p.id || Buffer.from(resolvedPath).toString("base64url"),
          name: p.name || path.basename(resolvedPath) || "Sem Nome",
          path: resolvedPath,
          tags: Array.isArray(p.tags) ? p.tags : undefined,
          notes: p.notes || undefined,
          lastAccessed: typeof p.lastAccessed === "number" ? p.lastAccessed : Date.now(),
        };

        if (group && group.trim() !== "") {
          const groupNode = this.findOrCreateGroupInTree(currentTree, group);
          groupNode.children.push(newProj);
        } else {
          currentTree.push(newProj);
        }
        currentPaths.add(resolvedPath);
        count++;
      } catch {
        // ignora itens inválidos
      }
    }

    if (count > 0) {
      await this.saveProjectsTree(currentTree);
    }

    return count;
  }

  /**
   * Tenta migrar automaticamente projetos da extensão **alefragnani.project-manager**
   * @see {@link https://marketplace.visualstudio.com/items?itemName=alefragnani.project-manager | Project Manager}
   * @returns Array de projetos migrados ou undefined se não houver projetos para migrar
   */
  private async tryMigrateFromProjectManager(): Promise<Project[] | undefined> {
    try {
      const count = await this.importFromProjectManager(false);
      if (count > 0) {
        vscode.window.showInformationMessage(
          vscode.l10n.t("Project Organizer: Successfully migrated {0} projects from Project Manager extension.", count)
        );
        return this.getProjects();
      }
    } catch {
      // Ignora erros silenciosamente
    }
    return undefined;
  }

  /**
   * Lê a árvore estruturada recursiva de nós (Composite Pattern) diretamente do arquivo físico
   */
  public async getProjectsTree(): Promise<ProjectRegistryNode[]> {
    const filePath = this.getProjectsFilePath();
    try {
      if (fs.existsSync(filePath)) {
        const content = await fs.promises.readFile(filePath, "utf-8");
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return this.parseNestedRegistry(parsed);
        }
      }
    } catch (err) {
      vscode.window.showErrorMessage(
        vscode.l10n.t("Error reading projects tree: {0}", (err as Error).message)
      );
    }
    return [];
  }

  /**
   * Salva a árvore estruturada recursiva de nós no arquivo físico
   * @param nodes Árvore de projetos para salvar
   */
  public async saveProjectsTree(nodes: ProjectRegistryNode[]): Promise<void> {
    const filePath = this.getProjectsFilePath();
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
      const serialized = this.serializeNestedRegistry(nodes);
      await fs.promises.writeFile(
        filePath,
        JSON.stringify(serialized, null, 2),
        "utf-8"
      );
    } catch (err) {
      vscode.window.showErrorMessage(
        vscode.l10n.t("Error saving projects tree: {0}", (err as Error).message)
      );
    }
  }

  /**
   * Lê todos os projetos registrados na base de dados de forma assíncrona, planificando a árvore
   * @returns Array de projetos
   */
  public async getProjects(): Promise<Project[]> {
    const tree = await this.getProjectsTree();
    const flatProjects: Project[] = [];

    const traverse = (nodes: ProjectRegistryNode[]) => {
      for (const node of nodes) {
        if ("isFolder" in node && node.isFolder) {
          traverse(node.children);
        } else {
          flatProjects.push(node as Project);
        }
      }
    };

    traverse(tree);

    if (flatProjects.length > 0) {
      return this.normalizeProjects(flatProjects);
    }

    // Caso a árvore esteja vazia, executa as rotinas de fallback/migração
    const filePath = this.getProjectsFilePath();
    if (!fs.existsSync(filePath)) {
      // Migração de dados legados do globalState
      const customPath = this.getCustomFilePath();
      if (!customPath) {
        const oldProjects = this.context.globalState.get<any[]>(
          StorageService.STORAGE_KEY
        );
        if (oldProjects && Array.isArray(oldProjects) && oldProjects.length > 0) {
          const normalized = this.normalizeProjects(oldProjects);
          await this.saveProjects(normalized);
          await this.context.globalState.update(StorageService.STORAGE_KEY, undefined);
          return normalized;
        }
      }

      // Tenta migração da extensão alefragnani.project-manager
      const pmMigrated = await this.tryMigrateFromProjectManager();
      if (pmMigrated) {
        return pmMigrated;
      }

      // Inicializa com o template inicial padrão
      const template = StorageService.getDefaultTemplate();
      await this.saveProjectsTree(template);

      const flatTemplateProjects: Project[] = [];
      const traverseTemplate = (nodes: ProjectRegistryNode[]) => {
        for (const node of nodes) {
          if ("isFolder" in node && node.isFolder) {
            traverseTemplate(node.children);
          } else {
            flatTemplateProjects.push(node as Project);
          }
        }
      };
      traverseTemplate(template);
      return flatTemplateProjects;
    }

    return [];
  }

  /**
   * Salva a lista de projetos mesclando-a recursivamente in-place com a árvore existente
   * @param projects Lista de projetos para salvar
   */
  public async saveProjects(projects: Project[]): Promise<void> {
    const tree = await this.getProjectsTree();
    const flatProjectsMap = new Map(projects.map((p) => [p.id, p]));

    // Helper recursivo para atualizar/remover nós de projeto na árvore existente
    const updateTreeNodes = (nodes: ProjectRegistryNode[]): ProjectRegistryNode[] => {
      const result: ProjectRegistryNode[] = [];
      for (const node of nodes) {
        if ("isFolder" in node && node.isFolder) {
          node.children = updateTreeNodes(node.children);
          result.push(node);
        } else {
          const project = node as Project;
          const updated = flatProjectsMap.get(project.id);
          if (updated) {
            result.push({
              ...project,
              ...updated,
            });
            flatProjectsMap.delete(project.id);
          }
        }
      }
      return result;
    };

    const updatedTree = updateTreeNodes(tree);

    // Projetos restantes no mapa são novos! Adiciona-os à raiz (pois não possuem grupo na propriedade)
    for (const [_, newProj] of flatProjectsMap) {
      updatedTree.push(newProj);
    }

    await this.saveProjectsTree(updatedTree);
  }

  /**
   * Encontra ou cria a estrutura de grupos recursivamente na árvore.
   */
  private findOrCreateGroupInTree(
    nodes: ProjectRegistryNode[],
    groupName: string
  ): ProjectGroup {
    const parts = groupName.split("/");
    let currentLevel = nodes;
    let targetGroup: ProjectGroup | undefined;

    for (const part of parts) {
      const trimmed = part.trim();
      let found = currentLevel.find(
        (n) => "isFolder" in n && n.isFolder && n.name === trimmed
      ) as ProjectGroup | undefined;

      if (!found) {
        found = {
          name: trimmed,
          isFolder: true,
          children: [],
        };
        currentLevel.push(found);
      }
      targetGroup = found;
      currentLevel = found.children;
    }

    return targetGroup!;
  }

  /**
   * Retorna a cadeia de grupos de um projeto formatada de forma hierárquica
   * @param projectId ID do projeto
   * @returns Caminho hierárquico dos grupos
   */
  public async getProjectGroupPath(projectId: string): Promise<string | undefined> {
    const tree = await this.getProjectsTree();

    const findPath = (nodes: ProjectRegistryNode[], currentPath: string[]): string[] | undefined => {
      for (const node of nodes) {
        if ("isFolder" in node && node.isFolder) {
          const pathFound = findPath(node.children, [...currentPath, node.name]);
          if (pathFound) {
            return pathFound;
          }
        } else {
          const project = node as Project;
          if (project.id === projectId) {
            return currentPath;
          }
        }
      }
      return undefined;
    };

    const pathSegments = findPath(tree, []);
    return pathSegments && pathSegments.length > 0 ? pathSegments.join("/") : undefined;
  }

  /**
   * Adiciona um novo projeto à árvore recursiva
   * @param name Nome do projeto
   * @param projectPath Caminho do projeto
   * @param group Grupo do projeto
   * @returns Projeto adicionado
   */
  public async addProject(
    name: string,
    projectPath: string,
    group?: string
  ): Promise<Project> {
    const tree = await this.getProjectsTree();
    const resolvedPath = path.resolve(projectPath);

    const flat = await this.getProjects();
    const existing = flat.find((p) => path.resolve(p.path) === resolvedPath);
    if (existing) {
      throw new Error(
        vscode.l10n.t("Project already exists: {0} ({1})", existing.name, existing.path)
      );
    }

    const newProject: Project = {
      id: Buffer.from(resolvedPath).toString("base64url"),
      name: name.trim(),
      path: resolvedPath,
      lastAccessed: Date.now(),
    };

    if (group && group.trim() !== "") {
      const groupNode = this.findOrCreateGroupInTree(tree, group);
      groupNode.children.push(newProject);
    } else {
      tree.push(newProject);
    }

    await this.saveProjectsTree(tree);
    return newProject;
  }

  /**
   * Remove um projeto permanentemente de qualquer nível da árvore
   * @param id ID do projeto
   */
  public async removeProject(id: string): Promise<void> {
    const tree = await this.getProjectsTree();

    const removeFromNodes = (nodes: ProjectRegistryNode[]): ProjectRegistryNode[] => {
      const result: ProjectRegistryNode[] = [];
      for (const node of nodes) {
        if ("isFolder" in node && node.isFolder) {
          node.children = removeFromNodes(node.children);
          result.push(node);
        } else {
          const project = node as Project;
          if (project.id !== id) {
            result.push(node);
          }
        }
      }
      return result;
    };

    const updated = removeFromNodes(tree);
    await this.saveProjectsTree(updated);
  }

  /**
   * Atualiza propriedades de um projeto existente na árvore,
   * suportando re-parenting opcional se o grupo mudar
   * @param id ID do projeto
   * @param updates Objeto com as propriedades do projeto para atualizar
   */
  public async updateProject(
    id: string,
    updates: Partial<Omit<Project, "id" | "path">> & { group?: string | undefined }
  ): Promise<void> {
    const tree = await this.getProjectsTree();

    if (updates.group === undefined) {
      const currentGroup = await this.getProjectGroupPath(id);
      updates.group = currentGroup || "";
    }

    let projectToUpdate: Project | undefined;

    // 1. Remove o projeto de seu local atual para re-parenting se o grupo for atualizado
    const removeProjectFromTree = (nodes: ProjectRegistryNode[]): ProjectRegistryNode[] => {
      const result: ProjectRegistryNode[] = [];
      for (const node of nodes) {
        if ("isFolder" in node && node.isFolder) {
          node.children = removeProjectFromTree(node.children);
          result.push(node);
        } else {
          const project = node as Project;
          if (project.id === id) {
            projectToUpdate = project;
          } else {
            result.push(node);
          }
        }
      }
      return result;
    };

    let updatedTree = removeProjectFromTree(tree);
    if (!projectToUpdate) {
      throw new Error(vscode.l10n.t("Project not found."));
    }

    // Aplica as atualizações solicitadas
    const updatedProject: Project = {
      ...projectToUpdate,
      ...updates
    };

    // Remove a prop group flat no nível do nó da árvore (o aninhamento físico cuida disso)
    if ("group" in updatedProject) {
      delete (updatedProject as any).group;
    }

    // 2. Insere o projeto atualizado no grupo correspondente ou na raiz
    if (updates.group !== undefined && updates.group !== null && updates.group.trim() !== "") {
      const groupNode = this.findOrCreateGroupInTree(updatedTree, updates.group);
      groupNode.children.push(updatedProject);
    } else {
      updatedTree.push(updatedProject);
    }

    await this.saveProjectsTree(updatedTree);
  }

  /**
   * Reordena um projeto arrastado posicionando-o antes do projeto alvo na árvore recursiva
   * @param draggedId ID do projeto arrastado
   * @param targetId ID do projeto alvo
   */
  public async reorderProjects(draggedId: string, targetId: string): Promise<void> {
    const tree = await this.getProjectsTree();

    let draggedProject: Project | undefined;

    // 1. Encontra e remove o projeto arrastado da árvore
    const removeDragged = (nodes: ProjectRegistryNode[]): ProjectRegistryNode[] => {
      const result: ProjectRegistryNode[] = [];
      for (const node of nodes) {
        if ("isFolder" in node && node.isFolder) {
          node.children = removeDragged(node.children);
          result.push(node);
        } else {
          const project = node as Project;
          if (project.id === draggedId) {
            draggedProject = project;
          } else {
            result.push(node);
          }
        }
      }
      return result;
    };

    let updatedTree = removeDragged(tree);
    if (!draggedProject) {
      throw new Error(vscode.l10n.t("Project not found."));
    }

    // 2. Insere o arrastado imediatamente antes do alvo
    let targetInserted = false;
    const insertBeforeTarget = (nodes: ProjectRegistryNode[]): ProjectRegistryNode[] => {
      const result: ProjectRegistryNode[] = [];
      for (const node of nodes) {
        if ("isFolder" in node && node.isFolder) {
          node.children = insertBeforeTarget(node.children);
          result.push(node);
        } else {
          const project = node as Project;
          if (project.id === targetId) {
            result.push(draggedProject!);
            result.push(node);
            targetInserted = true;
          } else {
            result.push(node);
          }
        }
      }
      return result;
    };

    updatedTree = insertBeforeTarget(updatedTree);
    if (!targetInserted) {
      throw new Error(vscode.l10n.t("Project not found."));
    }

    // 3. Re-sequencia as posições dos irmãos no grupo afetado
    const resequenceSiblings = (nodes: ProjectRegistryNode[]): void => {
      const hasDragged = nodes.some((n) => !("isFolder" in n && n.isFolder) && (n as Project).id === draggedId);
      if (hasDragged) {
        let positionCounter = 1;
        for (const node of nodes) {
          if (!("isFolder" in node && node.isFolder)) {
            const project = node as Project;
            project.position = positionCounter++;
          }
        }
        return;
      }
      for (const node of nodes) {
        if ("isFolder" in node && node.isFolder) {
          resequenceSiblings(node.children);
        }
      }
    };

    resequenceSiblings(updatedTree);
    await this.saveProjectsTree(updatedTree);
  }

  /**
   * Normaliza dados dos projetos garantindo IDs e consistência estrutural
   * @param projects Array de projetos a serem normalizados
   * @returns Array de projetos normalizados
   */
  private normalizeProjects(projects: any[]): Project[] {
    if (!Array.isArray(projects)) {
      return [];
    }
    const result: Project[] = [];
    for (const p of projects) {
      if (!p || typeof p.path !== "string") {
        continue;
      }
      try {
        const resolvedPath = path.resolve(p.path);
        result.push({
          id: p.id || Buffer.from(resolvedPath).toString("base64url"),
          name: p.name || path.basename(resolvedPath) || "Sem Nome",
          path: resolvedPath,
          tags: Array.isArray(p.tags) ? p.tags : undefined,
          notes: p.notes || undefined,
          lastAccessed: typeof p.lastAccessed === "number" ? p.lastAccessed : Date.now(),
          favorite: typeof p.favorite === "boolean" ? p.favorite : undefined,
          deprecated: typeof p.deprecated === "boolean" ? p.deprecated : undefined,
          position: typeof p.position === "number" ? p.position : undefined,
        });
      } catch {
        // Ignora itens inválidos
      }
    }
    return result;
  }

  /**
   * Atualiza a posição de ordenação de um grupo na árvore
   * @param fullGroupPath Caminho completo do grupo (ex: "Grupo/Subgrupo")
   * @param position Posição de ordenação
   */
  public async updateGroupPosition(
    fullGroupPath: string,
    position: number | undefined
  ): Promise<void> {
    const tree = await this.getProjectsTree();
    const parts = fullGroupPath.split("/");

    const update = (nodes: ProjectRegistryNode[], depth: number): boolean => {
      if (depth >= parts.length) {
        return false;
      }
      const targetName = parts[depth].trim();
      for (const node of nodes) {
        if ("isFolder" in node && node.isFolder && node.name === targetName) {
          if (depth === parts.length - 1) {
            node.position = position;
            return true;
          }
          if (update(node.children, depth + 1)) {
            return true;
          }
        }
      }
      return false;
    };

    if (update(tree, 0)) {
      await this.saveProjectsTree(tree);
    } else {
      throw new Error(vscode.l10n.t("Group not found."));
    }
  }
}
