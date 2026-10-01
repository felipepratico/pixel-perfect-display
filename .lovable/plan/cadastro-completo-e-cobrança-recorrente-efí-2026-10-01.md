# Cadastro completo e cobrança recorrente Efí

## Objetivo
Transformar os lançamentos atuais em um cadastro central de clientes e contratos, com controle comercial, técnico e financeiro. Preparar a emissão recorrente Efí em homologação, preservando os dados existentes.

## O que será construído

1. **Cadastro de clientes e grupos**
   - Criar um cadastro por cliente/CNPJ, ligado opcionalmente a um grupo empresarial.
   - Converter automaticamente os lançamentos atuais em clientes, evitando duplicidade por CNPJ e, quando não houver CNPJ, por nome.
   - Permitir pesquisar e filtrar clientes pelo grupo, CNPJ e nome.

2. **Planos, computadores e módulos**
   - Plano **BÁSICO** com sugestão de R$ 80,00 e **COMPLETO** com sugestão de R$ 100,00, ambos ajustáveis por cliente.
   - Quantidade de computadores, valor de computador adicional e total contratado calculado automaticamente.
   - Módulos padronizados: **PRÁTICO**, **PDV**, **PDVNF-E**, **NF-E**, **MOBILE (MESA/COMANDA)** e **MOBILE PEDIDO**.
   - Indicadores de ticket médio geral, por plano, módulo e grupo.

3. **Controles técnicos e atendimento**
   - Rede VPN, último backup salvo, versão instalada e data da última atualização.
   - Versão atual configurável para identificar clientes atualizados e pendentes.
   - Certificado digital, chave Pix, observações e histórico de atendimentos.
   - Alertas visuais para backup atrasado, versão desatualizada e certificado próximo do vencimento.

4. **Histórico e auditoria**
   - Relatórios de novos clientes e novos títulos por dia ou período.
   - Substituir exclusão definitiva por lixeira recuperável.
   - Registrar quem criou, alterou, excluiu ou restaurou cada registro e quando ocorreu.

5. **Cobrança recorrente Efí em homologação**
   - Criar a estrutura segura no servidor para autenticar na API Cobranças da Efí e gerar cobranças recorrentes/Bolix.
   - Guardar identificador, situação, vencimento, link do boleto, linha digitável e dados Pix vinculados ao título.
   - Adicionar emissão individual e em lote, com proteção contra cobranças duplicadas.
   - Incluir o link de pagamento nas mensagens do WhatsApp.
   - Criar uma entrada pública segura para notificações e confirmar o status consultando novamente a Efí antes de marcar como pago.
   - Depois da estrutura pronta, solicitar pelo formulário seguro o Client ID e Client Secret de homologação; nenhuma credencial ficará no código.

6. **Telas e navegação**
   - Manter o painel financeiro atual e adicionar áreas claras para **Clientes**, **Operação técnica**, **Auditoria** e **Cobranças Efí**.
   - Adaptar formulários, filtros, relatórios e impressão para usar o cadastro central sem perder os lançamentos existentes.

## Segurança e dados
- Cada usuário continuará acessando somente os próprios clientes, títulos, cobranças e históricos.
- Todos os dados enviados ao banco e à Efí serão validados no navegador e no servidor.
- A migração manterá os lançamentos existentes e permitirá desfazer exclusões pela lixeira.
- O ambiente inicial será exclusivamente **homologação**; produção só será ativada após validação explícita.

## Validação
- Conferir a conversão automática dos dados atuais.
- Testar cadastro, edição, grupos, módulos, cálculos, filtros, lixeira e relatórios.
- Testar emissão recorrente sem cobrança real em homologação, retorno de status e mensagem de WhatsApp.
- Verificar o painel em computador e celular, além dos relatórios impressos.
