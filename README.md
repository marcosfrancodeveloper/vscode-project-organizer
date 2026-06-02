<p align="center">
  <img src="resources/icon.png" width="180" height="180" alt="Project Organizer Logo" />
</p>

<h1 align="center">Project Organizer</h1>

<p align="center">
  <strong>A evolução definitiva no gerenciamento de projetos para VS Code. Organização multinível (hierárquica), monitoramento em tempo real do Git e busca ultra-rápida em um só lugar.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/VS%20Code-v1.75.0%2B-blue?logo=visual-studio-code&style=flat-flat" alt="VS Code Version" />
  <img src="https://img.shields.io/badge/Language-TypeScript-blue?logo=typescript&style=flat-flat" alt="Language" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-flat" alt="License" />
</p>

---

O **Project Organizer** é uma extensão projetada para desenvolvedores que lidam com dezenas de repositórios e projetos simultaneamente. Ao contrário do *Project Manager* tradicional, ele elimina a visualização em lista única (flat list) e introduz o agrupamento hierárquico multinível por diretórios e ramificações organizacionais, além de trazer inteligência de status do Git diretamente para o seu menu lateral.

---

## 🚀 Principais Recursos

### 📂 Organização Multinível Dinâmica (Hierárquica)
Agrupe seus projetos em estruturas aninhadas usando divisores de barra `/`. Crie grupos como `Trabalho/Cliente-A/Backend` ou `Pessoal/Estudos/React` para organizar sua barra lateral de maneira limpa, lógica e colapsável.

### 🌿 Status do Git em Tempo Real
Visualize o estado de seus repositórios diretamente no painel de projetos, de forma totalmente assíncrona, sem precisar abrir as pastas:
* **Nome da Branch Ativa**: Identifique instantaneamente em qual branch você está trabalhando (ex: `main`, `feature/auth`).
* **Indicador de Alterações (`• *`)**: Saiba se há arquivos modificados ou não commitados pendentes.
* **Indicador de Commits Locais (`↑X`)**: Exibe o número de commits já realizados localmente que ainda não foram enviados (*push*) para o repositório remoto.

### 🔍 Busca Fuzzy Ultra-Rápida (Quick Open)
Acesse a lista completa de projetos em ordem de último acesso (MRU) usando a paleta de comandos do VS Code. Filtre instantaneamente por nome, grupo ou caminho absoluto e escolha abrir na janela atual ou em uma nova.

### ⚙️ Scanner de Diretórios Inteligente
Automatize o cadastro de seus repositórios. Configure caminhos base (ex: `~/projects` ou `~/dev`) e o Project Organizer fará a leitura recursiva, identificando projetos através de pastas `.git`, arquivos `package.json` ou arquivos de marcação `.projectile`. Os grupos de subpastas são inferidos e estruturados automaticamente na árvore.

### ⚡ Ações Rápidas integradas
Clique com o botão direito sobre qualquer projeto na árvore para:
* **Abrir em uma Nova Janela** ou na **Janela Atual**
* **Abrir Terminal Embutido** diretamente no diretório do projeto
* **Revelar no Finder / Explorer** do sistema operacional
* **Renomear ou Editar o Grupo** do projeto instantaneamente

---

## 🛠️ Configurações da Extensão

Você pode personalizar o comportamento do **Project Organizer** acessando as configurações do VS Code (`Ctrl+,` ou `Cmd+,`) e buscando por `projectOrganizer`:

| Configuração | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `projectOrganizer.scanPaths` | `Array<string>` | `[]` | Lista de diretórios absolutos a serem escaneados recursivamente. |
| `projectOrganizer.scanDepth` | `Integer` | `3` | Profundidade máxima de escaneamento a partir das pastas base. |
| `projectOrganizer.ignoredFolders` | `Array<string>` | `["node_modules", "dist", ".git", ...]` | Pastas a serem ignoradas durante o escaneamento automático para otimizar a velocidade. |
| `projectOrganizer.gitStatusEnabled` | `Boolean` | `true` | Habilita o monitoramento assíncrono do status do Git em background. |
| `projectOrganizer.gitStatusInterval` | `Integer` | `15000` | Intervalo em milissegundos para re-checar as alterações dos repositórios. |
| `projectOrganizer.customProjectsFile` | `String` | `""` | Caminho de arquivo JSON customizado para compartilhar seus projetos entre máquinas. |
| `projectOrganizer.treeExpanded` | `Boolean` | `false` | Se ativo, expande automaticamente todas as pastas e subpastas de grupos por padrão. |

---

## 📖 Como Usar

### Cadastrando Projetos Manualmente
1. Com uma pasta de projeto aberta no VS Code, abra a Paleta de Comandos (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2. Execute o comando `Project Organizer: Add Current Project`.
3. Digite o nome do projeto e informe o grupo correspondente (ex: `Trabalho/Front`).

### Escaneamento Automático de Projetos
1. No arquivo `settings.json` ou nas Configurações da IDE, adicione seus caminhos base no array `projectOrganizer.scanPaths`.
2. Clique no ícone de lupa **(Scan Base Folders)** no topo do menu lateral do Project Organizer.
3. Seus projetos serão identificados e organizados automaticamente de acordo com as subpastas encontradas.

### Movendo e Renomeando Projetos
1. Clique com o botão direito no projeto desejado dentro da barra lateral.
2. Selecione a opção **Project Organizer: Rename / Edit Group** (`$(edit)`).
3. Modifique o nome ou altere o caminho do grupo (use `/` para subníveis ou limpe o campo para mantê-lo no nível raiz).

---

## ⌨️ Comandos Disponíveis

* `projectOrganizer.refresh`: Atualiza a árvore visual e força a checagem assíncrona do Git.
* `projectOrganizer.searchProject`: Abre a busca rápida global (Fuzzy Quick Open).
* `projectOrganizer.scanProjects`: Executa varredura de pastas cadastradas.
* `projectOrganizer.addProject`: Registra a pasta aberta atual.
* `projectOrganizer.addProjectFolder`: Abre o seletor nativo para adicionar qualquer pasta do computador.
* `projectOrganizer.removeProject`: Deleta o projeto da lista da extensão.
* `projectOrganizer.renameProject`: Altera nome e grupo.

---

## 🧑‍💻 Desenvolvimento e Customização

Caso queira estender as funcionalidades ou debugar a extensão localmente:

1. Clone o repositório.
2. Execute `npm install` para instalar as dependências de tipos e compilação.
3. Compile o código com `npm run compile` (usa `esbuild` sob o capô).
4. Abra o código no VS Code e pressione `F5` para iniciar o Host de Desenvolvimento de Extensões.

## 📄 Licença

Este projeto é distribuído sob a licença MIT. Consulte o arquivo `LICENSE` para mais detalhes.
