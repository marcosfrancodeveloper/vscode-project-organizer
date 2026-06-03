# Project Guidelines for Coding Assistants

When writing code or suggestions for this project, you must follow these rules without exception:

## Commit Message Guidelines
All code changes suggestions must be accompanied by a commit message following this format:
```
<type>(<scope>): <subject>

- <bullet_point_detailing_changes>
- <bullet_point_detailing_changes>

#<issue_number_or_id>
```

Example:
```
feat(tree): adiciona persistência de estado de expansão e busca por tags

- Atualiza comando `projectOrganizer.expandAll` para salvar preferência global
- Adiciona escuta de alteração nas configurações no configWatcher
- Associa tags de projetos na descrição do QuickPick

#000002
```

## Architecture & Code Quality
- Follow SOLID design principles, strictly applying Dependency Inversion (DIP) and Single Responsibility (SRP).
- Keep services decoupled and communicate via interfaces defined in `src/interfaces/`.
- Ensure new methods and utilities have associated unit tests under the `tests/` directory using Jest.
- Never suggest generic or outdated patterns. Ensure zero unused imports or parameters (`noUnusedParameters: true` is enabled).
- Never propose `cd` terminal commands or automatic `push` operations.
