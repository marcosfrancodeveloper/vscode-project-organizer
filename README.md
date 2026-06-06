[![VS Marketplace](https://img.shields.io/badge/VS%20Marketplace-Extension-007ACC?logo=visual-studio-code&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=marcosfrancodeveloper.project-organizer)
[![Open VSX Version](https://img.shields.io/open-vsx/v/marcosfrancodeveloper/project-organizer?label=Open%20VSX&logo=eclipse-che)](https://open-vsx.org/extension/marcosfrancodeveloper/project-organizer)
[![Open VSX Downloads](https://img.shields.io/open-vsx/dt/marcosfrancodeveloper/project-organizer)](https://open-vsx.org/extension/marcosfrancodeveloper/project-organizer)
[![CI Status](https://img.shields.io/github/actions/workflow/status/marcosfrancodeveloper/vscode-project-organizer/main.yml?branch=main&label=CI&logo=github-actions)](https://github.com/marcosfrancodeveloper/vscode-project-organizer/actions/workflows/main.yml)


<p align="center">
  <br />
  <a title="Learn more about Project Organizer" href="https://github.com/marcosfrancodeveloper/vscode-project-organizer"><img src="https://raw.githubusercontent.com/marcosfrancodeveloper/vscode-project-organizer/main/resources/icon.png" alt="Project Organizer Logo" width="160" height="160" /></a>
</p>

# What's new in Project Organizer

*   **Group Organization:** Natively structure your projects into collapsible groups (e.g., `Work` or `Personal`).
*   **Asynchronous Git Monitoring:** Background repository checking to automatically display the active branch, modified state (`• *`), and local commits pending upload (`↑N`).
*   **Advanced Search Palette (Quick Open):** Locate your projects instantly by filtering by name, path, group, or custom tags.
*   **Markdown Tooltip Notes:** Hover over projects in the side bar to read annotations and configuration notes formatted in rich Markdown.
*   **Flexible Sorting & Custom Ordering:** Sort projects by Name or Last Accessed in ascending/descending order, or manually define a custom numeric position for projects and groups in the sidebar.
*   **Project Favorites & Deprecation:** Keep essential projects handy in a dedicated Favorites view, and deprecate/archive inactive ones to hide or show them based on preferences.
*   **Multi-language Support:** Fully localized in English, Portuguese, Spanish, and French.
*   **Portable and Custom Persistence:** Save projects in the default workspace state or sync with an external file via `projectOrganizer.customProjectsFile`.
*   **One-Click Imports:** Migrate seamlessly from the legacy *Project Manager* extension in either merge or replace mode.
*   **Global Tree controls:** Expand and collapse all project groups globally with persistence inside `settings.json`.

# Project Organizer

It helps you to easily access and structure your **projects**, no matter where they are located. _Don't lose track of your workspaces anymore_.

You can organize your repositories into **collapsible groups**, auto-detect **Git** repositories under custom paths, and keep track of active branches and dirty states at a glance.

Here are some of the features that **Project Organizer** provides:

*   Save folder or workspace as a **Project** with custom groups (e.g., `Personal` or `Learning`)
*   Auto-detect local **Git** repositories
*   Organize and filter projects using custom **Tags** and notes
*   Review active **Git status** asynchronously on the sidebar without opening the projects
*   Open projects in the same window or a new window
*   Filter projects dynamically through a dedicated **Side Bar**
*   Sort and manually order projects and groups in the sidebar
*   Favorite and Archive (Deprecate) projects

# Features

## Available Commands

*   `Project Organizer: Add Project` Save the current folder/workspace as a new project
*   `Project Organizer: Add Project Folder` Choose any folder on disk to add as a project
*   `Project Organizer: Search Projects` Open fuzzy search palette with tag and path filtering
*   `Project Organizer: Scan Folders for Projects` Scan your local directories for Git repositories
*   `Project Organizer: Edit Projects File` Edit your projects JSON file directly in the editor
*   `Project Organizer: Expand All Groups` Expand all group folders recursively in the sidebar
*   `Project Organizer: Collapse All Groups` Collapse all group folders recursively in the sidebar
*   `Project Organizer: Import from Project Manager` Migrate projects from the legacy Project Manager extension
*   `Project Organizer: Favorite` Add a project to your favorites list
*   `Project Organizer: Unfavorite` Remove a project from your favorites list
*   `Project Organizer: Deprecate Project` Archive/deprecate a project in the sidebar
*   `Project Organizer: Undeprecate Project` Reactivate a deprecated project
*   `Project Organizer: Change Sort Criteria...` Change the sorting criteria of the project list (Name or Last Accessed)
*   `Project Organizer: Toggle Sort Order` Switch between ascending and descending order
*   `Project Organizer: Set Position...` Set a manual numeric display index for a project or group

## Manage your projects

### Add Project

You can save the current folder/workspace as a **Project** at any time. You can assign it to a group directory by specifying a folder/group name.

> It suggests a name to you _automatically_ based on the folder's name.
 
### Edit Projects

For easier customization of your project list, you can edit the database JSON file directly inside **VS Code**. Just execute `Project Organizer: Edit Projects File`. The extension saves projects using a single-level nested structure representing your groups:

```json
{
  "Corp": {
    "Front App": {
      "id": "L1VzZXJzL21hcmNvc2ZyYW5jby9Eb2N1bWVudHMvcHJvamVjdHMvZXhlbXBsby1iYWNrZW5k",
      "path": "/paths/corp/front-angular",
      "notes": "TODO: Run database migrations on start",
      "tags": ["frontend", "angular"],
      "lastAccessed": 1780433838030,
      "favorite": true
    }
  },
  "Personal": {
    "Nest API": {
      "id": "L1VzZXJzL21hcmNvc2ZyYW5jby9Eb2N1bWVudHMvcHJvamVjdHMvZXhlbXBsby1wb3J0YWw",
      "path": "/paths/personal/nest-api",
      "tags": ["backend", "nest"],
      "lastAccessed": 1780427953530
    }
  },
  "Another": {
    "id": "L1VzZXJzL21hcmNvc2ZyYW5jby9Eb2N1bWVudHMvcHJvamVjdHMvYW5vdGhlci0x",
    "path": "/paths/personal/nest-api",
    "tags": ["backend", "nest"],
    "lastAccessed": 1780427953530,
    "notes": "This project is deprecated for any reason. I will archive it in the next update.",
    "position": 1,
    "deprecated": true
  }
}
```

> You can use `~` or `$home` while defining any path. It will be replaced by your HOME folder.

## Access 

### Search Projects

Shows your projects and select one to open. Projects are sorted by last accessed (LRU).

### Open Project in New Window

Just like opening projects normally, but always opening in a **New Window**.

## Keyboard Focused Users

If you are a keyboard focused user and use _Vim-like_ keyboard navigation, you can navigate through the project list with your own keybindings. 

Just use the `when` clause `"inProjectOrganizerList"`, like:

```json
  {
    "key": "cmd+j",
    "command": "workbench.action.quickOpenSelectNext",
    "when": "inProjectOrganizerList && isMac"
  },
  {
    "key": "cmd+shift+j",
    "command": "workbench.action.quickOpenSelectPrevious",
    "when": "inProjectOrganizerList && isMac"
  },
  {
    "key": "ctrl+j",
    "command": "workbench.action.quickOpenSelectNext",
    "when": "inProjectOrganizerList && (isWindows || isLinux)"
  },
  {
    "key": "ctrl+shift+j",
    "command": "workbench.action.quickOpenSelectPrevious",
    "when": "inProjectOrganizerList && (isWindows || isLinux)"
  }
```

## Available Settings

You can configure the extension settings by opening VS Code Settings and searching for `Project Organizer`:

*   `projectOrganizer.scanPaths`
    Indicates directories to search for projects. Supports home directory path shorthand `~/`.
    ```json
    "projectOrganizer.scanPaths": [
        "~/projects/work",
        "~/projects/learning"
    ]
    ```

*   `projectOrganizer.scanDepth`
    Defines how deep the scanner should search recursively for repositories (default is `3`).
    ```json
    "projectOrganizer.scanDepth": 4
    ```

*   `projectOrganizer.ignoredFolders`
    List of folders to ignore when scanning base directories to boost performance.
    ```json
    "projectOrganizer.ignoredFolders": [
        "node_modules",
        "dist",
        "bin",
        ".git"
    ]
    ```

*   `projectOrganizer.gitStatusEnabled`
    Enables background checks and displays Git indicators in the tree view (default is `true`).
    ```json
    "projectOrganizer.gitStatusEnabled": true
    ```

*   `projectOrganizer.gitStatusInterval`
    Configures the check interval in milliseconds (default is `15000` ms).
    ```json
    "projectOrganizer.gitStatusInterval": 20000
    ```

*   `projectOrganizer.customProjectsFile`
    Alternative location path for the projects database file, useful for syncing settings between machines.
    ```json
    "projectOrganizer.customProjectsFile": "~/GoogleDrive/vscode-projects.json"
    ```

*   `projectOrganizer.treeExpanded`
    Controls whether the project group folders are expanded by default when VS Code loads.
    ```json
    "projectOrganizer.treeExpanded": false
    ```

*   `projectOrganizer.showDeprecated`
    Controls whether projects marked as deprecated/archived are visible in the sidebar tree.
    ```json
    "projectOrganizer.showDeprecated": true
    ```

*   `projectOrganizer.sortBy`
    Sets the sorting criteria for projects in the sidebar: `"name"` or `"lastAccessed"`.
    ```json
    "projectOrganizer.sortBy": "name"
    ```

*   `projectOrganizer.sortOrder`
    Sets the sorting direction: `"asc"` (ascending) or `"desc"` (descending).
    ```json
    "projectOrganizer.sortOrder": "asc"
    ```

# License

This project is licensed under the [GNU General Public License v3](LICENSE.md).
