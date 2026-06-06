import { GitStatus, Project, ProjectRegistryNode } from "./models.interface";

/**
 * Contrato de serviço para integração e monitoramento com o sistema de controle de versão Git
 */
export interface IGitService {
  /**
   * Verifica se o diretório do projeto possui um repositório Git inicializado
   * @param projectPath Caminho absoluto do diretório no disco
   * @returns `true` se contiver a pasta `.git`, `false` caso contrário
   */
  isGitRepository(projectPath: string): boolean;

  /**
   * Executa comandos assíncronos para obter o status atual do Git em um repositório
   * @param projectPath Caminho absoluto do diretório no disco
   * @returns O objeto `GitStatus` preenchido ou `null` se falhar ou não for um repositório Git
   */
  getStatus(projectPath: string): Promise<GitStatus | null>;
}

/**
 * Contrato de serviço para gerenciamento e persistência de dados de projetos
 */
export interface IStorageManager {
  /**
   * Retorna o caminho absoluto do arquivo JSON onde os projetos estão persistidos
   * @returns Caminho absoluto do arquivo JSON
   */
  getProjectsFilePath(): string;

  /**
   * Lê todos os projetos registrados na base de dados de forma assíncrona
   * @returns Array de projetos registrados
   */
  getProjects(): Promise<Project[]>;

  /**
   * Salva toda a lista de projetos na base de dados
   * @param projects Array completo contendo os projetos atualizados
   */
  saveProjects(projects: Project[]): Promise<void>;

  /**
   * Lê a árvore estruturada recursiva de nós (Composite Pattern) diretamente do arquivo físico
   * @returns Árvore estruturada de nós
   */
  getProjectsTree(): Promise<ProjectRegistryNode[]>;

  /**
   * Salva a árvore estruturada recursiva de nós no arquivo físico
   * @param nodes Array contendo os nós raiz da árvore
   */
  saveProjectsTree(nodes: ProjectRegistryNode[]): Promise<void>;

  /**
   * Retorna a cadeia de grupos de um projeto formatada de forma hierárquica (ex: "EDS/Subgrupo")
   * @param projectId ID do projeto
   * @returns Caminho do grupo
   */
  getProjectGroupPath(projectId: string): Promise<string | undefined>;

  /**
   * Adiciona um novo projeto à lista
   * @param name Nome do projeto
   * @param projectPath Caminho do projeto no disco
   * @param group Grupo opcional do projeto
   * @returns O projeto recém-criado
   */
  addProject(name: string, projectPath: string, group?: string): Promise<Project>;

  /**
   * Remove um projeto permanentemente da base
   * @param id Identificador do projeto a ser removido
   */
  removeProject(id: string): Promise<void>;

  /**
   * Atualiza propriedades parciais de um projeto existente
   * @param id Identificador do projeto
   * @param updates Propriedades a serem atualizadas
   */
  updateProject(
    id: string,
    updates: Partial<Omit<Project, "id" | "path">> & { group?: string | undefined }
  ): Promise<void>;

  /**
   * Importa projetos da extensão antiga "Project Manager"
   * @param merge Se `true`, combina com a lista existente sem duplicar caminhos; se `false`, sobrescreve a base
   * @returns O total de novos projetos importados
   */
  importFromProjectManager(merge: boolean): Promise<number>;

  /**
   * Reordena um projeto arrastado posicionando-o antes do projeto alvo
   * @param draggedId ID do projeto arrastado
   * @param targetId ID do projeto alvo
   */
  reorderProjects(draggedId: string, targetId: string): Promise<void>;

  /**
   * Atualiza a posição de ordenação de um grupo
   * @param fullGroupPath Caminho absoluto lógico do grupo (ex: "Pasta/Subpasta")
   * @param position Nova posição numérica ou undefined para limpar
   */
  updateGroupPosition(fullGroupPath: string, position: number | undefined): Promise<void>;
}

/**
 * Contrato de serviço para escaneamento automático de pastas base locais à procura de projetos
 */
export interface IProjectScanner {
  /**
   * Varre um caminho recursivamente procurando marcadores de projetos (ex: `.git`, `package.json`)
   * @param basePath Caminho absoluto inicial da varredura
   * @param maxDepth Profundidade máxima de subníveis a escanear
   * @param ignoredFolders Lista de nomes de pastas a ignorar (ex: "node_modules")
   * @returns Array de projetos encontrados com caminho e nome, e grupo associado
   */
  scan(
    basePath: string,
    maxDepth: number,
    ignoredFolders: string[]
  ): Promise<{ name: string; path: string; groupPath?: string }[]>;
}
