<p align="center">
  <img src="resources/icon.png" width="160" height="160" alt="Project Organizer Logo" />
</p>

<h1 align="center">Project Organizer</h1>

<p align="center">
  <strong>A evolução definitiva no gerenciamento de workspaces para VS Code. Organização hierárquica multinível, status de Git assíncrono em tempo real, notas descritivas e busca ultra-rápida.</strong>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=marcosfranco.project-organizer">
    <img src="https://vsmarketplacebadges.dev/version-short/marcosfranco.project-organizer.svg" alt="Versão do Marketplace" />
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=marcosfranco.project-organizer">
    <img src="https://vsmarketplacebadges.dev/downloads-short/marcosfranco.project-organizer.svg" alt="Downloads" />
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=marcosfranco.project-organizer">
    <img src="https://vsmarketplacebadges.dev/rating-short/marcosfranco.project-organizer.svg" alt="Avaliação" />
  </a>
  <img src="https://img.shields.io/badge/Language-TypeScript-blue?logo=typescript" alt="Linguagem" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="Licença" />
</p>

---

O **Project Organizer** é a solução ideal para desenvolvedores que trabalham com múltiplos repositórios e projetos simultaneamente. Diferente de gerenciadores de projetos tradicionais de lista única (flat list), ele introduz uma **estrutura de árvore organizacional multinível** baseada em caminhos hierárquicos e um monitor de Git assíncrono em segundo plano para que você saiba o status de todos os seus repositórios diretamente no painel lateral, sem precisar abri-los.

---

## 🔥 O que há de novo no Project Organizer 

*   📂 **Suporte a Grupos Multiníveis Dinâmicos:** Classifique e organize seus projetos em árvores de subpastas infinitas utilizando barras `/` (ex: `Trabalho/Cliente-A/Frontend`).
*   🌿 **Monitoramento do Git em Background:** Veja de forma assíncrona qual branch está ativa e se há arquivos modificados (`• *`) ou commits locais não enviados (`↑N`).
*   🎯 **Persistência de Expansão Global:** Botões de Expandir Tudo (`expand-all`) e Colapsar Tudo (`collapse-all`) integrados que salvam as preferências do usuário no nível global da IDE (`settings.json`).
*   🏷️ **Organização com Tags:** Adicione marcadores personalizados no seu `projects.json` e busque seus projetos de forma instantânea usando as tags no Quick Open.
*   📝 **Notas de Projeto em Markdown:** Registre observações importantes e visualize-as formatadas em balões de tooltip ao pairar o mouse sobre os projetos.

---

## 🚀 Principais Recursos

### 📂 Estrutura Hierárquica em Árvore
Diga adeus a listas desordenadas de projetos. No Project Organizer, você pode atribuir qualquer nível de hierarquia a um projeto. 
Basta categorizar seu projeto com um grupo como `Empresa/Sistemas/API` para que a extensão crie a estrutura de diretórios aninhados colapsáveis na barra lateral de forma nativa e limpa.

### 🌿 Visão Rápida do Git
Evite a necessidade de navegar de diretório em diretório para verificar o status de branches. O Project Organizer checa assintomaticamente seus projetos e insere indicadores na árvore:
*   **Nome do Branch ativo** (ex: `main`, `develop`, `feature/login`).
*   **Estado de modificação (`• *`)** se houver arquivos com alterações pendentes de commit.
*   **Commits locais a enviar (`↑3`)** se houver commits criados localmente ainda não enviados ao repositório remoto.

### 🔍 Paleta de Busca Fuzzy Avançada (Quick Open)
Acesse todos os seus projetos pressionando um atalho rápido ou chamando a busca de projetos. Os projetos são ordenados por **Último Acesso (LRU)** e você pode filtrar por:
*   Nome do projeto
*   Caminho físico no disco
*   Grupo/Subgrupo organizacional
*   Tags associadas

### 📝 Notas e Metadados do Projeto
Mantenha lembretes úteis sempre por perto (ex: porta do banco de dados local, dependências especiais a iniciar, links rápidos de documentação). O Project Organizer renderiza notas usando blocos de Markdown amigáveis no Tooltip nativo da IDE ao deixar o cursor sobre o projeto.

---

## 🛠️ Configurações da Extensão

