import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Project } from "../interfaces/models.interface";
import { IStorageManager } from "../interfaces/services.interface";

/**
 * Gerenciador de persistência dos projetos e importação de extensões legadas.
 * Implementa a interface IStorageManager.
 */
export class StorageService implements IStorageManager {
  private static readonly STORAGE_KEY = "projectOrganizer.projects";

  /**
   * Inicializa o serviço de persistência.
   * @param context Contexto global da extensão do VS Code.
   */
  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Obtém o caminho do arquivo de persistência customizado se configurado pelo usuário nas configurações globais.
   * @returns Caminho absoluto ou `undefined` se não configurado.
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
   * Retorna o caminho definitivo do arquivo de projetos ativo (customizado ou local padrão no globalStorage).
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
   * Retorna os dados do template inicial padrão caso não existam projetos cadastrados.
   */
  public static getDefaultTemplate(): Project[] {
    return [
      {
        id: Buffer.from("/caminhos/ficticios/corporativo/policiacivil/sipol").toString("base64url"),
        name: "Sipol Portal Web",
        path: "/caminhos/ficticios/corporativo/policiacivil/sipol",
        group: "Corporativo/PoliciaCivil",
        notes: "Portal corporativo da Polícia Civil - mock",
        lastAccessed: Date.now()
      },
      {
        id: Buffer.from("/caminhos/ficticios/corporativo/defesacivil/funesbom").toString("base64url"),
        name: "Funesbom App",
        path: "/caminhos/ficticios/corporativo/defesacivil/funesbom",
        group: "Corporativo/DefesaCivil",
        notes: "Portal de taxas e requerimentos - mock",
        lastAccessed: Date.now()
      },
      {
        id: Buffer.from("/caminhos/ficticios/corporativo/secretariaseguranca/portal").toString("base64url"),
        name: "Portal SESP",
        path: "/caminhos/ficticios/corporativo/secretariaseguranca/portal",
        group: "Corporativo/SecretariaSeguranca",
        notes: "Painel unificado da Secretaria de Segurança - mock",
        lastAccessed: Date.now()
      }
    ];
  }

  /**
   * Converte a estrutura aninhada do arquivo JSON físico para uma lista plana de projetos em memória.
   */
  private parseNestedRegistry(obj: any): Project[] {
    const projects: Project[] = [];

    function walk(currentObj: any, currentGroupParts: string[]) {
      if (!currentObj || typeof currentObj !== "object") {
        return;
      }

      for (const key of Object.keys(currentObj)) {
        const val = currentObj[key];
        if (val && typeof val === "object") {
          if (typeof val.path === "string") {
            const groupPath = currentGroupParts.join("/");
            projects.push({
              id: val.id || Buffer.from(path.resolve(val.path)).toString("base64url"),
              name: key,
              path: val.path,
              group: groupPath !== "" ? groupPath : undefined,
              tags: Array.isArray(val.tags) ? val.tags : undefined,
              notes: val.notes || undefined,
              lastAccessed: typeof val.lastAccessed === "number" ? val.lastAccessed : Date.now(),
              favorite: typeof val.favorite === "boolean" ? val.favorite : undefined,
            });
          } else {
            walk(val, [...currentGroupParts, key]);
          }
        }
      }
    }

    walk(obj, []);
    return projects;
  }

  /**
   * Converte a lista plana de projetos para a estrutura de objetos aninhados (pastas e projetos) no formato JSON físico.
   */
  private serializeNestedRegistry(projects: Project[]): any {
    const root: any = {};

    for (const project of projects) {
      let current = root;

      if (project.group) {
        const parts = project.group.split("/");
        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed === "") {
            continue;
          }
          if (
            !current[trimmed] ||
            typeof current[trimmed] !== "object" ||
            typeof current[trimmed].path === "string"
          ) {
            current[trimmed] = {};
          }
          current = current[trimmed];
        }
      }

