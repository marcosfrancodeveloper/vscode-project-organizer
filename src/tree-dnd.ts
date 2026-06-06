import * as vscode from "vscode";
import { ProjectTreeItem } from "./tree-provider";
import { IStorageManager } from "./interfaces/services.interface";

/**
 * Controlador para gerenciar eventos de Arrastar e Soltar (Drag and Drop) na árvore de projetos.
 * Permite movimentação de projetos entre grupos, remoção de grupos ao soltar na raiz, e reordenação.
 * @implements vscode.TreeDragAndDropController<ProjectTreeItem>
 */
export class ProjectTreeDragAndDropController
  implements vscode.TreeDragAndDropController<ProjectTreeItem> {
  readonly dragMimeTypes = [
    "application/vnd.code.tree.projectOrganizer.projectsView",
  ];
  readonly dropMimeTypes = [
    "application/vnd.code.tree.projectOrganizer.projectsView",
  ];

  constructor(
    private readonly storage: IStorageManager,
    private readonly refreshCallback: () => void
  ) { }

  /**
   * Prepara o pacote de transferência com o item que está sendo arrastado
   */
  public handleDrag(
    source: readonly ProjectTreeItem[],
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    dataTransfer.set(
      "application/vnd.code.tree.projectOrganizer.projectsView",
      new vscode.DataTransferItem(source)
    );
  }

  /**
   * Processa o drop do item arrastado em cima de seu alvo correspondente
   */
  public async handleDrop(
    target: ProjectTreeItem | undefined,
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Promise<void> {
    const transferItem = dataTransfer.get(
      "application/vnd.code.tree.projectOrganizer.projectsView"
    );
    if (!transferItem) {
      return;
    }

    const sourceItems: ProjectTreeItem[] = transferItem.value;
    const draggedItem = sourceItems[0];

    // Só é permitido arrastar itens do tipo "project"
    if (!draggedItem || !draggedItem.project) {
      return;
    }

    const project = draggedItem.project;

    // Caso A: Solto no vácuo (raiz) -> Remove o projeto de seu grupo correspondente
    if (!target) {
      await this.storage.updateProject(project.id, {
        group: undefined,
        position: undefined, // Limpa posição forçada se for pra raiz
      });
      this.refreshCallback();
      return;
    }

    // Caso B: Solto em cima de um Grupo -> Altera o grupo do projeto
    if (target.type === "group" && target.fullGroupPath) {
      await this.storage.updateProject(project.id, {
        group: target.fullGroupPath,
        position: undefined, // Limpa posição para ir para o fim do novo grupo até ser reordenado
      });
      this.refreshCallback();
      return;
    }

    // Caso C: Solto em cima de outro Projeto -> Reordena ou muda de grupo
    if (target.type === "project" && target.project) {
      const targetProj = target.project;

      // Executa a reordenação no storage (o que altera opcionalmente o grupo e define as posições numéricas)
      await this.storage.reorderProjects(project.id, targetProj.id);
      this.refreshCallback();
    }
  }
}
