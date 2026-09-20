# Runbook — ChatGPT com acesso controlado ao computador Linux

## 1. Objetivo

Instalar e usar o OpenAI Codex CLI no Linux Mint para conversar com um agente de IA pelo terminal e permitir que ele, sob controle do usuário:

- leia arquivos de uma pasta autorizada;
- analise projetos, logs e configurações;
- crie e edite arquivos;
- execute comandos locais;
- rode testes e verificações;
- solicite autorização antes de ações que ultrapassem os limites configurados.

## 2. Resposta principal

A forma recomendada para dar ao ChatGPT acesso à sua máquina é usar o **Codex CLI** dentro de uma pasta de trabalho específica.

O Codex CLI é executado localmente, mas o modelo de IA normalmente é acessado pela internet. Portanto:

- os comandos e as ferramentas são executados no seu computador;
- somente os arquivos alcançáveis pelas permissões concedidas podem ser usados;
- o modelo não deve receber acesso irrestrito ao sistema;
- não se deve executar o Codex como `root` nem com `sudo`;
- o ideal é abrir o Codex apenas dentro da pasta do projeto que será analisado.

## 3. Diferença entre ChatGPT local e modelo totalmente offline

| Opção | Onde a IA é executada | Acesso aos arquivos locais | Internet | Indicação |
|---|---|---:|---:|---|
| Codex CLI | Modelo da OpenAI; ferramentas na máquina | Sim, conforme permissões | Normalmente necessária | Recomendado para projetos, código e administração assistida |
| ChatGPT no navegador | Serviço da OpenAI | Apenas arquivos enviados ou recursos explicitamente conectados | Necessária | Conversas e análise de arquivos enviados |
| Modelo local, como Ollama | Inteiramente no computador | Depende da aplicação criada | Pode funcionar offline | Privacidade/offline, mas não é o ChatGPT da OpenAI |

## 4. Riscos e limites

Um agente com acesso ao terminal pode, dependendo da autorização concedida:

- alterar ou apagar arquivos;
- executar scripts maliciosos existentes em um projeto;
- visualizar segredos armazenados em arquivos;
- modificar configurações;
- acessar a rede;
- executar comandos com consequências inesperadas.

Por esse motivo, nunca conceda acesso automático a:

- `/`;
- `/etc`;
- `/boot`;
- `/root`;
- toda a sua pasta pessoal;
- `~/.ssh`;
- `~/.aws`;
- arquivos `.env` com senhas ou tokens;
- diretórios que contenham backups, documentos pessoais ou credenciais.

## 5. Pré-requisitos

- Linux Mint ou outra distribuição Linux compatível;
- acesso normal ao terminal;
- conexão com a internet;
- conta ChatGPT compatível com o Codex ou outro método de autenticação apresentado pelo programa;
- Git recomendado para criar pontos de restauração dos projetos.

Verifique o sistema:

```bash
cat /etc/os-release
uname -m
git --version
```

Se o Git não estiver instalado:

```bash
sudo apt update
sudo apt install -y git curl
```

O `sudo` é usado somente para instalar pacotes do sistema. Não use `sudo codex`.

## 6. Instalação oficial do Codex CLI

Antes de executar um instalador recebido pela internet, você pode primeiro baixá-lo e inspecioná-lo:

```bash
curl -fsSL https://chatgpt.com/codex/install.sh -o /tmp/codex-install.sh
less /tmp/codex-install.sh
```

Depois da inspeção, execute como seu usuário normal:

```bash
sh /tmp/codex-install.sh
```

A documentação oficial também apresenta a instalação direta:

```bash
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

Feche e abra novamente o terminal se o comando ainda não estiver no caminho do sistema.

Valide a instalação:

```bash
command -v codex
codex --version
```

## 7. Preparação de uma pasta segura

Crie uma pasta dedicada. O exemplo não expõe toda a pasta pessoal:

```bash
mkdir -p "$HOME/Projetos/laboratorio-codex"
cd "$HOME/Projetos/laboratorio-codex"
```

Inicialize o Git para registrar alterações:

```bash
git init
printf '# Laboratório Codex\n' > README.md
git add README.md
git commit -m "Estado inicial antes do Codex"
```

Se o Git solicitar nome e e-mail, configure-os antes do commit:

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu-email@example.com"
```

Não copie segredos para essa pasta.

## 8. Inicialização e autenticação

Entre primeiro na pasta autorizada e execute:

