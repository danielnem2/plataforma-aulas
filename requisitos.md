# Requisitos — Plataforma de Aulas Gamificada

> Baseado no mapeamento da plataforma de referência (Dev Games, v1.0 BETA) nas visões de Admin, Diretor, Professor e Aluno, mais as regras definidas com o dono do projeto.

## 1. Decisões já tomadas

| Item | Decisão |
|---|---|
| Framework | Next.js |
| Banco de dados | **Supabase** (PostgreSQL + Auth + Storage) — dados relacionais, permissões por linha (RLS), transações para o Gold |
| Hospedagem | Vercel |
| Navegador alvo | Microsoft Edge (desktop) |
| Conteúdo das aulas | **Embed do Figma** (só o link é salvo no banco, sem upload de arquivos) |
| Janela flutuante | Document Picture-in-Picture (Edge/Chrome); popup comum como plano B |
| Moeda | Só **🪙 Gold** na primeira versão (sem XP e sem nível) |

## 2. Perfis de usuário (papéis)

| Papel | Escopo | O que faz |
|---|---|---|
| 👑 Admin | Sistema inteiro | Gerencia escolas, turmas, usuários e loja; pode fazer **tudo** que os outros papéis fazem, para **todos** |
| 👔 Diretor | Uma escola | Gerencia turmas, usuários (só professores e alunos) e loja da sua escola; vê o dashboard; avalia submissões e libera conteúdo para alunos da escola |
| 👨‍🏫 Professor | Suas turmas | Cria aulas, avalia submissões, acompanha alunos, libera cursos/aulas para os **seus** alunos, avisa a Gaming House das compras de horas |
| 👨‍🎓 Aluno | Sua turma | Assiste às aulas, envia tarefas, ganha Gold, compra na loja |

Hierarquia: **Escola → Turma → Aluno**  ·  Conteúdo: **Curso → Aulas (skills)**

## 3. Matriz de permissões

| Tela / ação | Admin | Diretor | Professor | Aluno |
|---|---|---|---|---|
| Dashboard de métricas | Todas as escolas | Sua escola | — | — |
| Escolas (CRUD) | ✅ | ❌ | ❌ | ❌ |
| Turmas (CRUD) | Todas | Sua escola | ❌ | ❌ |
| Usuários (CRUD) | Todos os papéis | Só professor e aluno, da sua escola | ❌ | ❌ |
| Cursos (CRUD) | ✅ | ❌ | ❌ | ❌ |
| Aulas / habilidades (CRUD) | ✅ | ✅ | ✅ | ❌ |
| Acompanhamento da turma e análise | Todos | Sua escola | Suas turmas | ❌ |
| Alerta de faltas (amarelo/vermelho) | Todos | Todos da sua escola | Suas turmas (recebe aviso) | ❌ |
| Avaliar submissões (aprovar/devolver) | Todos | Sua escola | Suas turmas | ❌ |
| Liberar curso/aula para aluno | Qualquer aluno | Alunos da sua escola | Alunos das suas turmas | ❌ |
| Loja (gerenciar itens) | Todas as escolas | Loja da sua escola | ❌ | ❌ |
| Ver compras de horas e avisar a Gaming House | Todos | Sua escola | Alunos das suas turmas | ❌ |
| Enviar submissão / comprar na loja | ❌ | ❌ | ❌ | ✅ |

## 4. Requisitos funcionais

### Autenticação e presença
| # | Requisito | Prioridade |
|---|---|---|
| RF01 | Login com e-mail e senha | Alta |
| RF02 | Logout | Alta |
| RF03 | Admin/Diretor redefine a senha de um usuário | Média |
| RF04 | Link "Preciso de ajuda com o login" | Baixa |
| RF05 | Seleção de idioma | Baixa |
| RF79 | **Presença registrada automaticamente quando o aluno faz login** (no máximo 1 por dia) | Alta |
| RF80 | **Sessão expira 2 horas após o login** — evita que outro aluno use uma conta esquecida aberta no computador da escola | Alta |
| RF81 | Avisar o aluno alguns minutos antes da sessão expirar | Baixa |

