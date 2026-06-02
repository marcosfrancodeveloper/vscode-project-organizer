import { exec } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { GitStatus } from "./types";

export class GitService {
  /**
   * Executa um comando do Git em um diretório e retorna o resultado.
   */
  private static runGitCommand(
    gitDirPath: string,
    args: string[],
    timeout = 2000
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Reconhece executável git
      const command = `git ${args.join(" ")}`;
      exec(
        command,
        {
          cwd: gitDirPath,
          timeout: timeout,
        },
        (error, stdout, stderr) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(stdout.trim());
        }
      );
    });
  }

  /**
   * Verifica se um diretório é um repositório Git ativo.
   */
  public static isGitRepository(projectPath: string): boolean {
    if (!projectPath || typeof projectPath !== "string") {
      return false;
    }
    try {
      const gitDir = path.join(projectPath, ".git");
      return fs.existsSync(gitDir);
    } catch {
      return false;
    }
  }

  /**
   * Obtém o status do Git de um repositório.
   */
  public static async getStatus(projectPath: string): Promise<GitStatus | null> {
    if (!this.isGitRepository(projectPath)) {
      return null;
    }

    try {
      // 1. Obter a branch atual (com fallback para detached head)
      let branch = "HEAD";
      try {
        branch = await this.runGitCommand(projectPath, [
          "symbolic-ref",
          "--short",
          "-q",
          "HEAD",
        ]);
      } catch {
        try {
          branch = await this.runGitCommand(projectPath, [
            "rev-parse",
            "--short",
            "HEAD",
          ]);
        } catch {
          branch = "Desconhecido";
        }
      }

      // 2. Verificar se há alterações não salvas (dirty state)
      let isDirty = false;
      try {
        const statusOutput = await this.runGitCommand(projectPath, [
          "status",
          "--porcelain",
        ]);
        isDirty = statusOutput.length > 0;
      } catch {}

      // 3. Verificar commits pendentes de envio (unpushed)
      let unpushed = 0;
      try {
        const unpushedOutput = await this.runGitCommand(projectPath, [
          "rev-list",
          "--count",
          "@{u}..HEAD",
        ]);
        unpushed = parseInt(unpushedOutput, 10);
        if (isNaN(unpushed)) {
          unpushed = 0;
        }
      } catch {
        // Se falhar (ex: não há remoto configurado), unpushed fica 0
        unpushed = 0;
      }

      return {
        branch,
        isDirty,
        unpushed: unpushed > 0 ? unpushed : undefined,
        lastChecked: Date.now(),
      };
    } catch (err) {
      // Qualquer erro severo retorna null
      return null;
    }
  }
}