```bash
cd "$HOME/Projetos/laboratorio-codex"
codex
```

Na primeira execução:

1. escolha a opção de entrar com a conta ChatGPT, se ela estiver disponível;
2. conclua a autenticação no navegador;
3. volte ao terminal;
4. confirme qual pasta o Codex está usando;
5. revise as permissões apresentadas antes de aceitar.

Nunca cole senha da sua conta, chave SSH, chave secreta AWS ou token pessoal diretamente na conversa.

## 9. Configuração inicial dentro do Codex

Comandos úteis da interface:

```text
/status
/permissions
/model
/init
```

Finalidade:

- `/status`: mostra a sessão, o modelo e a pasta atual;
- `/permissions`: permite revisar o que o agente pode fazer;
- `/model`: escolhe o modelo e o nível de raciocínio disponíveis;
- `/init`: cria um `AGENTS.md`, arquivo usado para registrar regras permanentes do projeto.

Recomendação inicial de permissões:

- permitir leitura na pasta atual;
- permitir alterações apenas na pasta atual;
- exigir confirmação para comandos sensíveis;
- manter o acesso de rede limitado quando não for necessário;
- não liberar comandos privilegiados com `sudo`.

## 10. Regras recomendadas no AGENTS.md

Use `/init` e adapte o arquivo para incluir regras semelhantes a estas:

```markdown
# Regras deste projeto

- Trabalhe somente dentro desta pasta.
- Antes de apagar, sobrescrever ou mover arquivos, solicite confirmação.
- Não leia arquivos de credenciais, chaves SSH, configurações AWS ou arquivos .env.
- Não execute sudo.
- Não instale pacotes globais sem autorização.
- Não faça push, deploy ou alteração em serviços externos sem autorização explícita.
- Antes de editar, informe quais arquivos serão alterados.
- Depois de editar, execute os testes existentes e apresente o resumo das mudanças.
- Preserve alterações existentes que não façam parte da tarefa.
```

Essas regras orientam o agente, mas não substituem as permissões técnicas e sua revisão dos comandos.

## 11. Primeiro teste seguro

No prompt do Codex, solicite apenas leitura:

```text
Liste os arquivos desta pasta e explique o conteúdo. Não altere nem execute nada.
```

Depois, teste uma criação simples:

```text
Crie o arquivo teste-codex.txt com a frase "Codex configurado com acesso controlado". Não modifique outros arquivos.
```

Valide em outro terminal:

```bash
cd "$HOME/Projetos/laboratorio-codex"
ls -la
cat teste-codex.txt
git status
git diff
```

## 12. Uso em um projeto real

Faça um backup ou commit antes:

```bash
cd /caminho/do/projeto
git status
git add -A
git commit -m "Checkpoint antes da assistência do Codex"
codex
```

Exemplos de pedidos seguros e objetivos:

```text
Analise este projeto e explique sua estrutura. Não faça alterações.
```

```text
Analise este log, identifique a causa provável do erro e apresente um plano. Não aplique correções ainda.
```

```text
Corrija apenas o arquivo main.yml. Antes de editar, mostre o problema; depois execute o validador disponível.
```

```text
Revise as alterações atuais do Git e aponte riscos sem modificar arquivos.
```

## 13. Como controlar o alcance

O principal controle é iniciar o Codex no diretório correto:

```bash
cd /caminho/exato/do/projeto
pwd
codex
```

Antes de começar, confirme:

```bash
pwd
git status
find . -maxdepth 2 -type f | head -50
```

Não execute a ferramenta a partir de `/`, da pasta pessoal inteira ou de diretórios que misturem projetos e credenciais.

## 14. Proteção de segredos

Adicione arquivos sensíveis ao `.gitignore` quando apropriado:

```gitignore
.env
.env.*
*.pem
*.key
credentials
secrets/
terraform.tfstate
terraform.tfstate.*
```

O `.gitignore` impede o Git de versionar arquivos, mas não impede automaticamente que um programa local os leia. A proteção real exige:

- não colocar segredos na pasta de trabalho;
- usar permissões restritas no sistema;
- não autorizar leitura fora do escopo;
- revisar o que será enviado ao modelo;
- usar credenciais temporárias e de menor privilégio quando indispensáveis.

Verifique possíveis segredos antes de iniciar:

```bash
find . -maxdepth 3 -type f \( -name '.env*' -o -name '*.pem' -o -name '*.key' -o -name '*credential*' \) -print
```