### Dashboard de métricas (Admin, Diretor)
| # | Requisito | Prioridade |
|---|---|---|
| RF49 | Cards: alunos ativos (com variação vs. mês anterior), taxa de conclusão, tempo médio por módulo, engajamento semanal, taxa de retenção | Média |
| RF50 | Botão para atualizar os dados | Baixa |
| RF51 | Diretor vê só os números da sua escola | Alta |

### Escolas (Admin)
| # | Requisito | Prioridade |
|---|---|---|
| RF06 | Listar escolas (nome, endereço, telefone, status) | Alta |
| RF07 | Criar, editar e excluir escola | Alta |
| RF08 | Escola com status ativa/inativa | Média |

### Turmas (Admin, Diretor)
| # | Requisito | Prioridade |
|---|---|---|
| RF09 | Listar turmas com filtro por escola | Alta |
| RF10 | Criar, editar e excluir turma (nome, **escola obrigatória**, período: manhã/tarde/noite) | Alta |
| RF11 | Mostrar quantidade de alunos por turma | Média |
| RF12 | Turma com status ativa/inativa | Média |
| RF82 | Vincular professores à turma (um professor pode ter várias turmas e vice-versa) | Alta |

### Usuários (Admin, Diretor)
| # | Requisito | Prioridade |
|---|---|---|
| RF13 | Contadores: total, admins, diretores, professores, alunos | Média |
| RF14 | Listar usuários com busca (nome/e-mail) e filtros (papel, escola, turma) | Alta |
| RF15 | Criar usuário: papel, nome, e-mail, senha (mín. 6), escola, turma | Alta |
| RF16 | Editar e excluir usuário | Alta |
| RF17 | Usuário com status ativo/inativo | Média |

### Cursos (Admin)
Cursos atuais: **Desenvolvedor Júnior** e **Desenvolvedor Pleno**. Toda aula pertence a um curso.

| # | Requisito | Prioridade |
|---|---|---|
| RF40 | Listar cursos | Alta |
| RF41 | Criar, editar e excluir curso (nome, descrição, ordem) | Alta |
| RF42 | Mapa de habilidades separado por curso | Alta |

### Aulas / Habilidades
| # | Requisito | Prioridade |
|---|---|---|
| RF18 | Criar aula: nome, número da missão, link de embed do Figma, camada, descrição, dificuldade (fácil/médio/difícil), tempo estimado, curso (**lista de seleção**) | Alta |
| RF19 | Validar link do Figma (aceitar `embed.figma.com` ou `<iframe>`, recusar `www.figma.com`) | Média |
| RF20 | Definir dependências (aulas que precisam ser concluídas antes) | Alta |
| RF21 | Mapa de habilidades gerado automaticamente (camadas + dependências) | Alta |
| RF22 | Editar a ordem das aulas no mapa | Média |
| RF83 | Definir quanto **Gold** a aula dá quando aprovada | Alta |

### Liberação de cursos e aulas
Regra: a liberação é **individual, por aluno**. Professor → alunos das suas turmas; Diretor → alunos da sua escola; Admin → qualquer aluno.

| # | Requisito | Prioridade |
|---|---|---|
| RF43 | Escolher o(s) curso(s) de cada aluno | Alta |
| RF44 | Desbloquear um curso inteiro para um aluno específico | Alta |
| RF45 | Desbloquear uma aula específica para um aluno, **ignorando as dependências** | Alta |
| RF46 | Bloquear de novo o que foi liberado manualmente | Média |
| RF47 | No mapa do aluno, diferenciar aula liberada por progresso × liberada manualmente | Baixa |
| RF48 | Registrar quem liberou e quando (histórico) | Baixa |

### Mapa do Mundo (Aluno)
Menu do aluno: **🗺️ Mapa do Mundo** e **📊 Minhas Estatísticas**. Cabeçalho mostra avatar, nome e saldo de Gold.

| # | Requisito | Prioridade |
|---|---|---|
| RF57 | Seletor de curso no mapa (só os cursos liberados para o aluno) | Alta |
| RF58 | Mapa em grafo: aulas como nós ligados pelas dependências, organizados em camadas | Alta |
| RF59 | Estado de cada nó: ✓ concluída · ► disponível · ⏳ pendente de avaliação · 🔙 devolvida · 🔒 bloqueada | Alta |
| RF23 | Uma aula fica disponível se as dependências foram aprovadas **ou** se foi liberada manualmente | Alta |
| RF60 | Clicar numa aula disponível abre a janela da aula | Alta |

