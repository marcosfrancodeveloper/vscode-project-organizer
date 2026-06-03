import { ProjectScanner } from "../../src/services/scanner.service";
import * as fs from "fs";
import * as path from "path";

jest.mock("fs", () => {
  return {
    existsSync: jest.fn(),
    promises: {
      readdir: jest.fn()
    }
  };
});

class MockDirent {
  constructor(private readonly _name: string, private readonly _isDir: boolean) {}
  get name() {
    return this._name;
  }
  isDirectory() {
    return this._isDir;
  }
  isFile() {
    return !this._isDir;
  }
}

describe("ProjectScanner", () => {
  let scanner: ProjectScanner;
  const mockedExistsSync = fs.existsSync as jest.Mock;
  const mockedReaddir = fs.promises.readdir as jest.Mock;

  beforeEach(() => {
    scanner = new ProjectScanner();
    jest.clearAllMocks();
  });

  it("should return empty list if base path does not exist", async () => {
    mockedExistsSync.mockReturnValue(false);
    const result = await scanner.scan("/non-existent", 3, []);
    expect(result).toEqual([]);
  });

  it("should detect a project at the root level", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReaddir.mockResolvedValue([
      new MockDirent(".git", true),
      new MockDirent("src", true)
    ]);

    const result = await scanner.scan("/projects/my-project", 3, []);
    expect(result).toEqual([
      {
        name: "my-project",
        path: "/projects/my-project",
        group: undefined
      }
    ]);
  });

  it("should scan subfolders recursively and detect projects", async () => {
    mockedExistsSync.mockReturnValue(true);

    // First call for root path: returns subgroups client-a and client-b
    mockedReaddir.mockImplementation((dirPath: string) => {
      const resolved = path.resolve(dirPath);
      if (resolved === path.resolve("/projects")) {
        return Promise.resolve([
          new MockDirent("client-a", true),
          new MockDirent("client-b", true)
        ]);
      }
      if (resolved === path.resolve("/projects/client-a")) {
        return Promise.resolve([
          new MockDirent("project-1", true),
          new MockDirent("project-2", true)
        ]);
      }
      if (resolved === path.resolve("/projects/client-a/project-1")) {
        return Promise.resolve([
          new MockDirent(".git", true)
        ]);
      }
      if (resolved === path.resolve("/projects/client-a/project-2")) {
        return Promise.resolve([
          new MockDirent("package.json", false)
        ]);
      }
      if (resolved === path.resolve("/projects/client-b")) {
        return Promise.resolve([
          new MockDirent(".git", true) // client-b is a project itself
        ]);
      }
      return Promise.resolve([]);
    });

    const result = await scanner.scan("/projects", 3, ["node_modules"]);

    expect(result).toEqual([
      {
        name: "project-1",
        path: path.resolve("/projects/client-a/project-1"),
        group: "client-a"
      },
      {
        name: "project-2",
        path: path.resolve("/projects/client-a/project-2"),
        group: "client-a"
      },
      {
        name: "client-b",
        path: path.resolve("/projects/client-b"),
        group: undefined
      }
    ]);
  });

  it("should respect maxDepth and not go beyond it", async () => {
    mockedExistsSync.mockReturnValue(true);

    mockedReaddir.mockImplementation((dirPath: string) => {
      const resolved = path.resolve(dirPath);
      if (resolved === path.resolve("/projects")) {
        return Promise.resolve([new MockDirent("depth-1", true)]);
      }
      if (resolved === path.resolve("/projects/depth-1")) {
        return Promise.resolve([new MockDirent("depth-2", true)]);
      }
      if (resolved === path.resolve("/projects/depth-1/depth-2")) {
        return Promise.resolve([new MockDirent(".git", true)]);
      }
      return Promise.resolve([]);
    });

    // maxDepth = 2
    // /projects -> depth 1
    // /projects/depth-1 -> depth 2 (readdir is called)
    // /projects/depth-1/depth-2 -> depth 3 (walk depth > maxDepth, returns immediately)
    const result = await scanner.scan("/projects", 2, []);
    expect(result).toEqual([]);
  });

  it("should ignore directories that are in ignoredFolders list", async () => {
    mockedExistsSync.mockReturnValue(true);

    mockedReaddir.mockImplementation((dirPath: string) => {
      const resolved = path.resolve(dirPath);
      if (resolved === path.resolve("/projects")) {
        return Promise.resolve([
          new MockDirent("node_modules", true),
          new MockDirent("my-app", true)
        ]);
      }
      if (resolved === path.resolve("/projects/my-app")) {
        return Promise.resolve([new MockDirent(".git", true)]);
      }
      return Promise.resolve([]);
    });

    const result = await scanner.scan("/projects", 3, ["node_modules"]);
    expect(result).toEqual([
      {
        name: "my-app",
        path: path.resolve("/projects/my-app"),
        group: undefined
      }
    ]);
    expect(mockedReaddir).not.toHaveBeenCalledWith(expect.stringContaining("node_modules"));
  });
});
