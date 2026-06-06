import { exec } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { GitStatus } from "../interfaces/models.interface";
import { IGitService } from "../interfaces/services.interface";

/**
 * Serviço responsável por monitorar o status do controle de versão Git nos repositórios locais
 * @implements IGitService
 */
export class GitService implements IGitService {
  private _isGitAvailable = true;

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
      if (!this._isGitAvailable) {
        reject(new Error("Git is not available on this system."));
        return;
      }

      const command = `git ${args.join(" ")}`;
      exec(
        command,
        {
          cwd: gitDirPath,
          timeout: timeout,
        },
        (error, stdout, _stderr) => {
          if (error) {
            if ((error as any).code === "ENOENT") {
              this._isGitAvailable = false;
            }
            reject(error);
            return;
          }
          resolve(stdout.trim());
        }
      );
    });
  }

  /**
   * Resolve o caminho físico do diretório .git, lidando com repositórios comuns e worktrees.
   */
  private getGitDir(projectPath: string): string | null {
    try {
      const gitPath = path.join(projectPath, ".git");
      if (!fs.existsSync(gitPath)) {
        return null;
      }
      const stat = fs.statSync(gitPath);
      if (stat.isDirectory()) {
        return gitPath;
      } else if (stat.isFile()) {
        const content = fs.readFileSync(gitPath, "utf-8").trim();
        if (content.startsWith("gitdir: ")) {
          const gitDirPointer = content.substring(8).trim();
          const resolvedPath = path.isAbsolute(gitDirPointer)
            ? gitDirPointer
            : path.resolve(projectPath, gitDirPointer);
          if (fs.existsSync(resolvedPath)) {
            return resolvedPath;
          }
        }
      }
    } catch {
      // Ignora erros de leitura de arquivo ou permissão
    }
    return null;
  }

  /**
   * Verifica se o diretório do projeto possui um repositório Git inicializado
   * @param projectPath Caminho do projeto
   * @returns `true` se for um repositório Git, `false` caso contrário
   */
  public isGitRepository(projectPath: string): boolean {
    if (!projectPath || typeof projectPath !== "string") {
      return false;
    }
    return this.getGitDir(projectPath) !== null;
  }

  /**
   * Executa comandos assíncronos e leituras de arquivo para obter o status atual do Git em um repositório
   * @param projectPath Caminho do projeto
   * @returns Status do Git ou `null` se não for um repositório Git
   */
  public async getStatus(projectPath: string): Promise<GitStatus | null> {
    const gitDir = this.getGitDir(projectPath);
    if (!gitDir) {
      return null;
    }

    try {
      // 1. Obter a branch atual lendo o arquivo .git/HEAD de forma rápida e síncrona
      let branch = "Desconhecido";
      const headPath = path.join(gitDir, "HEAD");
      if (fs.existsSync(headPath)) {
        try {
          const headContent = fs.readFileSync(headPath, "utf-8").trim();
          if (headContent.startsWith("ref: ")) {
            const ref = headContent.substring(5).trim();
            if (ref.startsWith("refs/heads/")) {
              branch = ref.substring(11);
            } else {
              branch = ref.split("/").pop() || "HEAD";
            }
          } else if (headContent.length > 0) {
            // Detached HEAD, exibe hash curto
            branch = headContent.substring(0, 7);
          }
        } catch {
          branch = "Desconhecido";
        }
      }

      // 2. Verificar se há alterações não salvas (dirty state)
      let isDirty = false;
      if (this._isGitAvailable) {
        try {
          const statusOutput = await this.runGitCommand(projectPath, [
            "status",
            "--porcelain",
          ]);
          isDirty = statusOutput.length > 0;
        } catch {
          // Ignora erros de comando individuais
        }
      }

      // 3. Verificar se há commits pendentes de envio para o remoto
      let unpushed = 0;
      if (this._isGitAvailable) {
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
