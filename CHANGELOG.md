# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
