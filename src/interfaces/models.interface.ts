/**
 * Representa o status atual do Git para um projeto
 * @member branch O nome da branch atual
 * @member isDirty Indica se há alterações não salvas/pendentes de commit no workspace
 * @member unpushed Quantidade de commits locais pendentes de envio para o remoto
 * @member lastChecked Timestamp da última checagem de status realizada
 */
export interface GitStatus {
  branch: string;
  isDirty: boolean;
  unpushed?: number;
  lastChecked: number;
}

/**
 * Representa um projeto gerenciado pela extensão
 * @member id Identificador único do projeto
 * @member name Nome amigável de exibição do projeto
 * @member path Caminho físico absoluto no disco local
 * @member group Nome do grupo organizacional ao qual o projeto pertence
 * @member tags Marcadores/tags customizados para busca e filtragem rápidos
 * @member notes Anotações descritivas em formato Markdown sobre o projeto
 * @member lastAccessed Timestamp do último acesso/abertura do projeto
 * @member favorite Indica se o projeto foi adicionado à lista de favoritos
 * @member deprecated Indica se o projeto está obsoleto/descontinuado
 * @member position Posição do projeto dentro do seu grupo
 */
export interface Project {
  id: string;
  name: string;
  path: string;
  tags?: string[];
  notes?: string;
  lastAccessed: number;
  favorite?: boolean;
  deprecated?: boolean;
  position?: number;
}

/**
 * Nó do grupo para a estrutura de árvore recursiva multinível (Composite Pattern)
 * @member name Nome do grupo
 * @member children Array de filhos (projetos ou outros grupos)
 * @member isFolder true indica que é um grupo
 * @member position Posição do grupo na árvore
 */
export interface ProjectGroup {
  name: string;
  children: (ProjectGroup | Project)[];
  isFolder: true;
  position?: number;
}

/**
 * Nó genérico do registro de projetos (pode ser um grupo/pasta ou um projeto)
 */
export type ProjectRegistryNode = ProjectGroup | Project;

/**
 * Type Guard para verificar se um nó é um grupo de projetos
 */
export function isProjectGroup(node: any): node is ProjectGroup {
  return node && node.isFolder === true;
}

/**
 * Type Guard para verificar se um nó é um projeto físico
 */
export function isProject(node: any): node is Project {
  return node && typeof node.path === "string" && !node.isFolder;
}

/**
 * Tipo que define a classificação do nó da árvore lateral
 */
export type TreeItemType = "root-favorites" | "root-projects" | "group" | "project";

/**
 * Escopo de visualização dos nós na árvore
 */
export type TreeScope = "favorites" | "all";