Você pode configurar a extensão abrindo as configurações do VS Code (`Ctrl+,` ou `Cmd+,`) e procurando por `Project Organizer`:

| Configuração | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `projectOrganizer.scanPaths` | `string[]` | `[]` | Lista de diretórios locais que a extensão deve varrer à procura de projetos/repositórios. |
| `projectOrganizer.scanDepth` | `number` | `3` | Profundidade máxima de leitura recursiva ao escanear pastas base. |
| `projectOrganizer.ignoredFolders` | `string[]` | `["node_modules", "dist", ".git", "bin", "tmp"]` | Pastas ignoradas na varredura recursiva para aumentar a performance. |
| `projectOrganizer.gitStatusEnabled` | `boolean` | `true` | Habilita a checagem em segundo plano e renderização do status do Git. |
| `projectOrganizer.gitStatusInterval` | `number` | `15000` | Intervalo em milissegundos para re-checar alterações de Git. |
| `projectOrganizer.customProjectsFile` | `string` | `""` | Caminho personalizado para o arquivo `projects.json` (útil para sincronização em nuvem). |
| `projectOrganizer.treeExpanded` | `boolean` | `false` | Preferência global sobre se a árvore lateral deve iniciar totalmente expandida ou colapsada. |

---

## ⌨️ Comandos Disponíveis

A extensão expõe comandos rápidos que podem ser vinculados a atalhos de teclado no seu `keybindings.json`:

| Comando | Descrição | Ícone UI |
| :--- | :--- | :---: |
| `projectOrganizer.refresh` | Atualiza manualmente a lista de projetos e o status do Git. | `$(refresh)` |
| `projectOrganizer.searchProject` | Abre a busca rápida fuzzy com filtro de tags e caminhos (Quick Open). | `$(list-filter)` |
| `projectOrganizer.scanProjects` | Executa o escaneamento nas pastas configuradas em `scanPaths`. | `$(search)` |
| `projectOrganizer.addProject` | Salva o workspace/projeto atualmente aberto na lista. | — |
| `projectOrganizer.addProjectFolder` | Abre o seletor nativo para adicionar qualquer pasta local do sistema. | — |
| `projectOrganizer.removeProject` | Remove o projeto selecionado da lista. | `$(trash)` |
| `projectOrganizer.renameProject` | Permite alterar o nome de exibição ou o grupo (caminho com `/`). | `$(edit)` |
| `projectOrganizer.expandAll` | Expande recursivamente todas as pastas de grupo na árvore lateral. | `$(list-tree)` |
| `projectOrganizer.collapseAll` | Colapsa recursivamente todas as pastas de grupo na árvore lateral. | `$(collapse-all)` |
| `projectOrganizer.editProjectsJson` | Abre o arquivo físico `projects.json` de projetos para edição manual direta. | `$(go-to-file)` |
| `projectOrganizer.importProjectManager` | Importa de forma manual e inteligente os dados de projetos salvos da extensão antiga Project Manager. | `$(cloud-download)` |

---

## 📂 Estrutura do Arquivo `projects.json`

O arquivo `projects.json` é estruturado de forma intuitiva, permitindo que você adicione tags, notas, ordene ou limpe dados facilmente.

Exemplo de estrutura:
```json
[
  {
    "id": "L1VzZXJzL21hcmNvc2ZyYW5jby9Eb2N1bWVudHMvcHJvamVjdHMvZXhlbXBsby1iYWNrZW5k",
    "name": "My Library",
    "path": "/Users/myuser/projects/client/my-lib",
    "group": "client/my-lib",
    "notes": "TODO: Atualizar dependências e rodar migrações do banco local",
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

## 🧑‍💻 Desenvolvimento e Extensibilidade

Caso queira contribuir para a extensão ou rodar um ambiente local de depuração:

1.  Clone este repositório:
    ```bash
    git clone https://github.com/marcosfranco/project-organizer.git
    ```
2.  Instale as dependências:
    ```bash
    npm install
    ```
3.  Compile o projeto (a compilação utiliza o `esbuild` de forma rápida):
    ```bash
    npm run compile
    ```
4.  Abra o diretório no VS Code e pressione `F5` para iniciar o depurador no **Extension Development Host**.

---

## 📄 Licença

Este projeto é licenciado sob a [MIT License](LICENSE).
