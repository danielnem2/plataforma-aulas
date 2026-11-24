# Pendências para quando você voltar

## 1. Testar o lado do aluno (eu não consegui)
Não tenho senha de nenhum aluno (e não crio contas sozinho), então as telas do aluno
compilam e foram revisadas, mas **não foram abertas de verdade**. Roteiro de teste:

1. **Aulas** → crie 2 aulas no curso Júnior com links reais do Figma; na 2ª marque a 1ª como dependência.
2. **Usuários** → crie (ou use) um aluno numa turma.
3. **Alunos** → abra o aluno → marque o curso **Desenvolvedor Júnior** → Salvar cursos.
4. Saia e entre como o aluno:
   - **Mapa do Mundo**: a 1ª aula deve estar ► disponível e a 2ª 🔒 bloqueada.
   - Clique na 1ª → a apresentação do Figma abre → teste **🪟 Janela flutuante** (no Edge) → envie um link do Drive.
5. Entre como professor/admin → **Submissões** → aprove → o aluno ganha 🪙 e a 2ª aula libera.
6. **Loja** (coordenador/admin) → crie um item de horas na Gaming House → como aluno, compre → em **Compras de horas**, marque como avisado.

Se algo der erro, me diga a tela e o que fez — eu olho o log do servidor.

## 2. Segurança
- [ ] **Trocar a senha do admin** (`admin@adm.com`): ela apareceu no chat. Supabase → Authentication → Users → Reset password. Ideal: usar um e-mail real seu.

## 3. Publicação
- [x] Projeto em `Documentos\plataforma-aulas`, código no GitHub (`danielnem2/plataforma-aulas`, privado).
- [x] Site no ar: **https://plataforma-aulas-tau.vercel.app** (atualiza sozinho a cada push).
- [ ] Testar o login no site publicado.
- [ ] Supabase → Authentication → URL Configuration → **Site URL** = endereço acima.
- [ ] Ativar **2FA** na Vercel e no GitHub (a Vercel está sugerindo).

## 4. Configurações a conferir
- [ ] **Tamanho máximo de arquivo da loja**: no plano gratuito do Supabase o limite por arquivo é de cerca de 50 MB. UnityPacks maiores vão falhar no upload. (Supabase → Storage → Settings.)
- [ ] Os arquivos do Figma precisam estar compartilhados como **"qualquer pessoa com o link pode ver"**, senão o aluno vê a tela de login do Figma.

## 5. Decisões que tomei — confirme ou peça mudança
- **Aulas são globais e só o ADM gerencia** (migração `0006_aulas_so_admin.sql`): criar, editar, remover e encaixar aulas é só do ADM. Professor e coordenador veem as aulas e usam "Enviar dúvida ao ADM".
- **"Diretor" aparece como "Coordenador"** na tela.
- **Status do aluno** (no trilho / atrasado) usa as **faltas** + "aguardando avaliação". Não criei regra de atraso por tempo sem entregar tarefa — se quiser (ex.: 2 semanas sem enviar nada), me diga o prazo.
- **Links aceitos no envio de tarefa**: Google Drive/Docs, Dropbox, GitHub e OneDrive.
- **Senha mínima**: 8 caracteres.
- Ninguém é excluído: usuários, turmas e itens da loja são **desativados** (o histórico fica).
- **Aulas** (migração `0004_cadeia_aulas.sql`, já rodada):
  - Coluna no mapa, posição na coluna e nº da missão são **calculados sozinhos** pelos pré-requisitos.
  - "Remover aula" (só ADM): quem dependia dela passa a depender dos pré-requisitos dela. Sem entregas de alunos → excluída de vez; com entregas → arquivada (some do mapa, histórico fica).
  - "Nova aula → Depois de X" encaixa no meio: o que vinha depois de X passa a vir depois da nova.
- **Revisões de aulas** (migração `0005_revisoes_aula.sql`, já rodada):
  - Professor e coordenador enviam ao ADM uma dúvida sobre uma missão (dele ou de um aluno) em Aulas → "Enviar dúvida ao ADM".
  - Só o ADM vê todas e responde; quem enviou vê as suas com a resposta em "Revisões de aulas".
  - Contador no menu só para o ADM (dúvidas abertas). Não há aviso por e-mail.
- **Contratos** (migração `0003_contratos.sql`, já rodada):
  - Contrato de N meses começa 00:00 da data de início; o último dia de acesso é a véspera da mesma data N meses depois (24/11 + 6 meses → acesso até 23/05).
  - Aula experimental: 24h a partir da data/hora escolhida (padrão: agora).
  - Antes do início ou depois do fim o aluno **não entra** (e é desconectado se estiver logado).
  - Alunos cadastrados antes desta regra ficam **"sem contrato"** e continuam entrando até a coordenação cadastrar o contrato.
  - Professor vê os contratos da turma, mas só coordenação/admin altera.

## 6. Dados de teste que deixei no banco
- Aula **"[TESTE] Aula de teste"** no curso Júnior — está **inativa** (não aparece para alunos). Pode deixar ou reaproveitar editando.

## 7. Não implementado (e por quê)
| Requisito | Motivo |
|---|---|
| RF05 Seleção de idioma | Baixa prioridade; tudo está em português |
| RF04 "Ajuda com o login" | Precisa saber para onde mandar (WhatsApp? e-mail da escola?) |
| Personagem 3D, XP, nível, skins | Ficaram para depois, como combinado |
| Avisos em tempo real | Os contadores do menu atualizam ao navegar/recarregar, não sozinhos |