## 15. Uso com AWS, Terraform e Kubernetes

Como esses ambientes podem alterar infraestrutura real, comece somente com comandos de leitura.

Exemplos:

```text
Analise os arquivos Terraform, mas não execute terraform apply, destroy ou import.
```

```text
Execute somente terraform fmt -check e terraform validate. Solicite confirmação antes de qualquer outro comando.
```

```text
Mostre o contexto atual do kubectl e proponha os comandos. Não execute alterações no cluster.
```

Evite liberar automaticamente:

- `terraform apply`;
- `terraform destroy`;
- `kubectl delete`;
- `aws ... delete-*`;
- alterações de IAM;
- publicação de imagens e deploy;
- comandos que revelem variáveis de ambiente;
- leitura direta de `~/.aws` e `~/.kube` sem necessidade e autorização.

## 16. Revisão e reversão

Depois de cada atividade:

```bash
git status
git diff --stat
git diff
```

Se estiver correto:

```bash
git add -A
git commit -m "Alterações assistidas pelo Codex"
```

Se houver alterações indesejadas, não use comandos destrutivos sem revisar. Primeiro identifique exatamente os arquivos alterados:

```bash
git status --short
git diff -- nome-do-arquivo
```

Para arquivos importantes sem Git, mantenha cópia de segurança antes da sessão.

## 17. Atualização

O instalador oficial pode ser executado novamente para atualizar:

```bash
curl -fsSL https://chatgpt.com/codex/install.sh -o /tmp/codex-install.sh
less /tmp/codex-install.sh
sh /tmp/codex-install.sh
codex --version
```

## 18. Diagnóstico de problemas

### Comando `codex` não encontrado

```bash
command -v codex
printf '%s\n' "$PATH"
```

Feche e abra o terminal. Se necessário, verifique a mensagem apresentada pelo instalador para adicionar o diretório correto ao `PATH`.

### Falha de autenticação

- confirme data e hora do sistema;
- verifique conexão com a internet;
- tente novamente em um terminal normal, sem `sudo`;
- permita que o navegador conclua o login;
- não compartilhe códigos, tokens ou URLs privadas de autenticação.

### Permissão negada ao ler um arquivo

Isso pode ser uma proteção correta. Confirme se o arquivo realmente pertence ao projeto e se precisa ser acessado. Não amplie permissões para toda a máquina.

### Alteração não desejada

1. pare a sessão;
2. execute `git status`;
3. examine `git diff`;
4. restaure somente o arquivo necessário após confirmar o alvo;
5. reduza as permissões antes de iniciar novamente.

## 19. Modelo local completamente offline

Se a exigência for manter perguntas, respostas e modelo totalmente dentro da máquina, o Codex/ChatGPT conectado ao serviço da OpenAI não é a mesma arquitetura. Nesse caso, uma alternativa é instalar um executor de modelos locais, como Ollama, e usar um modelo compatível com o hardware.

Essa alternativa:

- não transforma o modelo local no ChatGPT;
- exige memória RAM e, para bom desempenho, uma GPU adequada;
- precisa de uma interface ou agente separado para acessar arquivos e executar comandos;
- também deve usar permissões restritas e uma pasta isolada.

## 20. Checklist de segurança

- [ ] Codex instalado como usuário normal.
- [ ] Sessão iniciada dentro da pasta exata do projeto.
- [ ] Projeto possui backup ou checkpoint Git.
- [ ] Credenciais e documentos pessoais estão fora da pasta.
- [ ] Permissões revisadas com `/permissions`.
- [ ] Nenhuma execução com `sudo codex`.
- [ ] Comandos destrutivos exigem confirmação.
- [ ] Acesso à internet limitado ao necessário.
- [ ] Diferenças revisadas com `git diff` após cada mudança.
- [ ] Deploy, push e mudanças externas somente mediante autorização explícita.

## 21. Fontes oficiais

- Codex CLI: https://learn.chatgpt.com/docs/codex/cli
- Segurança e permissões do Codex: https://learn.chatgpt.com/docs/security
- Referência de configuração: https://learn.chatgpt.com/docs/config-file/config-reference

## 22. Registro desta atividade

Este runbook foi produzido para orientar a instalação do acesso local controlado. Nenhuma instalação foi executada na máquina do usuário, nenhuma credencial foi solicitada e nenhuma configuração externa foi alterada. A implementação deve ser realizada no computador do usuário seguindo as validações e os limites descritos acima.
