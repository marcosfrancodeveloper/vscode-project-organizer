<p align="center">
  <img src="resources/icon.png" width="160" height="160" alt="Project Organizer Logo" />
</p>

<h1 align="center">Project Organizer</h1>

<p align="center">
  <strong>The definitive workspace manager evolution for VS Code. Multilevel hierarchical organization, real-time asynchronous Git status, descriptive notes, and ultra-fast search.</strong>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=marcosfranco.project-organizer">
    <img src="https://vsmarketplacebadges.dev/version-short/marcosfranco.project-organizer.svg" alt="Marketplace Version" />
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=marcosfranco.project-organizer">
    <img src="https://vsmarketplacebadges.dev/downloads-short/marcosfranco.project-organizer.svg" alt="Downloads" />
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=marcosfranco.project-organizer">
    <img src="https://vsmarketplacebadges.dev/rating-short/marcosfranco.project-organizer.svg" alt="Rating" />
  </a>
  <img src="https://img.shields.io/badge/Language-TypeScript-blue?logo=typescript" alt="Language" />
  <img src="https://img.shields.io/badge/License-GPLv3-blue.svg" alt="License" />
</p>

---

**Project Organizer** is the ideal solution for developers working with multiple repositories and projects simultaneously. Unlike traditional single-list (flat list) project managers, it introduces a **multilevel organizational tree structure** based on hierarchical paths and an **asynchronous background Git monitor** so you can see the status of all your repositories directly in the side panel, without needing to open them.

---

## 🔥 What's New in Project Organizer

*   📂 **Dynamic Multilevel Groups Support:** Classify and organize your projects in infinite subfolder trees using slashes `/` (e.g., `Work/Client-A/Frontend`).
*   🌿 **Background Git Monitoring:** Asynchronously view which branch is active and whether there are modified files (`• *`) or local commits not pushed (`↑N`).
*   🎯 **Global Expansion Persistence:** Built-in Expand All (`expand-all`) and Collapse All (`collapse-all`) buttons that save user preferences at the IDE global level (`settings.json`).
*   🏷️ **Organization with Tags:** Add custom tags in your `projects.json` and search your projects instantly using tags in Quick Open.
*   📝 **Markdown Project Notes:** Write down important notes and view them formatted in tooltip bubbles when hovering over projects.

---

## 🚀 Key Features

### 📂 Hierarchical Tree Structure
Say goodbye to cluttered project lists. In Project Organizer, you can assign any hierarchy level to a project. Just categorize your project with a group like `Company/Systems/API` and the extension will natively and cleanly create the nested collapsible directory structure in the sidebar.

### 🌿 Quick Git View
Avoid the need to navigate from directory to directory to check branch status. Project Organizer asynchronously checks your projects and inserts indicators in the tree:
*   **Active Branch name** (e.g., `main`, `develop`, `feature/login`).
*   **Modification state (`• *`)** if there are files with pending changes to commit.
*   **Local commits to push (`↑3`)** if there are commits created locally not yet pushed to the remote repository.

### 🔍 Advanced Fuzzy Search Palette (Quick Open)
Access all your projects by pressing a quick shortcut or calling the project search. Projects are sorted by Last Accessed (LRU) and you can filter by:
*   Project name
*   Physical path on disk
*   Organizational group/subgroup
*   Associated tags

### 📝 Project Notes and Metadata
Keep useful reminders close at hand (e.g., local database port, special dependencies to start, quick documentation links). Project Organizer renders notes using friendly Markdown blocks in the IDE's native Tooltip when you hover over the project.

---

## 🛠️ Extension Settings

You can configure the extension by opening VS Code Settings (`Ctrl+,` or `Cmd+,`) and searching for `Project Organizer`:

| Setting | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `projectOrganizer.scanPaths` | `string[]` | `[]` | List of local directories that the extension should scan looking for projects/repositories. |
| `projectOrganizer.scanDepth` | `number` | `3` | Maximum recursive read depth when scanning base folders. |
| `projectOrganizer.ignoredFolders` | `string[]` | `["node_modules", "dist", ".git", "bin", "tmp"]` | Folders ignored during recursive scanning to increase performance. |
| `projectOrganizer.gitStatusEnabled` | `boolean` | `true` | Enables background checking and rendering of Git status. |
| `projectOrganizer.gitStatusInterval` | `number` | `15000` | Interval in milliseconds to recheck Git changes. |
| `projectOrganizer.customProjectsFile` | `string` | `""` | Custom path to the `projects.json` file (useful for cloud synchronization). |
| `projectOrganizer.treeExpanded` | `boolean` | `false` | Global preference on whether the side tree should start fully expanded or collapsed. |

---

## ⌨️ Available Commands

The extension exposes quick commands that can be bound to keyboard shortcuts in your `keybindings.json`:

| Command | Description | UI Icon |
| :--- | :--- | :---: |
| `projectOrganizer.refresh` | Manually updates the project list and Git status. | `$(refresh)` |
| `projectOrganizer.searchProject` | Opens the quick fuzzy search with tag and path filtering (Quick Open). | `$(list-filter)` |
| `projectOrganizer.scanProjects` | Runs the scan in the folders configured in `scanPaths`. | `$(search)` |
| `projectOrganizer.addProject` | Saves the currently open workspace/project in the list. | — |
| `projectOrganizer.addProjectFolder` | Opens the native picker to add any local system folder. | — |
| `projectOrganizer.removeProject` | Removes the selected project from the list. | `$(trash)` |
| `projectOrganizer.renameProject` | Allows changing the display name or group (path with `/`). | `$(edit)` |
| `projectOrganizer.expandAll` | Recursively expands all group folders in the side tree. | `$(list-tree)` |
| `projectOrganizer.collapseAll` | Recursively collapses all group folders in the side tree. | `$(collapse-all)` |
| `projectOrganizer.editProjectsJson` | Opens the physical `projects.json` file for direct manual editing. | `$(go-to-file)` |
| `projectOrganizer.importProjectManager` | Manually and intelligently imports saved project data from the old Project Manager extension. | `$(cloud-download)` |

---

## 📂 `projects.json` File Structure

The `projects.json` file is structured intuitively, allowing you to easily add tags, notes, sort, or clean data.

Structure example:
```json
[
  {
    "id": "L1VzZXJzL21hcmNvc2ZyYW5jby9Eb2N1bWVudHMvcHJvamVjdHMvZXhlbXBsby1iYWNrZW5k",
    "name": "My Library",
    "path": "/Users/myuser/projects/client/my-lib",
    "group": "client/my-lib",
    "notes": "TODO: Update dependencies and run migrations of the local database",
    "tags": ["nest", "library"],
    "lastAccessed": 1780433838030
  },
  {
    "id": "L1VzZXJzL21hcmNvc2ZyYW5jby9Eb2N1bWVudHMvcHJvamVjdHMvZXhlbXBsby1wb3J0YWw",
    "name": "Portal",
    "path": "/Users/myuser/projects/client/my-portal",
    "group": "client/my-portal",
    "tags": ["nest", "portal"],
    "lastAccessed": 1780427953530
  }
]
```

---

## 📄 License

This project is licensed under the [GNU General Public License v3](LICENSE.md).
