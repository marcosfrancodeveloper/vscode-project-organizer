import { exec } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { GitStatus } from "../interfaces/models.interface";
import { IGitService } from "../interfaces/services.interface";

/**
 * Serviço responsável por monitorar o status do controle de versão Git nos repositórios locais.
 * Implementa a interface IGitService.
 */
export class GitService implements IGitService {
  /**
   * Executa internamente comandos Git usando subprocessos de forma segura.
   * @param gitDirPath Diretório raiz do repositório Git.
   * @param args Argumentos que compõem o comando Git (ex: ["status", "--porcelain"]).
   * @param timeout Limite de tempo em milissegundos para forçar o encerramento do processo.
   * @returns Retorno formatado do stdout do comando executado.
   */
  private runGitCommand(
    gitDirPath: string,
    args: string[],
    timeout = 2000
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const command = `git ${args.join(" ")}`;
      exec(
        command,
        {
          cwd: gitDirPath,
          timeout: timeout,
        },
        (error, stdout, _stderr) => {
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
   * Verifica se o diretório do projeto possui um repositório Git inicializado.
   */
  public isGitRepository(projectPath: string): boolean {
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
   * Executa comandos assíncronos para obter o status atual do Git em um repositório.
   */
  public async getStatus(projectPath: string): Promise<GitStatus | null> {
    if (!this.isGitRepository(projectPath)) {
      return null;
    }

    try {
      // 1. Obter a branch atual (com fallback para detached HEAD)
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
      } catch {
        // Ignora erros
      }

      // 3. Verificar se há commits pendentes de envio para o remoto
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
        // Se falhar (ex: branch sem upstream remoto), unpushed permanece 0
        unpushed = 0;
      }

      return {
        branch,
        isDirty,
        unpushed: unpushed > 0 ? unpushed : undefined,
        lastChecked: Date.now(),
      };
    } catch (err) {
      // Erro severo retorna null
      return null;
    }
  }
}
