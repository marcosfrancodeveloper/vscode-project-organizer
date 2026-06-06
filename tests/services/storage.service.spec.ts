import { StorageService } from "../../src/services/storage.service";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

jest.mock("fs", () => {
  return {
    existsSync: jest.fn(),
    promises: {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      mkdir: jest.fn()
    }
  };
});

describe("StorageService", () => {
  let storageService: StorageService;
  let mockContext: vscode.ExtensionContext;
  let mockConfigGet: jest.Mock;
  const mockedExistsSync = fs.existsSync as jest.Mock;
  const mockedReadFile = fs.promises.readFile as jest.Mock;
  const mockedWriteFile = fs.promises.writeFile as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
      globalStorageUri: vscode.Uri.file("/mock/globalStorage"),
      globalState: {
        get: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined)
      }
    } as unknown as vscode.ExtensionContext;

    mockConfigGet = jest.fn().mockReturnValue("");
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: mockConfigGet
    });

    storageService = new StorageService(mockContext);
  });

  describe("getProjectsFilePath", () => {
    it("should return default globalStorage path if customProjectsFile is not configured", () => {
      mockConfigGet.mockReturnValue("");
      const filePath = storageService.getProjectsFilePath();
      expect(filePath).toBe(path.join("/mock/globalStorage", "projects.json"));
    });

    it("should return custom path if customProjectsFile is configured", () => {
      mockConfigGet.mockReturnValue("/custom/path/projects.json");
      const filePath = storageService.getProjectsFilePath();
      expect(filePath).toBe(path.resolve("/custom/path/projects.json"));
    });

    it("should resolve home directory shortcut ~/ correctly", () => {
      const originalHome = process.env.HOME;
      process.env.HOME = "/user/home";
      mockConfigGet.mockReturnValue("~/my-projects.json");

      const filePath = storageService.getProjectsFilePath();
      expect(filePath).toBe(path.join("/user/home", "my-projects.json"));

      process.env.HOME = originalHome;
    });
  });

  describe("getProjects and parsing", () => {
    it("should return default templates if no projects are stored and no legacy extensions exist", async () => {
      mockedExistsSync.mockReturnValue(false);
      mockContext.globalState.get = jest.fn().mockReturnValue(undefined);

      const projects = await storageService.getProjects();
      expect(projects.length).toBeGreaterThan(0);
      expect(projects[0].name).toBe("Prime Portal Web");
    });

    it("should read, parse and flatten nested JSON project structure", async () => {
      mockedExistsSync.mockReturnValue(true);
      const mockNestedData = {
        "DivisaoA": {
          "Prime Web": {
            "id": "prime-id",
            "path": "/paths/prime-app",
            "notes": "Prime Notes",
            "lastAccessed": 1234567890
          }
        },
        "Personal": {
          "My Project": {
            "id": "my-id",
            "path": "/paths/my-project",
            "lastAccessed": 9876543210
          }
        },
        "Deprecated": {
          "Old Project": {
            "id": "old-id",
            "path": "/paths/old-project",
            "lastAccessed": 1111,
            "deprecated": true
          }
        }
      };

      mockedReadFile.mockResolvedValue(JSON.stringify(mockNestedData));

      const projects = await storageService.getProjects();

      expect(projects).toEqual([
        {
          id: "prime-id",
          name: "Prime Web",
          path: path.resolve("/paths/prime-app"),
          notes: "Prime Notes",
          lastAccessed: 1234567890,
          deprecated: undefined
        },
        {
          id: "my-id",
          name: "My Project",
          path: path.resolve("/paths/my-project"),
          notes: undefined,
          lastAccessed: 9876543210,
          deprecated: undefined
        },
        {
          id: "old-id",
          name: "Old Project",
          path: path.resolve("/paths/old-project"),
          notes: undefined,
          lastAccessed: 1111,
          deprecated: true
        }
      ]);
    });

    it("should migrate legacy globalState projects if physical file does not exist", async () => {
      mockedExistsSync.mockReturnValue(false);

      const legacyProjects = [
        {
          id: "legacy-id",
          name: "Legacy Project",
          path: "/paths/legacy",
          group: "LegacyGroup",
          lastAccessed: 1111111111
        }
      ];
      mockContext.globalState.get = jest.fn().mockReturnValue(legacyProjects);

      const projects = await storageService.getProjects();

      expect(projects).toEqual([
        {
          id: "legacy-id",
          name: "Legacy Project",
          path: path.resolve("/paths/legacy"),
          lastAccessed: 1111111111
        }
      ]);
      expect(mockContext.globalState.update).toHaveBeenCalledWith("projectOrganizer.projects", undefined);
      expect(mockedWriteFile).toHaveBeenCalled();
    });
  });

  describe("saveProjects and serialization", () => {
    it("should structure projects into nested layout and write to file", async () => {
      mockedExistsSync.mockReturnValue(true); // Directory exists
      mockedReadFile.mockResolvedValue(JSON.stringify({})); // Garante árvore inicial vazia no mock do arquivo físico

      const projectsToSave = [
        {
          id: "prime-id",
          name: "Prime Web",
          path: "/paths/prime-app",
          notes: "Prime Notes",
          lastAccessed: 1234567890
        },
        {
          id: "my-id",
          name: "My Project",
          path: "/paths/my-project",
          lastAccessed: 9876543210
        },
        {
          id: "old-id",
          name: "Old Project",
          path: "/paths/old-project",
          lastAccessed: 1111,
          deprecated: true
        }
      ];

      await storageService.saveProjects(projectsToSave);

      expect(mockedWriteFile).toHaveBeenCalled();
      const writtenContent = JSON.parse(mockedWriteFile.mock.calls[0][1]);

      expect(writtenContent).toEqual({
        "Prime Web": {
          "id": "prime-id",
          "path": "/paths/prime-app",
          "notes": "Prime Notes",
          "lastAccessed": 1234567890
        },
        "My Project": {
          "id": "my-id",
          "path": "/paths/my-project",
          "lastAccessed": 9876543210
        },
        "Old Project": {
          "id": "old-id",
          "path": "/paths/old-project",
          "lastAccessed": 1111,
          "deprecated": true
        }
      });
    });
  });

  describe("addProject", () => {
    it("should add a project if it does not already exist", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFile.mockResolvedValue(JSON.stringify({})); // Empty registry

      const newProject = await storageService.addProject("New Project", "/path/new", "MyGroup");

      expect(newProject.name).toBe("New Project");
      expect(newProject.path).toBe(path.resolve("/path/new"));
      expect(mockedWriteFile).toHaveBeenCalled();
      const writtenContent = JSON.parse(mockedWriteFile.mock.calls[0][1]);
      expect(writtenContent["MyGroup"]["New Project"]).toBeDefined();
    });

    it("should throw an error if the project path already exists", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFile.mockResolvedValue(JSON.stringify({
        "Existing Project": {
          "id": "existing-id",
          "path": "/path/existing",
          "lastAccessed": 123
        }
      }));

      await expect(
        storageService.addProject("Duplicate Project", "/path/existing")
      ).rejects.toThrow("Project already exists");
    });
  });

  describe("updateProject", () => {
    it("should merge project updates successfully", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFile.mockResolvedValue(JSON.stringify({
        "Target Project": {
          "id": "target-id",
          "path": "/path/target",
          "notes": "old notes",
          "lastAccessed": 123
        }
      }));

      await storageService.updateProject("target-id", {
        notes: "new notes",
        group: "NewGroup"
      });

      expect(mockedWriteFile).toHaveBeenCalled();
      const writtenContent = JSON.parse(mockedWriteFile.mock.calls[0][1]);
      expect(writtenContent["NewGroup"]["Target Project"].notes).toBe("new notes");
    });

    it("should retain its original group if group is not updated", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFile.mockResolvedValue(JSON.stringify({
        "SomeGroup": {
          "Target Project": {
            "id": "target-id",
            "path": "/path/target",
            "notes": "old notes",
            "lastAccessed": 123
          }
        }
      }));

      await storageService.updateProject("target-id", {
        notes: "new notes"
      });

      expect(mockedWriteFile).toHaveBeenCalled();
      const writtenContent = JSON.parse(mockedWriteFile.mock.calls[0][1]);
      expect(writtenContent["SomeGroup"]["Target Project"].notes).toBe("new notes");
      expect(writtenContent["Target Project"]).toBeUndefined();
    });

    it("should throw if target project ID does not exist", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFile.mockResolvedValue(JSON.stringify({}));

      await expect(
        storageService.updateProject("non-existent-id", { notes: "test" })
      ).rejects.toThrow("Project not found.");
    });
  });

  describe("removeProject", () => {
    it("should remove project by ID and save remaining projects", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFile.mockResolvedValue(JSON.stringify({
        "Keep Me": {
          "id": "keep-id",
          "path": "/path/keep",
          "lastAccessed": 123
        },
        "Remove Me": {
          "id": "remove-id",
          "path": "/path/remove",
          "lastAccessed": 456
        }
      }));

      await storageService.removeProject("remove-id");

      expect(mockedWriteFile).toHaveBeenCalled();
      const writtenContent = JSON.parse(mockedWriteFile.mock.calls[0][1]);
      expect(writtenContent["Keep Me"]).toBeDefined();
      expect(writtenContent["Remove Me"]).toBeUndefined();
    });
  });

  describe("reorderProjects", () => {
    it("should set sequential positions of sibling projects and save", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFile.mockResolvedValue(JSON.stringify({
        "GroupA": {
          "Proj1": {
            "id": "proj1-id",
            "path": "/path/proj1",
            "lastAccessed": 123
          },
          "Proj2": {
            "id": "proj2-id",
            "path": "/path/proj2",
            "lastAccessed": 456
          }
        }
      }));

      // Reordena Proj2 para vir ANTES do Proj1
      await storageService.reorderProjects("proj2-id", "proj1-id");

      expect(mockedWriteFile).toHaveBeenCalled();
      const writtenContent = JSON.parse(mockedWriteFile.mock.calls[0][1]);
      
      // Proj2 deve ter position: 1, Proj1 deve ter position: 2
      expect(writtenContent["GroupA"]["Proj2"].position).toBe(1);
      expect(writtenContent["GroupA"]["Proj1"].position).toBe(2);
    });
  });

  describe("pastas vazias e multinivel", () => {
    it("should parse and write empty folder configurations correctly", async () => {
      mockedExistsSync.mockReturnValue(true);
      const mockNestedData = {
        "EDS": {},
        "GroupA": {
          "Proj1": {
            "id": "proj1-id",
            "path": "/path/proj1",
            "lastAccessed": 123
          }
        }
      };

      mockedReadFile.mockResolvedValue(JSON.stringify(mockNestedData));

      // Lê a árvore
      const tree = await storageService.getProjectsTree();
      expect(tree.length).toBe(2);
      expect(tree[0].name).toBe("EDS");
      expect((tree[0] as any).isFolder).toBe(true);
      expect((tree[0] as any).children.length).toBe(0);

      // Salva de volta a árvore e garante a preservação do grupo vazio
      await storageService.saveProjectsTree(tree);
      expect(mockedWriteFile).toHaveBeenCalled();
      const writtenContent = JSON.parse(mockedWriteFile.mock.calls[0][1]);
      expect(writtenContent["EDS"]).toEqual({});
      expect(writtenContent["GroupA"]["Proj1"]).toBeDefined();
    });

    it("should parse and write deeply nested multi-level directories (5 levels) correctly", async () => {
      mockedExistsSync.mockReturnValue(true);
      const mockDeepData = {
        "Level1": {
          "Level2": {
            "Level3": {
              "Level4": {
                "Level5": {
                  "Deep Project": {
                    "id": "deep-id",
                    "path": "/path/deep",
                    "lastAccessed": 9999
                  }
                }
              }
            }
          }
        }
      };

      mockedReadFile.mockResolvedValue(JSON.stringify(mockDeepData));

      // Lê e valida árvore de múltiplos níveis
      const tree = await storageService.getProjectsTree();
      expect(tree.length).toBe(1);
      
      let current: any = tree[0];
      for (let i = 1; i <= 5; i++) {
        expect(current.isFolder).toBe(true);
        expect(current.name).toBe(`Level${i}`);
        expect(current.children.length).toBe(1);
        current = current.children[0];
      }

      // Último filho deve ser o projeto físico "Deep Project"
      expect(current.isFolder).toBeUndefined();
      expect(current.name).toBe("Deep Project");
      expect(current.path).toBe("/path/deep");

      // Salva de volta
      await storageService.saveProjectsTree(tree);
      expect(mockedWriteFile).toHaveBeenCalled();
      const writtenContent = JSON.parse(mockedWriteFile.mock.calls[0][1]);
      expect(writtenContent["Level1"]["Level2"]["Level3"]["Level4"]["Level5"]["Deep Project"]).toBeDefined();
    });

    it("should resolve the correct group path of a project in deeply nested levels", async () => {
      mockedExistsSync.mockReturnValue(true);
      const mockDeepData = {
        "Level1": {
          "Level2": {
            "Deep Project": {
              "id": "deep-id",
              "path": "/path/deep",
              "lastAccessed": 9999
            }
          }
        }
      };

      mockedReadFile.mockResolvedValue(JSON.stringify(mockDeepData));

      const groupPath = await storageService.getProjectGroupPath("deep-id");
      expect(groupPath).toBe("Level1/Level2");
    });
  });

  describe("updateGroupPosition", () => {
    it("should recursively find a group by path and set its position", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFile.mockResolvedValue(JSON.stringify({
        "Level1": {
          "Level2": {
            "Proj1": {
              "id": "proj1-id",
              "path": "/path/proj1",
              "lastAccessed": 123
            }
          }
        }
      }));

      await storageService.updateGroupPosition("Level1/Level2", 42);

      expect(mockedWriteFile).toHaveBeenCalled();
      const writtenContent = JSON.parse(mockedWriteFile.mock.calls[0][1]);
      expect(writtenContent["Level1"]["Level2"]["$position"]).toBe(42);
    });

    it("should throw if the group path cannot be resolved", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFile.mockResolvedValue(JSON.stringify({}));

      await expect(
        storageService.updateGroupPosition("NonExistent/Group", 5)
      ).rejects.toThrow("Group not found.");
    });
  });
});