      current[project.name] = {
        path: project.path,
        notes: project.notes || undefined,
        tags: project.tags && project.tags.length > 0 ? project.tags : undefined,
        lastAccessed: project.lastAccessed,
        id: project.id,
        favorite: project.favorite || undefined,
      };
    }

    return root;
  }

  /**
   * Importa projetos da extensão popular alefragnani.project-manager.
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

    const currentProjects = merge ? await this.getProjects() : [];
    const currentPaths = new Set(currentProjects.map((p) => path.resolve(p.path)));
    const importedProjects: Project[] = [];
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
        importedProjects.push({
          id: p.id || Buffer.from(resolvedPath).toString("base64url"),
          name: p.name || path.basename(resolvedPath) || "Sem Nome",
          path: resolvedPath,
          group: group,
          tags: Array.isArray(p.tags) ? p.tags : undefined,
          notes: p.notes || undefined,
          lastAccessed: typeof p.lastAccessed === "number" ? p.lastAccessed : Date.now(),
        });
        count++;
      } catch {
        // ignora itens inválidos
      }
    }

    if (importedProjects.length > 0) {
      const finalProjects = merge ? [...currentProjects, ...importedProjects] : importedProjects;
      await this.saveProjects(finalProjects);
    }

    return count;
  }

  /**
   * Tenta migrar automaticamente projetos da extensão alefragnani.project-manager.
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
   * Lê todos os projetos registrados na base de dados de forma assíncrona.
   */
  public async getProjects(): Promise<Project[]> {
    const filePath = this.getProjectsFilePath();

    try {
      if (fs.existsSync(filePath)) {
        const content = await fs.promises.readFile(filePath, "utf-8");
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          const flatProjects = this.normalizeProjects(parsed);
          if (flatProjects.length > 0) {
            await this.saveProjects(flatProjects);
            return flatProjects;
          }
        } else if (parsed && typeof parsed === "object") {
          const flatProjects = this.parseNestedRegistry(parsed);
          if (flatProjects.length > 0) {
            return this.normalizeProjects(flatProjects);
          }
        }
      }

      // Migração de dados legados do globalState se o arquivo físico não existir
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

      // Inicializa com o template inicial
      const template = StorageService.getDefaultTemplate();
      await this.saveProjects(template);
      return template;
    } catch (err) {
      vscode.window.showErrorMessage(
        vscode.l10n.t("Error reading projects file: {0}", (err as Error).message)
      );
    }

    return [];
  }

  /**
   * Salva toda a lista de projetos na base de dados.
   */
  public async saveProjects(projects: Project[]): Promise<void> {
    const filePath = this.getProjectsFilePath();

    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
      const nestedData = this.serializeNestedRegistry(projects);
      await fs.promises.writeFile(
        filePath,
        JSON.stringify(nestedData, null, 2),
        "utf-8"
      );
    } catch (err) {
      vscode.window.showErrorMessage(
        vscode.l10n.t("Error saving projects: {0}", (err as Error).message)
      );
    }
  }

  /**
   * Adiciona um novo projeto à lista.
   */
  public async addProject(
    name: string,
    projectPath: string,
    group?: string
  ): Promise<Project> {
    const projects = await this.getProjects();
    const resolvedPath = path.resolve(projectPath);

    const existing = projects.find(
      (p) => path.resolve(p.path) === resolvedPath
    );
    if (existing) {
      throw new Error(
        vscode.l10n.t("Project already exists: {0} ({1})", existing.name, existing.path)
      );
    }

    const newProject: Project = {
      id: Buffer.from(resolvedPath).toString("base64url"),
      name: name.trim(),
      path: resolvedPath,
      group: group && group.trim() !== "" ? group.trim() : undefined,
      lastAccessed: Date.now(),
    };

    projects.push(newProject);
    await this.saveProjects(projects);
    return newProject;
  }

  /**
   * Remove um projeto permanentemente da base.
   */
  public async removeProject(id: string): Promise<void> {
    const projects = await this.getProjects();
    const filtered = projects.filter((p) => p.id !== id);
    await this.saveProjects(filtered);
  }

  /**
   * Atualiza propriedades parciais de um projeto existente.
   */
  public async updateProject(
    id: string,
    updates: Partial<Omit<Project, "id" | "path">>
  ): Promise<void> {
    const projects = await this.getProjects();
    const index = projects.findIndex((p) => p.id === id);

    if (index === -1) {
      throw new Error(vscode.l10n.t("Project not found."));
    }

    const oldProject = projects[index];
    let group = updates.group !== undefined ? updates.group : oldProject.group;
    if (group !== undefined) {
      group = group.trim() !== "" ? group.trim() : undefined;
    }

    projects[index] = {
      ...oldProject,
      ...updates,
      group,
    };

    await this.saveProjects(projects);
  }

  /**
   * Normaliza dados dos projetos garantindo IDs e consistência estrutural.
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
          group: p.group || undefined,
          tags: Array.isArray(p.tags) ? p.tags : undefined,
          notes: p.notes || undefined,
          lastAccessed: typeof p.lastAccessed === "number" ? p.lastAccessed : Date.now(),
          favorite: typeof p.favorite === "boolean" ? p.favorite : undefined,
        });
      } catch {
        // Ignora itens inválidos
      }
    }
    return result;
  }
}
