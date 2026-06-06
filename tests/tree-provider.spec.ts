import { ProjectTreeProvider, ProjectTreeItem } from "../src/tree-provider";
import { Project, ProjectGroup, ProjectRegistryNode } from "../src/interfaces/models.interface";
import { IStorageManager, IGitService } from "../src/interfaces/services.interface";
import * as vscode from "vscode";

describe("ProjectTreeProvider", () => {
  let mockStorage: jest.Mocked<IStorageManager>;
  let mockGit: jest.Mocked<IGitService>;
  let provider: ProjectTreeProvider;
  let providers: ProjectTreeProvider[];
  let mockConfigGet: jest.Mock;

  beforeEach(() => {
    mockStorage = {
      getProjects: jest.fn(),
      getProjectsTree: jest.fn(),
      saveProjectsTree: jest.fn(),
      saveProjects: jest.fn(),
      addProject: jest.fn(),
      removeProject: jest.fn(),
      updateProject: jest.fn(),
      reorderProjects: jest.fn(),
      getProjectsFilePath: jest.fn(),
      getProjectGroupPath: jest.fn()
    } as any;

    const buildTreeFromFlatList = (projects: Project[]): ProjectRegistryNode[] => {
      const root: ProjectRegistryNode[] = [];
      const findOrCreateGroup = (nodes: ProjectRegistryNode[], groupName: string): ProjectGroup => {
        const parts = groupName.split("/");
        let currentLevel = nodes;
        let targetGroup: ProjectGroup | undefined;

        for (const part of parts) {
          const trimmed = part.trim();
          let found = currentLevel.find(
            (n) => "isFolder" in n && n.isFolder && n.name === trimmed
          ) as ProjectGroup | undefined;

          if (!found) {
            found = {
              name: trimmed,
              isFolder: true,
              children: [],
            };
            currentLevel.push(found);
          }
          targetGroup = found;
          currentLevel = found.children;
        }

        return targetGroup!;
      };

      for (const p of projects) {
        const newProj = { ...p } as any;
        if (newProj.group) {
          const groupNode = findOrCreateGroup(root, newProj.group);
          groupNode.children.push(newProj);
        } else {
          root.push(newProj);
        }
      }

      return root;
    };

    mockStorage.getProjectsTree.mockImplementation(async () => {
      const flat = await mockStorage.getProjects();
      return buildTreeFromFlatList(flat);
    });

    mockStorage.getProjectGroupPath.mockImplementation(async (projectId: string) => {
      const flat = await mockStorage.getProjects();
      const p = flat.find((x) => x.id === projectId) as any;
      return p?.group;
    });

    mockGit = {
      isGitRepository: jest.fn().mockReturnValue(false),
      getStatus: jest.fn().mockResolvedValue(null)
    } as any;

    mockConfigGet = jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      if (key === "showDeprecated") return true;
      if (key === "sortBy") return "name";
      if (key === "sortOrder") return "asc";
      if (key === "treeExpanded") return false;
      return defaultValue;
    });

    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: mockConfigGet
    });

    providers = [];
    provider = new ProjectTreeProvider(mockStorage, mockGit);
    providers.push(provider);
  });

  afterEach(() => {
    providers.forEach((p) => p.dispose());
  });

  describe("getChildren", () => {
    it("should return empty array (empty state) when element is undefined and no projects exist", async () => {
      mockStorage.getProjects.mockResolvedValue([]);
      const roots = await provider.getChildren();
      expect(roots.length).toBe(0);
    });

    it("should return favorite projects directly for favorites scope", async () => {
      const favProvider = new ProjectTreeProvider(mockStorage, mockGit, "favorites");
      providers.push(favProvider);
      mockStorage.getProjects.mockResolvedValue([
        { id: "1", name: "Fav Project", path: "/path/fav", lastAccessed: 100, favorite: true },
        { id: "2", name: "Non Fav", path: "/path/non", lastAccessed: 200 }
      ]);
      const children = await favProvider.getChildren();
      expect(children.length).toBe(1);
      expect(children[0].label).toBe("Fav Project");
    });

    it("should return list of groups and root-level projects directly for All Projects view root", async () => {
      const mockProjects = [
        { id: "1", name: "Project B", path: "/path/b", lastAccessed: 100 },
        { id: "2", name: "Project A", path: "/path/a", lastAccessed: 200, group: "Group X" },
        { id: "3", name: "Project C", path: "/path/c", lastAccessed: 300, group: "Group Y" }
      ] as any as Project[];
      mockStorage.getProjects.mockResolvedValue(mockProjects);

      const children = await provider.getChildren();

      // Deve ter: 2 grupos (Group X, Group Y) e 1 projeto raiz (Project B)
      expect(children.length).toBe(3);
      expect(children[0].label).toBe("Group X");
      expect(children[0].type).toBe("group");
      expect(children[1].label).toBe("Group Y");
      expect(children[1].type).toBe("group");
      expect(children[2].label).toBe("Project B");
      expect(children[2].type).toBe("project");
    });

    it("should sort groups and projects correctly including position pinning", async () => {
      const mockProjects: Project[] = [
        { id: "1", name: "Unpinned B", path: "/path/b", lastAccessed: 100 },
        { id: "2", name: "Unpinned A", path: "/path/a", lastAccessed: 200 },
        { id: "3", name: "Pinned First", path: "/path/pf", lastAccessed: 50, position: 1 },
        { id: "4", name: "Pinned Second", path: "/path/ps", lastAccessed: 300, position: 2 }
      ];
      mockStorage.getProjects.mockResolvedValue(mockProjects);

      const children = await provider.getChildren();

      expect(children.length).toBe(4);
      expect(children[0].label).toBe("Pinned First");
      expect(children[1].label).toBe("Pinned Second");
      expect(children[2].label).toBe("Unpinned A");
      expect(children[3].label).toBe("Unpinned B");
    });

    it("should display favorites correctly under Favorites view root", async () => {
      const favProvider = new ProjectTreeProvider(mockStorage, mockGit, "favorites");
      providers.push(favProvider);
      const mockProjects: Project[] = [
        { id: "1", name: "Fav B", path: "/path/b", lastAccessed: 100, favorite: true },
        { id: "2", name: "Non Fav", path: "/path/a", lastAccessed: 200 },
        { id: "3", name: "Fav A", path: "/path/c", lastAccessed: 300, favorite: true, position: 1 }
      ];
      mockStorage.getProjects.mockResolvedValue(mockProjects);

      const children = await favProvider.getChildren();

      expect(children.length).toBe(2);
      expect(children[0].label).toBe("Fav A");
      expect(children[1].label).toBe("Fav B");
    });

    it("should render deprecated projects with strikethrough in their labels", async () => {
      const mockProjects: Project[] = [
        { id: "1", name: "Deprecated Project", path: "/path/dep", lastAccessed: 100, deprecated: true }
      ];
      mockStorage.getProjects.mockResolvedValue(mockProjects);

      const children = await provider.getChildren();

      expect(children.length).toBe(1);
      const expectedLabel = "Deprecated Project".split("").map((c) => c + "\u0336").join("");
      expect(children[0].label).toBe(expectedLabel);
    });

    it("should render subgroups and subprojects recursively for group nodes", async () => {
      const mockProjects = [
        { id: "1", name: "Sub Project A", path: "/path/sub-a", lastAccessed: 100, group: "EDS/Subgrupo" }
      ] as any as Project[];
      mockStorage.getProjects.mockResolvedValue(mockProjects);

      const tree = await mockStorage.getProjectsTree();
      expect(tree.length).toBe(1);
      const edsGroupNode = tree[0] as ProjectGroup;
      expect(edsGroupNode.name).toBe("EDS");
      expect(edsGroupNode.children.length).toBe(1);

      const edsTreeItem = new ProjectTreeItem("EDS", vscode.TreeItemCollapsibleState.Expanded, "group", undefined, edsGroupNode, "EDS");
      const edsChildren = await provider.getChildren(edsTreeItem);

      expect(edsChildren.length).toBe(1);
      expect(edsChildren[0].label).toBe("Subgrupo");
      expect(edsChildren[0].type).toBe("group");
      expect(edsChildren[0].groupNode).toBeDefined();

      const subGroupTreeItem = edsChildren[0];
      const subGroupChildren = await provider.getChildren(subGroupTreeItem);

      expect(subGroupChildren.length).toBe(1);
      expect(subGroupChildren[0].label).toBe("Sub Project A");
      expect(subGroupChildren[0].type).toBe("project");
    });

    it("should sort group folders by position", async () => {
      const mockProjectsTree: ProjectRegistryNode[] = [
        {
          name: "Group B",
          isFolder: true,
          position: 2,
          children: []
        },
        {
          name: "Group C",
          isFolder: true,
          position: 1,
          children: []
        },
        {
          name: "Group A",
          isFolder: true,
          children: []
        }
      ];

      mockStorage.getProjectsTree.mockResolvedValue(mockProjectsTree);
      mockStorage.getProjects.mockResolvedValue([]);

      const children = await provider.getChildren();

      expect(children.length).toBe(3);
      expect(children[0].label).toBe("Group C");
      expect(children[1].label).toBe("Group B");
      expect(children[2].label).toBe("Group A");
    });

    it("should display the position label [X] in description in getTreeItem", () => {
      const project: Project = {
        id: "1",
        name: "Project Test",
        path: "/path/test",
        lastAccessed: 100,
        position: 5
      };

      const item = new ProjectTreeItem("Project Test", vscode.TreeItemCollapsibleState.None, "project", project);
      const resolvedItem = provider.getTreeItem(item);
      expect(resolvedItem.description).toContain("[5]");

      const groupNode: ProjectGroup = {
        name: "Group Test",
        isFolder: true,
        position: 3,
        children: []
      };
      const groupItem = new ProjectTreeItem("Group Test", vscode.TreeItemCollapsibleState.Collapsed, "group", undefined, groupNode, "Group Test");
      const resolvedGroupItem = provider.getTreeItem(groupItem);
      expect(resolvedGroupItem.description).toBe("[3]");
    });
  });
});
