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
      expect(projects[0].name).toBe("Sipol Portal Web");
    });

    it("should read, parse and flatten nested JSON project structure", async () => {
      mockedExistsSync.mockReturnValue(true);
      const mockNestedData = {
        "Corporativo": {
          "PoliciaCivil": {
            "Sipol Web": {
              "id": "sipol-id",
              "path": "/paths/sipol",
              "notes": "Sipol Notes",
              "lastAccessed": 1234567890
            }
          }
        },
        "Personal": {
          "My Project": {
            "id": "my-id",
            "path": "/paths/my-project",
            "lastAccessed": 9876543210
          }
        }
      };

      mockedReadFile.mockResolvedValue(JSON.stringify(mockNestedData));

      const projects = await storageService.getProjects();

      expect(projects).toEqual([
        {
          id: "sipol-id",
          name: "Sipol Web",
          path: path.resolve("/paths/sipol"),
          group: "Corporativo/PoliciaCivil",
          notes: "Sipol Notes",
          lastAccessed: 1234567890
        },
        {
          id: "my-id",
          name: "My Project",
          path: path.resolve("/paths/my-project"),
          group: "Personal",
          notes: undefined,
          lastAccessed: 9876543210
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
          group: "LegacyGroup",
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

      const projectsToSave = [
        {
          id: "sipol-id",
          name: "Sipol Web",
          path: "/paths/sipol",
          group: "Corporativo/PoliciaCivil",
          notes: "Sipol Notes",
          lastAccessed: 1234567890
        },
        {
          id: "my-id",
          name: "My Project",
          path: "/paths/my-project",
          group: undefined,
          lastAccessed: 9876543210
        }
      ];

      await storageService.saveProjects(projectsToSave);

      expect(mockedWriteFile).toHaveBeenCalled();
      const writtenContent = JSON.parse(mockedWriteFile.mock.calls[0][1]);

      expect(writtenContent).toEqual({
        "Corporativo": {
          "PoliciaCivil": {
            "Sipol Web": {
              "id": "sipol-id",
              "path": "/paths/sipol",
              "notes": "Sipol Notes",
              "lastAccessed": 1234567890
            }
          }
        },
        "My Project": {
          "id": "my-id",
          "path": "/paths/my-project",
          "lastAccessed": 9876543210
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
      expect(newProject.group).toBe("MyGroup");
      expect(newProject.path).toBe(path.resolve("/path/new"));
      expect(mockedWriteFile).toHaveBeenCalled();
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
});
