# Integrar gerador de assinaturas e boletos Efí

## Objetivo
Transformar a página **Cobranças Efí** em uma tela operacional para gerar assinaturas recorrentes e o primeiro boleto em homologação, usando os clientes já cadastrados e preservando as credenciais somente no servidor.

## O que será construído
1. **Formulário de emissão**
   - Seleção de cliente cadastrado com preenchimento de razão social, CNPJ, e-mail, telefone, endereço, valor contratado e vencimento.
   - Campos ajustáveis para ID do plano Efí, nome do serviço, valor mensal, data do primeiro vencimento e instruções do boleto.
   - Consulta opcional de CNPJ para preencher dados cadastrais, sem substituir automaticamente o cadastro central.
   - Validação dos dados obrigatórios antes da emissão.

2. **Emissão segura em homologação**
   - Função autenticada no servidor para obter autorização Efí e criar a assinatura/boleto recorrente.
   - Uso das credenciais de homologação já armazenadas com segurança.
   - Proteção contra emissão duplicada para o mesmo cliente, plano e primeiro vencimento.
   - Registro da assinatura, cobrança, status, vencimento, valor, link e linha digitável no histórico do usuário.

3. **Acompanhamento das cobranças**
   - Lista pesquisável das emissões feitas, com cliente, valor, vencimento, situação e identificadores Efí.
   - Ações para copiar link/linha digitável e abrir a cobrança no WhatsApp.
   - Valores ocultos inicialmente, seguindo a privacidade já adotada no restante do sistema.
   - Estados claros para credenciais indisponíveis, envio em andamento, sucesso e erro.

4. **Correções necessárias**
   - Corrigir o erro atual que impede a abertura do sistema.
   - Manter a navegação, aparência e metadados próprios da página Cobranças Efí.

## Detalhes técnicos
- React/TanStack na interface; nenhuma credencial ou chamada Efí será executada no navegador.
- Função de servidor autenticada e validação com limites de tamanho/formato.
- A integração permanecerá exclusivamente no ambiente de homologação.
- O cadastro de clientes continuará sendo a fonte dos dados contratuais; a cobrança apenas referencia o cliente.

## Validação
- Conferir preenchimento automático ao escolher um cliente.
- Testar validações e bloqueio de duplicidade.
- Emitir uma assinatura de homologação e confirmar que o retorno aparece no histórico.
- Verificar cópia e WhatsApp em computador e celular.
- Confirmar que o sistema compila e abre sem erros.
