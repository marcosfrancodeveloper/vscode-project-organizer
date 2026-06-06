import * as fs from "fs";
import * as path from "path";
import { IProjectScanner } from "../interfaces/services.interface";

/**
 * Serviço que escaneia diretórios físicos à procura de marcações de projeto (ex: .git, package.json)
 * @implements IProjectScanner
 */
export class ProjectScanner implements IProjectScanner {
  /**
   * Varre um caminho recursivamente procurando marcadores de projetos
   * @param basePath Caminho base para iniciar a varredura
   * @param maxDepth Profundidade máxima de recursão
   * @param ignoredFolders Array de pastas a serem ignoradas
   * @returns Array de projetos encontrados
   */
  public async scan(
    basePath: string,
    maxDepth: number,
    ignoredFolders: string[]
  ): Promise<{ name: string; path: string; groupPath?: string }[]> {
    const projects: { name: string; path: string; groupPath?: string }[] = [];
    const resolvedBase = path.resolve(basePath);

    if (!fs.existsSync(resolvedBase)) {
      return [];
    }

    const ignoredSet = new Set(ignoredFolders);

    /**
     * Função recursiva de leitura interna de pastas locais.
     */
    const walk = async (currentPath: string, depth: number) => {
      if (depth > maxDepth) {
        return;
      }

      try {
        const entries = await fs.promises.readdir(currentPath, {
          withFileTypes: true,
        });

        // 1. Verificar se o próprio diretório atual é um projeto
        let isProject = false;
        const projectName = path.basename(currentPath);

        const hasGit = entries.some(
          (e) => e.isDirectory() && e.name === ".git"
        );
        const hasPackageJson = entries.some(
          (e) => e.isFile() && e.name === "package.json"
        );
        const hasProjectile = entries.some(
          (e) => e.isFile() && e.name === ".projectile"
        );

        if (hasGit || hasPackageJson || hasProjectile) {
          isProject = true;
        }

        if (isProject) {
          // Calcula o grupo a partir do caminho relativo ao basePath
          let groupPath: string | undefined = undefined;
          const relative = path.relative(resolvedBase, currentPath);
          const parentDir = path.dirname(relative);

          if (parentDir && parentDir !== "." && parentDir !== "") {
            // Normaliza as barras para padrão barra normal
            groupPath = parentDir.split(path.sep).join("/");
          }

          projects.push({
            name: projectName,
            path: currentPath,
            groupPath: groupPath,
          });

          // Se é um projeto, interrompe a recursão nesta ramificação
          return;
        }

        // 2. Se não for projeto, continua escaneando os subdiretórios recursivamente
        for (const entry of entries) {
          if (entry.isDirectory() && !ignoredSet.has(entry.name)) {
            const nextPath = path.join(currentPath, entry.name);
            await walk(nextPath, depth + 1);
          }
        }
      } catch (err) {
        // Ignora erros de permissão de leitura de subdiretório
      }
    };

    await walk(resolvedBase, 1);
    return projects;
  }
}
