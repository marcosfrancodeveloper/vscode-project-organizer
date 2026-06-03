import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Project } from "./types";

export class StorageManager {
  private static readonly STORAGE_KEY = "projectOrganizer.projects";

  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Obtém o caminho do arquivo de persistência customizado se configurado.
   */
  private getCustomFilePath(): string | undefined {
    const config = vscode.workspace.getConfiguration("projectOrganizer");
    const filePath = config.get<string>("customProjectsFile");
    if (filePath && filePath.trim() !== "") {
      // Resolve caminhos com ~ para o home directory
      if (filePath.startsWith("~/")) {
        const home = process.env.HOME || process.env.USERPROFILE || "";
        return path.join(home, filePath.slice(2));
      }
      return path.resolve(filePath);
    }
    return undefined;
  }

  /**
   * Retorna o caminho definitivo do arquivo de projetos ativo (customizado ou local padrão).
   */
  public getProjectsFilePath(): string {
    const customPath = this.getCustomFilePath();
    if (customPath) {
      return customPath;
    }
    // Caso padrão: salva na pasta de globalStorage da extensão
    const dir = this.context.globalStorageUri.fsPath;
    return path.join(dir, "projects.json");
  }

  /**
   * Retorna os dados do template padrão.
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
   * Converte a estrutura aninhada do JSON para uma lista plana de projetos.
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
            // É um projeto!
            const groupPath = currentGroupParts.join("/");
            projects.push({
              id: val.id || Buffer.from(path.resolve(val.path)).toString("base64url"),
              name: key,
              path: val.path,
              group: groupPath !== "" ? groupPath : undefined,
              tags: Array.isArray(val.tags) ? val.tags : undefined,
              notes: val.notes || undefined,
              lastAccessed: typeof val.lastAccessed === "number" ? val.lastAccessed : Date.now(),
            });
          } else {
            // É um subgrupo!
            walk(val, [...currentGroupParts, key]);
          }
        }
      }
    }

    walk(obj, []);
    return projects;
  }

  /**
   * Converte a lista plana de projetos para a estrutura de objetos aninhados (pastas e projetos).
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
      };
    }

    return root;
  }

  /**
   * Lê todos os projetos salvos.
   */
  public async getProjects(): Promise<Project[]> {
    const filePath = this.getProjectsFilePath();

    try {
      if (fs.existsSync(filePath)) {
        const content = await fs.promises.readFile(filePath, "utf-8");
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          // Formato antigo plano: converte para o novo formato aninhado
          const flatProjects = this.normalizeProjects(parsed);
          if (flatProjects.length > 0) {
            await this.saveProjects(flatProjects);
            return flatProjects;
          }
        } else if (parsed && typeof parsed === "object") {
          // Novo formato aninhado
          const flatProjects = this.parseNestedRegistry(parsed);
          if (flatProjects.length > 0) {
            return this.normalizeProjects(flatProjects);
          }
        }
      }

      // Se o arquivo não existir ou se estiver vazio, tenta fazer migração do globalState
      const customPath = this.getCustomFilePath();
      if (!customPath) {
        const oldProjects = this.context.globalState.get<any[]>(
          StorageManager.STORAGE_KEY
        );
        if (oldProjects && Array.isArray(oldProjects) && oldProjects.length > 0) {
          const normalized = this.normalizeProjects(oldProjects);
          await this.saveProjects(normalized);
          await this.context.globalState.update(StorageManager.STORAGE_KEY, undefined);
          return normalized;
        }
      }

      // Se não há dados migrados e o arquivo está vazio/não existe, inicializa com o template padrão!
      const template = StorageManager.getDefaultTemplate();
      await this.saveProjects(template);
      return template;
    } catch (err) {
      vscode.window.showErrorMessage(
        `Erro ao ler arquivo de projetos: ${(err as Error).message}`
      );
    }

    return [];
  }

  /**
   * Salva a lista de projetos.
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
        `Erro ao salvar projetos: ${(err as Error).message}`
      );
    }
  }

  /**
   * Adiciona um novo projeto.
   */
  public async addProject(
    name: string,
    projectPath: string,
    group?: string
  ): Promise<Project> {
    const projects = await this.getProjects();
    const resolvedPath = path.resolve(projectPath);

    // Evita duplicatas pelo caminho
    const existing = projects.find(
      (p) => path.resolve(p.path) === resolvedPath
    );
    if (existing) {
      throw new Error(`O projeto já existe: ${existing.name} (${existing.path})`);
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
   * Remove um projeto pelo ID.
   */
  public async removeProject(id: string): Promise<void> {
    const projects = await this.getProjects();
    const filtered = projects.filter((p) => p.id !== id);
    await this.saveProjects(filtered);
  }

  /**
   * Atualiza os dados de um projeto existente.
   */
  public async updateProject(
    id: string,
    updates: Partial<Omit<Project, "id" | "path">>
  ): Promise<void> {
    const projects = await this.getProjects();
    const index = projects.findIndex((p) => p.id === id);

    if (index === -1) {
      throw new Error("Projeto não encontrado.");
    }

    const oldProject = projects[index];
    // Só atualiza o grupo se a propriedade foi explicitamente enviada no updates
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
   * Garante consistência de tipos e id para dados antigos ou importados.
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
        });
      } catch {
        // Ignora itens inválidos
      }
    }
    return result;
  }
}
