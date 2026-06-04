[![](https://img.shields.io/open-vsx/v/marcosfrancodeveloper/project-organizer.svg)](https://open-vsx.org/extension/marcosfrancodeveloper/project-organizer)
[![](https://img.shields.io/open-vsx/dt/marcosfrancodeveloper/project-organizer.svg)](https://open-vsx.org/extension/marcosfrancodeveloper/project-organizer)
[![](https://img.shields.io/github/actions/workflow/status/marcosfrancodeveloper/vscode-project-organizer/main.yml?branch=main&label=CI)](https://github.com/marcosfrancodeveloper/vscode-project-organizer/actions/workflows/main.yml)

<p align="center">
  <br />
  <a title="Learn more about Project Organizer" href="https://github.com/marcosfrancodeveloper/vscode-project-organizer"><img src="https://raw.githubusercontent.com/marcosfrancodeveloper/vscode-project-organizer/main/resources/icon.png" alt="Project Organizer Logo" width="160" height="160" /></a>
</p>

# What's new in Project Organizer 1.0

*   **Multilevel Hierarchical Organization:** Natively structure your projects into collapsible groups using forward slashes (e.g., `Work/Client-A/Frontend`).
*   **Asynchronous Git Monitoring:** Background repository checking to automatically display the active branch, modified state (`• *`), and local commits pending upload (`↑N`).
*   **Advanced Search Palette (Quick Open):** Locate your projects instantly by filtering by name, path, group, or custom tags.
*   **Markdown Tooltip Notes:** Hover over projects in the side bar to read annotations and configuration notes formatted in rich Markdown.
*   **Portable and Custom Persistence:** Save projects in the default workspace state or sync with an external file via `projectOrganizer.customProjectsFile`.
*   **One-Click Imports:** Migrate seamlessly from the legacy *Project Manager* extension in either merge or replace mode.
*   **Global Tree controls:** Expand and collapse all nested project groups globally with persistence inside `settings.json`.

# Support

**Project Organizer** is an open-source extension created for **Visual Studio Code**. If you find it useful, please consider supporting its development.

<table align="center" width="40%" border="0">
  <tr>
    <td align="center">
      <a title="GitHub Sponsors" href="https://github.com/sponsors/marcosfrancodeveloper"><img src="https://raw.githubusercontent.com/alefragnani/oss-resources/master/images/button-become-a-sponsor-rounded-small.png"/></a>
    </td>
  </tr>
</table>

# Project Organizer

It helps you to easily access and structure your **projects**, no matter where they are located. _Don't lose track of your workspaces anymore_.

You can organize your repositories into **collapsible groups** using logical paths, auto-detect **Git** repositories under custom paths, and keep track of active branches and dirty states at a glance.

Here are some of the features that **Project Organizer** provides:

*   Save folder or workspace as a **Project** with custom groups (e.g., `Personal/Learning/Node`)
*   Auto-detect local **Git** repositories
*   Organize and filter projects using custom **Tags** and notes
*   Review active **Git status** asynchronously on the sidebar without opening the projects
*   Open projects in the same window or a new window
*   Filter projects dynamically through a dedicated **Side Bar**

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

## Manage your projects

### Add Project

You can save the current folder/workspace as a **Project** at any time. You can assign it to a group directory by inserting a path with slashes.

> It suggests a name to you _automatically_ based on the folder's name.
 
### Edit Projects

For easier customization of your project list, you can edit the database JSON file directly inside **VS Code**. Just execute `Project Organizer: Edit Projects File`. The extension saves projects using a nested logical structure representing your groups:

```json
{
  "Corp": {
    "XPTO": {
      "Front": {
        "id": "L1VzZXJzL21hcmNvc2ZyYW5jby9Eb2N1bWVudHMvcHJvamVjdHMvZXhlbXBsby1iYWNrZW5k",
        "path": "/paths/corp/xpto/front-angular",
        "notes": "TODO: Run database migrations on start",
        "tags": ["frontend", "angular"],
        "lastAccessed": 1780433838030,
        "favorite": true
      }
    }
  },
  "Personal": {
    "Learning": {
      "Nest API": {
        "id": "L1VzZXJzL21hcmNvc2ZyYW5jby9Eb2N1bWVudHMvcHJvamVjdHMvZXhlbXBsby1wb3J0YWw",
        "path": "/paths/personal/nest-api",
        "tags": ["backend", "nest"],
        "lastAccessed": 1780427953530
      }
    }
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

## Installation and Configuration

You should follow the official documentation to:

- [Install the extension](https://code.visualstudio.com/docs/editor/extension-gallery)
- [Modify its settings](https://code.visualstudio.com/docs/getstarted/settings)

# License

This project is licensed under the [GNU General Public License v3](LICENSE.md).
