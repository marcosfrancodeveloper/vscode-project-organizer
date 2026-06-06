# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-06-06

### Added
- **Asynchronous Lazy Loading of Git Status**: Removed all synchronous git check operations (like `isGitRepository`) from the tree view rendering paths (`getTreeItem`), boosting sidebar display speeds. Icons (`repo`/`root-folder`) and branches are loaded dynamically in the background.
- **Git Worktrees & Submodules Support**: Added path parsing support for `gitdir:` pointers inside `.git` files, allowing branch detection in nested worktrees and submodules.

### Fixed
- **Windows CPU Overload & Reload Loops**: Fixed severe performance bottlenecks and CPU crashes on Windows by replacing `setInterval` loops with recursive, non-overlapping `setTimeout` timers.
- **Git Executable Absence Overhead**: Globally caches the absence of the Git command line utility, bypassing repeated failing child process executions.

### Changed
- **Direct HEAD Parsing**: Replaced heavy `git symbolic-ref`/`git rev-parse` process spawns with direct filesystem reads of `.git/HEAD` for branch name detection, eliminating spawn overhead.
- **O(1) Parent Node Lookups**: Optimized the sidebar parent search algorithms from $O(N^2 \cdot \text{I/O})$ down to $O(N)$ with exactly one I/O operation per request, using an in-memory parent hierarchy map.
- **Sorting Performance**: Partitioned directory and project nodes in a single pass ($O(N)$) and cached sorting order multipliers globally.
- **Visual Architecture Diagram**: Replaced the raw Mermaid text block in `README.md` with a clean pre-rendered image asset (`resources/how-it-works.png`) to ensure correct rendering on the VS Code Marketplace.

## [1.1.1] - 2026-06-06

### Added
- **Asian Language Support (i18n)**: Implemented full translation support for Japanese (`ja`) and Simplified Chinese (`zh-cn`) in package manifests and runtime dialogs.

### Fixed
- **Group Dislocation on Updates**: Fixed a critical bug in `StorageService.updateProject` where updating properties like position, accessing a project, favoriting, or deprecating without an explicit `group` payload incorrectly dislocated the project to the root registry.

### Changed
- **Documentation Badges Refresh**: Replaced retired dynamic Visual Studio Marketplace badges in `README.md` with a stable static badge and standardized Open VSX / CI badges.

## [1.1.0] - 2026-06-06

### Added
- **Manual Display Index / Custom Positions**: Added the ability to set a custom numeric position for individual projects and group folders via context menu (`Project Organizer: Set Position`).
- **Sorting Criteria**: Added configuration settings and commands to sort projects alphabetically by Name or by Last Accessed date, in ascending or descending order.
- **Project Favoriting and Archiving (Deprecation)**: Added direct context menu actions to favorite/unfavorite and archive (deprecate) projects, alongside settings to show or hide deprecated projects in the sidebar.
- **Internationalization (i18n)**: Implemented full translations for French (`fr`) and Spanish (`es`) languages, covering the sidebar view titles, configuration descriptions, commands, and runtime alerts/notifications.

### Changed
- **Views Welcome Cleaning**: Removed broken Markdown image tags from welcome views empty state to ensure clean and correct interface rendering across all localized views.

## [1.0.4] - 2026-06-06

### Added
- **VS Code Marketplace Publishing**: Integrated `@vscode/vsce` publish step into the GitHub Actions release workflow.
- **Refresh Command Registration**: Programmatically registered the `projectOrganizer.refresh` command to make sure the side tree reloads correctly from the UI.

### Changed
- **NPM Script Separation**: Separated publication commands in `package.json` into `publish:ovsx` and `publish:vsce` for clarity and modularity.

## [1.0.3] - 2026-06-03

### Changed
- **Open VSX Badge Integration**: Replaced legacy Microsoft Visual Studio Marketplace badges in `README.md` with Shields.io Open VSX badges (fixing the 404 on download counts by using `dt`) and added a GitHub Actions CI status badge in place of the unsupported rating badge.

## [1.0.2] - 2026-06-03

### Changed
- **Modular CI/CD Pipelines**: Refactored the GitHub Actions setup into separate workflows: `ci.yml` for pull requests and main pushes, and `release.yml` for tag releases.
- **Reverted Packager Script**: Restored `package` command in `package.json` to use `@vscode/vsce` instead of `ovsx` to fix CLI flag compatibility issues.

## [1.0.1] - 2026-06-03

### Added
- **Jest Unit Tests Suite**: Implemented comprehensive unit tests for `GitService`, `ProjectScanner`, and `StorageService` using custom `vscode` mocks.
- **Automated Open VSX Release Pipeline**: Configured GitHub Actions to automatically test, compile, and publish the extension upon version tag pushes.
- **Watchman Sandbox Fixes**: Added `.watchmanconfig` and `--no-watchman` flags to bypass file crawling access issues on macOS.

### Changed
- **UI Star Icon Removal**: Disabled the default star icon for the favorites folder root to polish the sidebar tree UI.
- **Publisher Namespace**: Updated extension publisher namespace to `marcosfrancodeveloper` in preparation for deployment.

## [1.0.0] - 2026-06-03

### Added
- **Multilevel Hierarchical Organization**: Native collapsible side-tree structure allowing unlimited levels of subgroups and subfolders separated by forward slashes `/` (e.g., `Work/Client-A/Frontend`).
- **Asynchronous Git Monitoring**: Background checks every 15 seconds to update the active branch, modified files (dirty state `• *`), and count of local commits pending upload (`↑N`).
- **Advanced Search Palette (Quick Open)**: Activated by a search command with fuzzy filtering combining name, physical path, associated tags, and notes display. Projects are ordered by a least recently used (LRU) algorithm.
- **Flat Favorites List (Flat List)**: View of the root favorites folder in a flat format, speeding up direct access with a single click. Displays the secondary group path and Git status in the description field (e.g., `Group/Subgroup • branch`).
- **Markdown Metadata and Notes**: Rich native tooltip displaying formatted project notes and annotations in Markdown when hovering.
- **Automated Data Import**: Integrated utility to import data from the legacy *Project Manager* extension in merge mode or complete replace mode.
- **Portable Persistence**: Support for saving data locally in VS Code's `globalStorage` or transparent synchronization with an external JSON file configured via `projectOrganizer.customProjectsFile`.
- **Global Tree Control Buttons**: Actions to expand all (`expand-all`) and collapse all (`collapse-all`) groups, persisting user preferences.

### Changed
- **SOLID Architectural Structuring**: Deep refactoring of the source code to implement Dependency Inversion Principle (DIP) and Single Responsibility Principle (SRP) for command registration, reducing the extension's entry point to under 60 lines.
- **Contextual Interface Segmentation**: Migration of abstract type definitions from a single file to `src/interfaces/models.interface.ts` and `src/interfaces/services.interface.ts`.
- **Project Licensing**: Official update and transition of the license from MIT to the [GNU General Public License v3 (GPL v3)](LICENSE.md).
- **Visual Assets**: Replacement of the relative logo in the README with a GitHub Raw absolute URL to bypass CSP policies and ensure correct rendering in the VS Code extension details tab.
