import { GitService } from "../../src/services/git.service";
import { exec } from "child_process";
import * as fs from "fs";

jest.mock("child_process");
jest.mock("fs");

describe("GitService", () => {
  let gitService: GitService;
  const mockedExec = exec as unknown as jest.Mock;
  const mockedExistsSync = fs.existsSync as jest.Mock;
  const mockedReadFileSync = fs.readFileSync as jest.Mock;
  const mockedStatSync = fs.statSync as jest.Mock;

  beforeEach(() => {
    gitService = new GitService();
    jest.clearAllMocks();

    // Comportamento padrão: .git é um diretório
    mockedStatSync.mockReturnValue({
      isDirectory: () => true,
      isFile: () => false,
    });
  });

  describe("isGitRepository", () => {
    it("should return false for invalid paths", () => {
      expect(gitService.isGitRepository("")).toBe(false);
      expect(gitService.isGitRepository(null as any)).toBe(false);
    });

    it("should return true if .git directory exists", () => {
      mockedExistsSync.mockReturnValue(true);
      expect(gitService.isGitRepository("/path/to/project")).toBe(true);
      expect(mockedExistsSync).toHaveBeenCalledWith(expect.stringContaining(".git"));
    });

    it("should return false if .git directory does not exist", () => {
      mockedExistsSync.mockReturnValue(false);
      expect(gitService.isGitRepository("/path/to/project")).toBe(false);
    });
  });

  describe("getStatus", () => {
    it("should return null if path is not a git repository", async () => {
      mockedExistsSync.mockReturnValue(false);
      const status = await gitService.getStatus("/path/to/project");
      expect(status).toBeNull();
    });

    it("should return status information for a clean repo with no unpushed commits", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue("ref: refs/heads/main\n");
      
      mockedExec.mockImplementation((cmd, _options, callback) => {
        if (cmd.includes("status --porcelain")) {
          callback(null, "", "");
        } else if (cmd.includes("rev-list")) {
          callback(null, "0\n", "");
        }
      });

      const status = await gitService.getStatus("/path/to/project");
      expect(status).toEqual({
        branch: "main",
        isDirty: false,
        unpushed: undefined,
        lastChecked: expect.any(Number)
      });
    });

    it("should return dirty and unpushed status correctly", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue("ref: refs/heads/feature/testing\n");
      
      mockedExec.mockImplementation((cmd, _options, callback) => {
        if (cmd.includes("status --porcelain")) {
          callback(null, " M src/index.ts\n?? tests/test.ts\n", "");
        } else if (cmd.includes("rev-list")) {
          callback(null, "3\n", "");
        }
      });

      const status = await gitService.getStatus("/path/to/project");
      expect(status).toEqual({
        branch: "feature/testing",
        isDirty: true,
        unpushed: 3,
        lastChecked: expect.any(Number)
      });
    });

    it("should parse detached HEAD commit hash correctly", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue("a1b2c3d4e5f67890\n");
      
      mockedExec.mockImplementation((cmd, _options, callback) => {
        if (cmd.includes("status --porcelain")) {
          callback(null, "", "");
        } else if (cmd.includes("rev-list")) {
          callback(null, "0\n", "");
        }
      });

      const status = await gitService.getStatus("/path/to/project");
      expect(status?.branch).toBe("a1b2c3d");
    });

    it("should handle error in rev-list and default unpushed to 0", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue("ref: refs/heads/main\n");
      
      mockedExec.mockImplementation((cmd, _options, callback) => {
        if (cmd.includes("status --porcelain")) {
          callback(null, "", "");
        } else if (cmd.includes("rev-list")) {
          callback(new Error("no upstream"), "", "");
        }
      });

      const status = await gitService.getStatus("/path/to/project");
      expect(status).toEqual({
        branch: "main",
        isDirty: false,
        unpushed: undefined,
        lastChecked: expect.any(Number)
      });
    });

    it("should support git worktrees by reading gitdir pointer", async () => {
      mockedExistsSync.mockImplementation((p) => {
        if (p.includes(".git")) { return true; }
        if (p.includes("real_git_dir")) { return true; }
        return false;
      });
      mockedStatSync.mockReturnValue({
        isDirectory: () => false,
        isFile: () => true,
      });
      mockedReadFileSync.mockImplementation((p) => {
        if (p.endsWith(".git")) {
          return "gitdir: /path/to/real_git_dir";
        }
        if (p.endsWith("HEAD")) {
          return "ref: refs/heads/worktree-branch\n";
        }
        return "";
      });

      const status = await gitService.getStatus("/path/to/worktree");
      expect(status?.branch).toBe("worktree-branch");
    });
  });
});
