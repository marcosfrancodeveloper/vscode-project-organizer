/**
 * Representa o status atual do Git para um projeto.
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
 * Representa um projeto gerenciado pela extensão.
 * @member id Identificador único do projeto
 * @member name Nome amigável de exibição do projeto
 * @member path Caminho físico absoluto no disco local
 * @member group Caminho do grupo organizacional com níveis separados por "/"
 * @member tags Marcadores/tags customizados para busca e filtragem rápidos
 * @member notes Anotações descritivas em formato Markdown sobre o projeto
 * @member lastAccessed Timestamp do último acesso/abertura do projeto
 * @member favorite Indica se o projeto foi adicionado à lista de favoritos
 */
export interface Project {
  id: string;
  name: string;
  path: string;
  group?: string;
  tags?: string[];
  notes?: string;
  lastAccessed: number;
  favorite?: boolean;
}

/**
 * Nó hierárquico usado para construir a estrutura em árvore na barra lateral.
 * @member name Nome amigável da pasta do grupo
 * @member fullPath Caminho organizacional completo (ex: "Trabalho/Clientes/Cliente-A")
 * @member subgroups Mapa contendo os subgrupos filhos indexados pelo nome
 * @member projects Lista de projetos pertencentes diretamente a este nível do grupo
 */
export interface ProjectGroup {
  name: string;
  fullPath: string;
  subgroups: Map<string, ProjectGroup>;
  projects: Project[];
}

/**
 * Tipo que define a classificação do nó da árvore lateral.
 */
export type TreeItemType = "root-favorites" | "root-projects" | "group" | "project";

/**
 * Escopo de visualização dos nós na árvore.
 */
export type TreeScope = "favorites" | "all";