### Janela da aula (Aluno)
| # | Requisito | Prioridade |
|---|---|---|
| RF61 | Cabeçalho: título e dificuldade | Alta |
| RF24 | Conteúdo: embed do Figma | Alta |
| RF25 | **Botão "Abrir em janela flutuante"** (Document PiP) — novidade em relação à referência | Alta |
| RF63 | Etiquetas: tempo estimado e dificuldade | Baixa |
| RF64 | Alternar tela cheia; fechar | Média |
| RF65 | Campo "Link público da missão" (Google Drive, Dropbox, GitHub) + Enviar / Cancelar | Alta |
| RF66 | Dica de envio (ex.: "Submeta código bem documentado") | Baixa |
| RF84 | Se a tarefa foi devolvida, mostrar o comentário do avaliador | Alta |

### Submissões (Aluno → Professor / Diretor)
```
Aluno conclui a aula → envia link da tarefa
        ↓
Aparece em "Novas" para o professor (da turma) e o diretor (da escola)
        ↓
Avaliação ──► ✅ Aprovar  → aula concluída → libera as dependentes → aluno ganha Gold
          └─► 🔙 Devolver → aluno corrige e reenvia → volta para "Novas"
```

| # | Requisito | Prioridade |
|---|---|---|
| RF26 | Aluno envia submissão (link) para uma aula | Alta |
| RF27 | Lista de submissões com filtro: todas, novas, aprovadas, devolvidas | Alta |
| RF28 | Avaliador aprova ou devolve, com comentário opcional | Alta |
| RF29 | Contadores de novas / aprovadas / devolvidas | Média |
| RF30 | **Aprovar** marca a aula como concluída e libera as aulas que dependiam dela | Alta |
| RF37 | **Aprovar** credita o Gold da aula no saldo do aluno | Alta |
| RF52 | **Devolver** mostra o comentário ao aluno e permite reenviar | Alta |
| RF53 | Enquanto aguarda avaliação, a aula aparece como "pendente" | Alta |
| RF54 | Professor vê só suas turmas; diretor, sua escola; admin, todos | Alta |
| RF55 | Validar que o link é público (Drive, Dropbox, GitHub) | Baixa |
| RF56 | Contador/badge de submissões novas | Baixa |

### Acompanhamento da turma
| # | Requisito | Prioridade |
|---|---|---|
| RF31 | Tabela por aluno: aula atual, status, progresso | Alta |
| RF32 | Status do aluno: no trilho / aguardando / atrasado; atrasados fixados no topo | Média |
| RF85 | Ver presenças de cada aluno | Média |

### Alerta de faltas (Professor, Diretor)
Cada turma tem aula **uma vez por semana**. Se o aluno não fizer login naquela semana, conta **1 falta**.

| Faltas seguidas | Cor do aluno | Ação |
|---|---|---|
| 0 | normal | — |
| 1 semana | 🟡 **amarelo** | — |
| 2 semanas ou mais | 🔴 **vermelho** | **aviso** para o professor (e visível ao diretor) |

A contagem zera quando o aluno volta a fazer login.

| # | Requisito | Prioridade |
|---|---|---|
| RF93 | Turma tem dia da semana e horário da aula | Alta |
| RF94 | Calcular faltas seguidas de cada aluno (semanas sem presença desde a última aula assistida) | Alta |
| RF95 | Na lista de alunos, destacar em **amarelo** com 1 falta e **vermelho** com 2+ faltas seguidas; vermelhos e amarelos no topo | Alta |
| RF96 | Professor recebe **aviso** (badge/contador no menu) quando um aluno das suas turmas chega a 2 faltas seguidas | Alta |
| RF97 | Diretor vê o painel de faltas de **todos os alunos da escola**, com filtro por turma; admin vê de todas as escolas | Alta |
| RF98 | Professor/diretor marca o aviso como "visto/contatado" (some até nova falta) | Média |
| RF99 | Cadastrar semanas sem aula (feriado, recesso) para não contar como falta | Média |

### Análise
| # | Requisito | Prioridade |
|---|---|---|
| RF33 | Gráfico de atividade semanal (submissões × aprovações) | Baixa |
| RF34 | Taxa de retenção (últimas 8 semanas) | Baixa |
| RF35 | Distribuição de status da turma | Baixa |
| RF36 | Desempenho geral (conclusão, engajamento, retenção, tempo médio, ativos) | Baixa |

