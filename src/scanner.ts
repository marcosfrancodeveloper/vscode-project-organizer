import * as fs from "fs";
import * as path from "path";
import { Project } from "./types";

export class ProjectScanner {
  /**
   * Varre recursivamente um caminho base à procura de diretórios de projetos.
   */
  public static async scan(
    basePath: string,
    maxDepth: number,
    ignoredFolders: string[]
  ): Promise<Omit<Project, "id" | "lastAccessed">[]> {
    const projects: Omit<Project, "id" | "lastAccessed">[] = [];
    const resolvedBase = path.resolve(basePath);

    if (!fs.existsSync(resolvedBase)) {
      return [];
    }

    const ignoredSet = new Set(ignoredFolders);

    async function walk(currentPath: string, depth: number) {
      if (depth > maxDepth) {
        return;
      }

      try {
        const entries = await fs.promises.readdir(currentPath, {
          withFileTypes: true,
        });

        // 1. Verificar se o próprio diretório atual é um projeto
        let isProject = false;
        let projectName = path.basename(currentPath);

        // Marcadores de projeto
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
          // Calcula o grupo a partir do caminho relativo em relação ao basePath
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
            group: groupPath,
          });

          // Se é um projeto, interrompe a recursão neste galho
          return;
        }

        // 2. Se não é projeto, continuar escaneando subdiretórios recursivamente
        for (const entry of entries) {
          if (entry.isDirectory() && !ignoredSet.has(entry.name)) {
            const nextPath = path.join(currentPath, entry.name);
            await walk(nextPath, depth + 1);
          }
        }
      } catch (err) {
        // Ignora erros de permissão ou leitura de diretório
      }
    }

    await walk(resolvedBase, 1);
    return projects;
  }
}