### Minhas Estatísticas (Aluno)
| # | Requisito | Prioridade |
|---|---|---|
| RF67 | Cards: total de aulas, concluídas, progresso (%) | Alta |
| RF68 | Aula atual (nome e número da missão) | Média |
| RF69 | Resumo de presenças: total, primeira, última | Média |
| RF70 | Calendário de presenças (presente/ausente) com filtro de período | Média |
| RF71 | Últimas presenças com data e hora | Baixa |

### Loja — Aluno
Moeda: **🪙 Gold**, ganho com tarefas aprovadas.

**Tipos de item:**
| Tipo | Como o aluno recebe |
|---|---|
| Modelos 3D | Download do arquivo |
| Templates de botão | Download do arquivo |
| UnityPacks | Download do arquivo (`.unitypackage`) |
| Animações | Download do arquivo |
| Horas de jogo na Gaming House | O **professor é avisado** da compra e comunica a Gaming House (fora da plataforma) |

**Cada escola tem a sua loja.** O aluno só vê os itens da escola dele.

**Fluxo da compra de horas:**
```
Aluno compra horas com Gold → compra fica "Aguardando aviso"
        ↓
Professor da turma vê a compra (badge/contador) → avisa a Gaming House
        ↓
Professor marca como "Avisado" → aluno vê o status atualizado
```

| # | Requisito | Prioridade |
|---|---|---|
| RF77 | Loja da escola do aluno, com saldo de Gold e filtro por tipo de item | Alta |
| RF39 | Comprar item com Gold (desconta o saldo; não permite saldo negativo) | Alta |
| RF76 | "Meus itens": itens comprados, com botão de download (itens digitais) e status (horas) | Alta |
| RF87 | Extrato de Gold: ganhos (aula aprovada) e gastos (compras) | Média |

### Compras de horas (Professor)
| # | Requisito | Prioridade |
|---|---|---|
| RF86 | Lista de compras de horas dos alunos das suas turmas, com filtro: aguardando aviso / avisado | Alta |
| RF89 | Marcar compra como "Avisado à Gaming House" (registra quem e quando) | Alta |
| RF92 | Contador/badge de compras aguardando aviso | Média |

### Loja — Gestão (Diretor, Admin)
| # | Requisito | Prioridade |
|---|---|---|
| RF38 | Criar, editar e excluir itens da loja **da sua escola**: nome, descrição, imagem, preço em Gold, tipo, arquivo (itens digitais) ou quantidade de horas (Gaming House) | Alta |
| RF88 | Ativar/desativar item sem excluir | Média |
| RF90 | Ajustar Gold de um aluno manualmente (bônus/correção), com motivo registrado | Média |
| RF91 | Histórico de compras por aluno | Média |

## 5. Requisitos não funcionais

| # | Requisito |
|---|---|
| RNF01 | Funcionar no Microsoft Edge desktop (recurso completo); outros navegadores com plano B |
| RNF02 | Controle de acesso por papel, aplicado no **banco** (não só na tela) |
| RNF03 | Sessão não pode cair ao recarregar a página (problema da referência); expira só após 2h |
| RNF04 | Dados de alunos (muitos menores de idade) protegidos — atenção à LGPD |
| RNF05 | Arquivos do Figma compartilhados como "qualquer pessoa com o link pode ver" |
| RNF06 | Interface em português, com opção de idioma |
| RNF07 | Arquivos da loja (modelos 3D, UnityPacks etc.) em storage; download só para quem comprou |
| RNF08 | Saldo de Gold nunca negativo; compra e desconto acontecem juntos (transação) |

## 6. Fica para depois (não entra na primeira versão)

- XP e nível
- Personagem 3D animado e "Exportar para Unity"
- Avatares 2D / skins equipáveis

## 7. Pendências

- [x] Cada escola tem a sua loja
- [x] Horas de Gaming House: professor é avisado da compra e comunica a Gaming House
- [x] Avaliação: só aprovar ou devolver, com comentário (sem nota)
- [x] Banco: Supabase (ver `modelo-banco.md`)
- [x] Toda turma tem aula **uma vez por semana**
