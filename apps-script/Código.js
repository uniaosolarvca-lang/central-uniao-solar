/*************************************************************
 *  UNIÃO SOLAR — Registro automático de orçamentos
 *
 *  Dois jeitos de registrar, os dois no mesmo motor:
 *   A) App/Web (computador) — POST no Web App  -> doPost
 *   B) Formulário (celular)  — Google Forms     -> onFormSubmit
 *
 *  Em qualquer um deles ele:
 *   1) lança a linha na planilha de controle (aba "Base de Dados")
 *   2) cria a pasta do cliente dentro de ORÇAMENTOS (nome em CAPS)
 *   3) copia a TABELA CERTA para a pasta e preenche os dados
 *
 *  >>> PARA O CELULAR: rode UMA vez a função  setupFormulario  <<<
 *      (menu de funções no topo -> setupFormulario -> Executar)
 *      Ela cria o formulário e deixa o link pronto no seu Drive.
 *************************************************************/

// ===== Configuração (já preenchida para a União Solar) =====
var SHEET_ID          = '1jp2peNYy2BlUoJ2_o233-H7h1icT4g_O';   // planilha de controle
var SHEET_TAB         = 'Base de Dados';
var ORCAMENTOS_FOLDER = '1Yxw9oKp0a38JYo1doDQGM4Q59HZiQ2nD';   // pasta ORÇAMENTOS
var TABELA_MASTER     = '1LBFqWP7T-yWiVwR1PvoPksMezbVxnYqp';   // TABELA CERTA (modelo)
var CLIENTES_FOLDER   = '1q1JyjP-HwB2-v5JnptLdVCetHLMnmXeC';   // pasta CLIENTES
var PLANILHAS_FOLDER  = '11iE0UwzI0neGbMdYKt-CJV8BOU32Tbxs';   // pasta PLANILHAS (para organizar as planilhas do sistema)
var TOKEN             = 'UNIAO-SOLAR-2026';                    // senha simples anti-abuso
var APP_FILE_NAME     = 'UniaoSolar_Central.html';            // app (computador) no Drive
var PERDAS            = 0.20;
var FIN_META_MENSAL   = 200000;                               // meta de vendas do mês (R$) — altere aqui quando quiser

// ligação -> "Classificação de Rede" da planilha de dimensionamento
var LIG_MAP = {
  'Monofásico': 'Monofásica 220V',
  'Bifásico'  : 'Bifásica 127/220V',
  'Trifásico' : 'Trifásica 220/380V'
};

/* ================= A) APP / WEB (computador) ================= */

function doGet(e){
  // Link da equipe de execução (por obra) — página enxuta pro celular
  if (e && e.parameter && e.parameter.exec){
    return HtmlService.createHtmlOutput(_paginaExecucao(e.parameter))
      .setTitle('União Solar — Execução de Obra')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  var it = DriveApp.getFilesByName(APP_FILE_NAME);
  if(!it.hasNext()){
    return HtmlService.createHtmlOutput(
      '<h2 style="font-family:Arial">Arquivo do app nao encontrado no Drive</h2>' +
      '<p style="font-family:Arial">Envie o arquivo <b>' + APP_FILE_NAME + '</b> para o seu Google Drive.</p>');
  }
  var html = it.next().getBlob().getDataAsString('UTF-8');
  return HtmlService.createHtmlOutput(html)
    .setTitle('União Solar — Central')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e){
  try{
    var d = JSON.parse(e.postData.contents);
    if (d.token !== TOKEN) return _json({ ok:false, erro:'Token inválido' });
    if (d.acao === 'contrato') return _json( gerarContrato(d) );    // gera PDFs + move
    if (d.acao === 'mover') return _json( moverCliente(d.nome) );   // ORÇAMENTOS -> CLIENTES
    if (d.acao === 'fin_saida')   return _json( finAddSaida(d) );   // registra gasto
    if (d.acao === 'fin_receber') return _json( finReceber(d) );    // valida recebimento
    if (d.acao === 'fin_listar')  return _json( finListar(d) );     // em aberto + resumo
    if (d.acao === 'fin_entrada') return _json( finAddEntrada(d) ); // entrada manual (avulsa)
    if (d.acao === 'fin_relatorio') return _json( finRelatorioAcao(d) ); // gera PDF do mês
    if (d.acao === 'obra_listar') return _json( obraListar(d) );    // lista de obras
    if (d.acao === 'obra_get')    return _json( obraGet(d) );       // detalhe de uma obra
    if (d.acao === 'obra_salvar') return _json( obraSalvar(d) );    // salva checklist
    if (d.acao === 'obra_os')     return _json( obraGerarOS(d) );   // gera Ordem de Serviço (PDF)
    if (d.acao === 'pos_registrar') return _json( posRegistrar(d) ); // registra chamado
    if (d.acao === 'pos_listar')    return _json( posListar(d) );    // lista de chamados
    if (d.acao === 'pos_nota')      return _json( posGerarNota(d) ); // gera Nota de Serviço (PDF)
    if (d.acao === 'pos_status')    return _json( posStatus(d) );    // Aberto/Concluído
    if (d.acao === 'mkt_listar')    return _json( mktListar(d) );    // funil de leads
    if (d.acao === 'mkt_salvar')    return _json( mktSalvar(d) );    // etapa/contato/retorno
    if (d.acao === 'equipe_salvar') return _json( equipeSalvar(d) ); // cadastra/edita equipe
    if (d.acao === 'equipe_listar') return _json( equipeListar(d) ); // lista equipes
    if (d.acao === 'equipe_excluir')return _json( equipeExcluir(d) );// remove equipe
    if (d.acao === 'exec_fotos_salvar') return _json( execFotosSalvar(d) ); // salva PDF de fotos no Drive
    if (d.acao === 'manut_salvar')  return _json( manutSalvar(d) );
    if (d.acao === 'manut_listar')  return _json( manutListar(d) );
    if (d.acao === 'manut_concluir')return _json( manutConcluir(d) );
    if (d.acao === 'prop_salvar')   return _json( propSalvar(d) );   // salva o PDF da proposta no Drive
    if (d.acao === 'contato_salvar')return _json( contatoSalvar(d) );
    if (d.acao === 'obra_criar')    return _json( obraCriarManual(d) );
    if (d.acao === 'obra_custos_salvar')  return _json( obraCustosSalvar(d) );
    if (d.acao === 'obra_analise_salvar') return _json( obraAnaliseSalvar(d) );
    if (d.acao === 'contrato_excluir')    return _json( contratoExcluir(d) ); // apaga contrato do sistema inteiro
    if (d.acao === 'fin_conta_add')   return _json( finContaAdd(d) );   // registra conta a pagar
    if (d.acao === 'fin_conta_pagar') return _json( finContaPagar(d) ); // marca conta como paga
    return _json( registrar(d) );
  }catch(err){
    return _json({ ok:false, erro: String(err) });
  }
}

// Move a pasta do cliente de ORÇAMENTOS para CLIENTES (acionado ao gerar o contrato).
function moverCliente(nome){
  var alvo = (nome || '').toString().trim().toUpperCase();
  if(!alvo) throw 'Nome do cliente vazio';
  var it = DriveApp.getFolderById(ORCAMENTOS_FOLDER).getFoldersByName(alvo);
  if(!it.hasNext()) return { ok:false, erro:'Pasta não encontrada em ORÇAMENTOS: ' + alvo };
  var pasta = it.next();
  pasta.moveTo(DriveApp.getFolderById(CLIENTES_FOLDER));
  return { ok:true, cliente:alvo, pastaUrl: pasta.getUrl() };
}

/* ================= CONTRATOS (gera PDF + salva na pasta + move) ================= */

function _acharPastaCliente(nome){
  var alvo = (nome||'').toString().trim();
  var tries = [alvo, alvo.toUpperCase()];
  for(var t=0;t<tries.length;t++){
    var it = DriveApp.getFolderById(ORCAMENTOS_FOLDER).getFoldersByName(tries[t]);
    if(it.hasNext()) return it.next();
    it = DriveApp.getFolderById(CLIENTES_FOLDER).getFoldersByName(tries[t]);
    if(it.hasNext()) return it.next();
  }
  return null;
}

function gerarContrato(d){
  var nome = (d.nome||'').toString().trim();
  if(!nome) throw 'Nome do cliente vazio';
  var pasta = _acharPastaCliente(d.pasta || nome);
  if(!pasta) return { ok:false, erro:'Pasta do cliente não encontrada: ' + (d.pasta||nome) };

  // CPF e RG usam SOMENTE o que foi digitado no formulário (sem leitura automática).
  d.cpf = (d.cpf || '').toString().trim();
  d.rg  = (d.rg  || '').toString().trim();
  if(!d.proc_doc) d.proc_doc = d.cpf;   // procuração usa o mesmo documento digitado

  // Se equipamentos/valor não vieram no comando, lê da PROPOSTA na pasta
  if(!d.equipamentos || !d.equipamentos.length){
    var _t = _lerPropostaTexto(pasta);
    if(!_t) return { ok:false, erro:'Proposta (PDF) não encontrada na pasta do cliente.' };
    var _p = _dadosProposta(_t);
    if(!_p.valor || !_p.modulos || !_p.inversor) return { ok:false, erro:'Não consegui extrair valor/equipamentos da proposta.' };
    if(!d.valor)          d.valor = _p.valor;
    if(!d.valor_extenso)  d.valor_extenso = _extensoReais(_num(_p.valor));
    if(!d.marca_modulo)   d.marca_modulo = _p.marcaMod || '';
    if(!d.marca_inversor) d.marca_inversor = _p.marcaInv || '';
    d.equipamentos = [ _p.modulos, _p.inversor, 'Cabo Solar Vermelho', 'Cabo Solar Preto',
      'Conector p/Cabo MC4 Par', 'Fixação p/ Sistema Fotovoltaico para estrutura ' + (_p.estrutura||''),
      'SERVIÇO DE INSTALAÇÃO DO SISTEMA', 'ART, PROJETO E EXECUÇÃO',
      'ACOMPANHAMENTO JUNTO À DISTRIBUIDORA', 'MONITORAMENTO DO SISTEMA VIA WEB' ];
  }
  if(!d.endereco_instalacao) d.endereco_instalacao = d.endereco || '';

  var out = { ok:true, cliente:nome };

  // Contrato
  var htmlC = _htmlContrato(d);
  var pdfC = Utilities.newBlob(htmlC, 'text/html', 'c.html').getAs('application/pdf')
                      .setName('CONTRATO - ' + nome.toUpperCase() + '.pdf');
  out.contratoUrl = pasta.createFile(pdfC).getUrl();

  // Procuração (opcional)
  if (d.procuracao){
    var htmlP = _htmlProcuracao(d);
    var pdfP = Utilities.newBlob(htmlP, 'text/html', 'p.html').getAs('application/pdf')
                        .setName('PROCURAÇÃO - ' + nome.toUpperCase() + '.pdf');
    out.procuracaoUrl = pasta.createFile(pdfP).getUrl();
  }

  // Move pra CLIENTES
  pasta.moveTo(DriveApp.getFolderById(CLIENTES_FOLDER));
  out.pastaUrl = pasta.getUrl();

  // Lança a ENTRADA no Fluxo de Caixa (em aberto) — nunca quebra o contrato se falhar
  try{
    var _fin = finLancarEntradaContrato(d);
    if(_fin && _fin.ok) out.financeiro = _fin;
  }catch(_e){ out.financeiroErro = String(_e); }

  // Cria a OBRA (checklist) automaticamente — nunca quebra o contrato se falhar
  try{
    var _ob = obraCriarDeContrato(d);
    if(_ob && _ob.ok) out.obra = _ob;
  }catch(_e2){ out.obraErro = String(_e2); }

  // Move o lead no funil de Marketing para "Novo Cliente" — nunca quebra o contrato
  try{ mktMarcarNovoCliente(d.nome); }catch(_e3){ out.marketingErro = String(_e3); }

  return out;
}

function _li(arr){ var s=''; for(var i=0;i<arr.length;i++) s+='<li>'+arr[i]+'</li>'; return s; }

function _htmlContrato(d){
  var css = "body{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;color:#222;line-height:1.45}"
    + "h1{font-size:12pt;text-align:center;color:#0e6b31;margin:6px 0}"
    + ".proj{text-align:center;font-weight:bold;margin:2px 0 10px}"
    + "h2{font-size:10.5pt;color:#0e6b31;margin:12px 0 4px}"
    + "p{text-align:justify;margin:5px 0}"
    + ".hd{border-bottom:2px solid #1aa64d;padding-bottom:6px;margin-bottom:8px}"
    + ".hd b{color:#0e6b31;font-size:11pt}.hd .s{font-size:8pt;color:#444}"
    + "ul{margin:4px 0 4px 18px}li{text-align:justify;margin:2px 0}"
    + "table{width:100%;border-collapse:collapse;font-size:9pt;margin:6px 0}"
    + "td,th{border:1px solid #999;padding:4px;text-align:center}"
    + ".note{font-size:8.5pt;color:#444;margin:3px 0}"
    + ".pb{page-break-before:always}"
    + ".sign{margin-top:46px;text-align:center}.line{border-top:1px solid #000;width:72%;margin:34px auto 4px}"
    + ".sign b{display:block}.wit{margin-top:40px}.wit .line{width:60%;margin:26px 0 2px}";

  var h = '<html><head><meta charset="utf-8"><style>'+css+'</style></head><body>';
  h += '<div class="hd"><b>SUDOESTE SOLUÇÕES ELÉTRICAS LTDA</b><div class="s">CNPJ: 51.045.101/0001-10 &nbsp;|&nbsp; Rua Goes Calmon, 145 - Edif. Manoelito Freitas, Sala 007, Centro &nbsp;|&nbsp; Vitória da Conquista - BA &nbsp;|&nbsp; (77) 99975-0486</div></div>';
  h += '<h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS E FORNECIMENTO DE SISTEMA DE MICROGERAÇÃO DE ENERGIA SOLAR FOTOVOLTAICA ON-GRID</h1>';
  h += '<div class="proj">PROJETO FECHADO N.º '+d.projeto+'</div>';
  h += '<p><b>CONTRATANTE/CLIENTE:</b> '+d.nome+', '+d.estado_civil+', RG nº '+d.rg+' inscrito(a) no CPF '+d.cpf+', residente e domiciliado na '+d.endereco+'.</p>';
  h += '<p><b>CONTRATADA/EMPRESA:</b> SUDOESTE SOLUÇÕES ELETRICAS LTDA, pessoa jurídica de direito privado inscrita no CNPJ sob nº 51.045.101/0001-10, estabelecida na RUA GOES CALMON, 145 - EDIF MANOELITO FREITAS, SALA 007, CENTRO, TELEFONE (77) 99975-0486, em VITÓRIA DA CONQUISTA, BAHIA.</p>';
  h += '<p>Pelo presente instrumento, as partes acima qualificadas resolvem celebram o presente CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE FORNECIMENTO DE SISTEMA DE MICROGERAÇÃO E MINIGERAÇÃO DISTRIBUÍDA DE ENERGIA SOLAR FOTOVOLTAICA, conforme as seguintes cláusulas e condições.</p>';
  h += '<h2>1. CLÁUSULA PRIMEIRA – DO OBJETO</h2><p>O presente contrato tem como objeto a contratação de empresa especializada para fornecimento de Sistema de Microgeração de Energia Solar Fotovoltaica ON-GRID e Minigeração Distribuída para o cliente acima qualificado nas características aqui descritas, compreendendo:</p><ul><li>Elaboração do Projeto;</li><li>Fornecimento de todos os equipamentos e materiais no local da instalação;</li><li>Instalação dos equipamentos;</li><li>Efetivação do acesso junto à empresa concessionária.</li></ul>';
  h += '<h2>2. CLÁUSULA SEGUNDA – DO PREÇO</h2><p>Pela prestação do serviço objeto deste instrumento, o CONTRATANTE pagará à CONTRATADA, o valor de '+d.valor+' ('+d.valor_extenso+') conforme discriminado a seguir:</p><p>O pagamento será realizado da seguinte forma:</p><ul>'+_li(d.pagamento)+'</ul>';
  h += '<p>Em caso de compras efetuadas através de boleto, o mesmo estará sujeito a protesto em caso de inadimplência;</p><p>O não pagamento de qualquer das parcelas avençadas, em caso de parcelamento realizado diretamente com a loja, quer total ou parcial, tornará vencidas inclusive as parcelas vincendas, de forma antecipada, traduzindo-se o presente contrato como título executivo extrajudicial, nos termos legais;</p><p>Em caso de pagamentos através de financiamento bancário, sendo o valor creditado na conta do próprio contratante, o mesmo terá a obrigação de fazer o devido repasse à Contratada e/ou à fabricante indicada de forma imediata. Não o fazendo, permanecerá como devedor da obrigação financeira, sujeito a cobrança e execução judicial;</p><p>O valor do produto está sujeito a correção/alteração caso haja ajuste de preço das mercadorias no fornecedor dentro do prazo entre a negociação e a efetivação do pagamento.</p>';
  h += '<h2>3. CLÁUSULA TERCEIRA – DOS SERVIÇOS E EQUIPAMENTOS</h2><p>Os serviços prestados e equipamentos ficam acordados conforme Nº '+d.projeto+' acima citado.</p><p>Os serviços e equipamentos listados no item 1 da seção 1.1 englobam:</p><ul>'+_li(d.equipamentos)+'</ul>';
  h += '<h2>4. CLÁUSULA QUARTA – DO LOCAL DE INSTALAÇÃO, PRESTAÇÃO DOS SERVIÇOS E CONTAS CONTEMPLADAS.</h2><p>Os equipamentos serão instalados no endereço da CONTRATADA.</p><p>Está vinculada a unidade geradora a conta contrato referente ao endereço de instalação '+d.endereco_instalacao+'.</p>';
  h += '<h2>5. CLÁUSULA QUINTA - DO PRAZO DE EXECUÇÃO DOS SERVIÇOS E INSTALAÇÃO DOS EQUIPAMENTOS.</h2><p>O prazo total de execução de cada etapa da contratação seguirá o cronograma abaixo, sendo contado o inicial de execução dos serviços a partir da assinatura contratual e realização do pagamento descrito.</p><p><b>5.1. Cronograma com prazo em dias:</b></p><table><tr><th>Item</th><th>Descrição</th><th>Fornecimento dos equipamentos e materiais</th><th>Projeto e homologação</th><th>Instalação e dimensionamento</th></tr><tr><td>1</td><td>Fornecimento e instalação de uma Usina Solar Fotovoltaica conforme projeto fechado e acima citado.</td><td>Até 30 dias*</td><td>45 dias***</td><td>45 dias**</td></tr></table>';
  h += '<p class="note">* O prazo de 30 dias referente a entrega dos materiais pode ser prorrogado por igual período em virtude da escassez de insumos como o vidro, alumínio, aço, cobre, entre outros que são essenciais para a fabricação de produtos fotovoltaicos.</p><p class="note">** O prazo de 45 dias referentes a instalação e dimensionamento do sistema pode ser estendido por mais 30 dias, caso ocorram problemas climáticos como chuvas, vendavais e outros que possam colocar em risco a segurança das equipes, equipamentos e patrimônio do CONTRATANTE. As condições climáticas locais precisam estar favoráveis.</p><p class="note">*** Eventuais motivos de força maior como por exemplo epidemias ou pandemias que possam vir a afetar diretamente nos prazos de instalação não darão ensejo para rescisão contratual nem aplicação de penalidade.</p><p class="note">**** Em se tratando de cliente B-OPTANTE, o prazo de homologação poderá se estender por até 90 dias, prorrogando-se conforme as especificações e necessidades da concessionária de energia elétrica.</p><p class="note">***** Fica ciente o Contratante de que eventual posição do seu telhado (Norte, Sul, Leste, Oeste) poderá influenciar na geração de energia fotovoltaica, conforme cada caso.</p>';
  h += '<h2>6. CLÁUSULA SEXTA.</h2><p>No preço apresentado pela CONTRATADA estão inclusos impostos, taxas e demais encargos necessários à execução dos serviços.</p>';
  h += '<h2>7. CLÁUSULA SÉTIMA – DO PREPARO DO TERRENO OU LOCAL DE INSTALAÇÃO.</h2><p>O cliente tem a responsabilidade de preparar o terreno ou o local da instalação para recebimento da usina, como serviços de alvenaria ou de reforço da estrutura, bem como eventuais alterações de padrão, carga ou acréscimo de fases diretamente com a concessionária de energia elétrica. Caso, após acordo entre partes, essa responsabilidade venha a ser da empresa CONTRATADA, os custos do serviço serão acrescidos neste contrato juntamente com a descrição dos materiais utilizados.</p><p>7.1. A preparação do terreno ou do local da instalação para recebimento da usina, de responsabilidade do cliente, deverá seguir as orientações da CONTRATADA.</p><p>7.2 Caso após a preparação do terreno ou do local da instalação, tendo o CLIENTE seguido todas as orientações da CONTRATADA, seja necessária qualquer alteração de localização para melhor captação solar, todos os serviços serão arcados pela CONTRATADA, devendo o CLIENTE permitir as alterações necessárias para a instalação.</p>';
  h += '<h2>8. CLÁUSULA OITAVA – DOS DEVERES E OBRIGAÇÕES DA CONTRATADA</h2><p>A Contratada fica obrigada a:</p><ul><li>Cumprir os prazos;</li><li>Não transferir, no todo ou em parte, o objeto do presente contrato, sem prévia anuência da contratante;</li><li>A CONTRATADA está obrigada no fornecimento dos itens e instalação dos equipamentos, conforme objeto próprio deste contrato, de modo que eventuais atrasos em serviços a serem executados pela companhia/concessionária de energia elétrica serão de responsabilidade desta última.</li></ul>';
  h += '<h2>9. CLÁUSULA NONA – DOS DEVERES E OBRIGAÇÕES DO CONTRATANTE</h2><p>O contratante compromete-se a:</p><ul><li>efetuar o pagamento, de acordo com o preço e condições estipuladas na proposta de preços da Contratada, mesmo que Concessionária Local não realize a conclusão dos procedimentos a ela destinada;</li><li>promover, através de seu representante (gestor do contrato), o acompanhamento e a fiscalização do contrato, sob os aspectos quantitativos e qualitativos, anotando, em registro próprio, as falhas detectadas e comunicando à Contratada as ocorrências de quaisquer fatos que, a seu critério, exijam medidas corretivas por parte da mesma;</li><li>caso seja detectado no ato da instalação alguma necessidade de reforço ou reforma da estrutura que seja de natureza estrutural, ficará de responsabilidade do cliente, assim como os custos;</li><li>caso após a preparação do terreno ou do local da instalação, tendo o CLIENTE seguido todas as orientações da CONTRATADA, seja necessária qualquer alteração de localização, todos os serviços serão arcados pela CONTRATADA, devendo o CLIENTE permitir as alterações necessárias para a instalação;</li><li>é necessário que seja fornecido acesso à internet no local, para o bom funcionamento do inversor, sendo tal obrigação também de responsabilidade do Contratante;</li><li>fica acordada a obrigatoriedade de ponto de conexão com internet no local da instalação do inversor ou micro inversor;</li><li>fica acordado que o recebimento e conferência dos equipamentos entregues ficarão a cargo do CONTRATANTE, que em caso de algum item danificado deverá informar a CONTRATADA enviando as evidências necessárias: foto do equipamento danificado, foto da nota fiscal, fazer ressalva no documento de entrega da transportadora, fotografar a notificação e enviar junto às demais evidências;</li></ul>';
  h += '<h2>10. CLÁUSULA DÉCIMA – DAS OBRIGAÇÕES SOCIAIS, COMERCIAIS E FISCAIS DA CONTRATADA.</h2><p>À CONTRATADA caberá assumir a responsabilidade por todos encargos previdenciários e obrigações sociais previstos na legislação social e trabalhista em vigor, obrigando-se a saldá-los na época própria, vez que seus empregados não manterão nenhum vínculo empregatício com o CONTRATANTE.</p><p>Deverá a CONTRATADA assumir a responsabilidade por todas as providências e obrigações estabelecidas na legislação específica de acidentes de trabalho, quando, em ocorrência da espécie, forem vítimas os seus empregados durante a execução do contrato ou em conexão com ele.</p><p>Todos os encargos de uma possível demanda trabalhista, civil ou penal, relacionadas à execução do contrato, originariamente ou vinculada por prevenção, conexão ou contingência são de responsabilidade da CONTRATADA.</p><p>A CONTRATADA não terá qualquer responsabilidade quanto à demora ou quaisquer espécies de controvérsias referente a substituição do medidor de energia elétrica e demais serviços pertinentes à alteração e troca da rede elétrica, bem como atividades relacionadas a adequação do transformador de energia da rede elétrica, sendo de responsabilidade do CONTRATANTE.</p><p>A CONTRATADA assumirá as despesas referentes aos kWh proporcionais que seriam gerados pela usina no período equivalente aos dias em atraso contados a partir do quinto mês, caso a CONTRATADA não realize a instalação do projeto dentro do cronograma de 120 dias após a assinatura do presente contrato e pagamento do valor global acordado entre as partes.</p>';
  h += '<h2>11. CLÁUSULA DÉCIMA PRIMEIRA – DAS GARANTIAS</h2><p>A Contratada é responsável pela GARANTIA LEGAL, conforme previsão expressa no Código de Defesa do Consumidor.</p><p>Conforme garantia CONTRATUAL dada pela fabricante ou pelo distribuidor, os itens descritos no presente instrumento dispõem das seguintes garantias de fábrica:</p><ul><li>Módulos fotovoltaicos:</li><li>Nível máximo esperado de degradação da potência de 12% durante o período de garantia; (depreciação de 1% ao ano nas placas fotovoltaicas)</li><li>Do produto: placas fotovoltaicas - 10 anos de fábrica, conforme especificações '+d.marca_modulo+'.</li><li>Inversores 10 anos, conforme especificações '+d.marca_inversor+'</li><li>Instalação e serviços de engenharia: 1 ano, conforme especificações da Sudoeste Soluções Elétricas LTDA.</li><li>Vazamento: 90 (noventa) dias contados a partir da data de finalização da instalação, especificamente no local de onde foi instalado as placas.</li></ul><p>11.3 Em caso de garantia CONTRATUAL dada pela fabricante, serão dadas todas as coordenadas e orientações para o acionamento da mesma por parte do CONTRATANTE. Sendo necessária a visita técnica por parte da CONTRATADA, poderá haver a cobrança da mesma, por esta, para acionamento da garantia.</p>';
  h += '<h2>12. CLÁUSULA DÉCIMA SEGUNDA - EXCLUSÕES DO FORNECIMENTO.</h2><p>O escopo de fornecimento é limitado aos equipamentos e serviços descritos nos itens 6 desta proposta, portanto apresentamos abaixo os itens excluídos:</p><ul><li>Transformador para adequação de tensão.</li><li>Serviços de O&amp;M - Manutenções e operação periódicas do sistema.</li><li>Cabeamento de comunicação de dados modelo (modBus ou Cat 6).</li><li>Ponto de internet próximo ao local onde será instalado o dispositivo de monitoramento.</li><li>Qualquer outro item não incluso nesta proposta.</li><li>Adequação do sistema de aterramento para atendimento as normas.</li><li>Adequação/atualização do padrão de entrada de energia elétrica da unidade consumidora. (Quadro geral de distribuição/ Cabine primária / Transformador, etc)</li><li>Modificação da infraestrutura local da área elétrica ou civil.</li><li>Obtenção de possíveis autorizações e licenças necessárias para a construção e operação junto às entidades públicas (Município, estado e federação).</li><li>Não será disponibilizado computador / monitor para monitoramento do sistema fotovoltaico.</li><li>Obras de reforço da estrutura do telhado ou da edificação.</li><li>Execução de serviços em linhas energizadas.</li><li>Medidor bidirecional. (Responsabilidade da concessionária ou do cliente)</li><li>Sobressalentes dos equipamentos ofertados.</li><li>Supressão vegetal, terraplanagem, drenagem e brita em torno dos módulos.</li></ul>';
  h += '<h2>13. CLÁUSULA DÉCIMA TERCEIRA - DAS PENALIDADES.</h2><p>Caso a CONTRATADA não cumpra o prazo de finalização estabelecido no cronograma do item 4.1, a mesma se responsabilizará pelas despesas referentes a geração em kwh proporcional aos dias em atraso, até o efetivo cumprimento do serviço contratado (exceto quando ocorrer qualquer outro fato ou ato de terceiro, sobre qual a contratada não tenha responsabilidade).</p><p>Caso a CONTRATANTE não providencie a estrutura adequada para a instalação do sistema, os bens ficarão sob sua responsabilidade até que assim o faça, devendo comunicar a conclusão dos seus serviços estruturais para novo agendamento de instalação, de modo que não haverá qualquer hipótese de desistência do serviço que não esteja prevista no presente instrumento, mantendo-se em sua totalidade o cronograma de pagamentos;</p><p>Eventual rescisão contratual dará ensejo a aplicação de multa de 20% (vinte por cento) do valor do presente instrumento e somente será possível antes da efetiva emissão da nota fiscal referente aos materiais a serem instalados.</p>';
  h += '<h2>14. CLÁUSULA DÉCIMA QUARTA – DAS DISPOSIÇÕES FINAIS.</h2><ul><li>Que se acham comprometidos com a presente transação em todas as condições avançadas no presente instrumento nos termos em que se acha redigido;</li><li>Que estão cientes da disciplina reguladora dos contratos e das suas garantias;</li><li>Que leram e entenderam bem o sentido e alcance de todas as disposições contidas neste Instrumento aceitando-o nos exatos termos em que se acha redigido, sem qualquer ressalva ou restrição, por traduzir fielmente o que acordaram;</li><li>As partes dão ao presente instrumento força de título executivo extrajudicial referente a eventuais pagamentos não realizados pela CONTRATANTE.</li><li>As partes concordam, se for o caso, na assinatura do presente instrumento de forma digital.</li><li>Ficam cientes as partes que, clientes B-OPTANTES não poderão enviar ou receber excedentes de energia gerada.</li></ul>';
  h += '<h2>15. CLÁUSULA DÉCIMA QUINTA – Da Inviabilidade Técnica e Cancelamento do Contrato</h2><p>No caso de inviabilidade técnica da execução do projeto de energia solar, seja em razão de restrições impostas pela concessionária de energia elétrica local, tais como adequação de carga instalada, substituição de transformador, reestruturação de rede, inadequação do padrão de entrada de energia do cliente, ou ainda por limitações estruturais do imóvel que impeçam a instalação segura e eficiente do sistema, o presente contrato será automaticamente rescindido, sem que haja a incidência de qualquer ônus, multa ou penalidade para quaisquer das partes.</p><p>Nessa hipótese, todos os valores eventualmente pagos pelo CONTRATANTE, a qualquer título, serão integralmente restituídos no prazo máximo de 10 (dez) dias úteis contados da comunicação formal da inviabilidade, sem quaisquer descontos ou correções adicionais, ressalvadas as hipóteses de acordo diverso entre as partes.</p><p>Fica eleito o foro da Comarca de Vitória da Conquista - Bahia, para dirimir quaisquer dúvidas oriundas deste contrato.</p><p>E, como prova de haverem ajustado e contratado entre si, depois de lido e achado conforme, é celebrado o presente Contrato pelas partes, dele sendo extraídas 2 (duas) cópias de igual teor e forma.</p>';
  h += '<div class="pb"><p style="text-align:center;margin-top:10px">Vitória da Conquista - Bahia, '+d.data_dia+' de '+d.data_mes+' de '+d.data_ano+'.</p>';
  h += '<div class="sign"><div class="line"></div><b>SUDOESTE SOLUÇÕES ELÉTRICAS LTDA</b>CNPJ: 51.045.101/0001-10<br>CONTRATADA</div>';
  h += '<div class="sign"><div class="line"></div><b>'+d.nome+'</b>CPF: '+d.cpf+'<br>CONTRATANTE</div>';
  h += '<div class="wit"><b>Testemunhas:</b><div class="line"></div>1. Nome: ____________________  CPF: ______________<div class="line"></div>2. Nome: ____________________  CPF: ______________</div></div>';
  h += '</body></html>';
  return h;
}

// Lê o texto da PROPOSTA (PDF) da pasta via conversão OCR (requer serviço "Drive API").
// Converte um blob (PDF/imagem) em texto via OCR (Drive API v2 ou v3).
function _ocrBlobTexto(blob){
  var tmp;
  if (Drive.Files && typeof Drive.Files.insert === 'function') {          // v2
    tmp = Drive.Files.insert({ title:'_tmp_ocr', mimeType:'application/vnd.google-apps.document' }, blob, { ocr:true, ocrLanguage:'pt' });
  } else {                                                                // v3
    tmp = Drive.Files.create({ name:'_tmp_ocr', mimeType:'application/vnd.google-apps.document' }, blob, { ocrLanguage:'pt' });
  }
  var txt = DocumentApp.openById(tmp.id).getBody().getText();
  DriveApp.getFileById(tmp.id).setTrashed(true);
  return txt;
}

function _lerPropostaTexto(pasta){
  var files = pasta.getFiles(), blob = null;
  while(files.hasNext()){
    var f = files.next();
    if(f.getMimeType()==='application/pdf' && f.getName().toLowerCase().indexOf('proposta')>-1){ blob=f.getBlob(); break; }
  }
  return blob ? _ocrBlobTexto(blob) : null;
}

// Acha o documento pessoal (por nome, ou a primeira imagem) e lê via OCR.
function _lerDocPessoalTexto(pasta){
  var kw = ['documento','identidade','ident','carteira','cnh','rg'];
  var files = pasta.getFiles(), byName=null, firstImg=null;
  while(files.hasNext()){
    var f = files.next(); var n = f.getName().toLowerCase(); var mt = f.getMimeType();
    if(n.indexOf('proposta')>-1 || n.indexOf('conta')>-1 || mt.indexOf('spreadsheet')>-1) continue;
    if(!byName){ for(var i=0;i<kw.length;i++){ if(n.indexOf(kw[i])>-1){ byName=f; break; } } }
    if(!firstImg && mt.indexOf('image/')===0) firstImg=f;
  }
  var doc = byName || firstImg;
  return doc ? _ocrBlobTexto(doc.getBlob()) : null;
}

// Extrai CPF e RG do texto do documento pessoal.
function _dadosPessoal(t){
  t = t.replace(/\s+/g,' ');
  var o = {}, m;
  m = t.match(/(\d{3}\.\d{3}\.\d{3}-?\d{2})/);                 if(m) o.cpf=m[1];
  m = t.match(/RG[^\d]{0,25}(\d{1,2}\.?\d{3}\.?\d{3}-?[\dxX])/i); if(m) o.rg=m[1];
  if(!o.rg){ var all=t.match(/\d{1,2}\.\d{3}\.\d{3}-?[\dxX]/g)||[]; for(var i=0;i<all.length;i++){ if(all[i]!==o.cpf){ o.rg=all[i]; break; } } }
  return o;
}

// Extrai valor, módulos, inversor, estrutura e marcas — SOMENTE da seção
// "DESCRIÇÃO DOS EQUIPAMENTOS" (a lista limpa do kit), nunca do resto da proposta.
function _dadosProposta(t){
  t = t.replace(/\s+/g,' ');
  var o = {}, m;

  // Valor: prioriza o da seção do kit ("KIT Fotovoltaico ... Valor: R$ ...").
  m = t.match(/Valor:\s*R\$\s*([\d.]+,\d{2})/);              if(m) o.valor='R$ '+m[1];

  // Isola a seção da lista de materiais para não arrastar gráficos/cronograma/financeiro.
  var sec = t;
  var ini = t.indexOf('DESCRIÇÃO DOS EQUIPAMENTOS');
  if(ini > -1){
    sec = t.substring(ini);
    var fim = sec.search(/Contas Contempladas|Produtos sujeitos|CONDI[ÇC][ÕO]ES COMERCIAIS/i);
    if(fim > -1) sec = sec.substring(0, fim);
  }

  m = sec.match(/(\d+)\s*M[oó]dulos?\s*Fotovoltaicos?\s*(.+?)\s*de\s*\d+\s*W/i);
  if(m) o.modulos = (m[1]+' '+m[2].trim());
  m = sec.match(/(\d+)\s*Inversor\(es\)\s*(.+?)\s*Cabo Solar/i);  if(m) o.inversor=m[1]+' '+m[2].trim();
  m = sec.match(/Estrutura Fixação p\/ Sistema Fotovoltaico\s*(Telhado\s+\w+)/i); if(m) o.estrutura=m[1].trim();

  // Trava de segurança: descarta capturas longas demais (evita arrastar páginas).
  if(o.modulos  && o.modulos.length  > 140) o.modulos  = '';
  if(o.inversor && o.inversor.length > 140) o.inversor = '';

  m = o.modulos && o.modulos.match(/(\d+)\s*W\s*-\s*([A-Za-zÀ-ú]+)/); if(m) o.marcaMod=m[2].toUpperCase();
  m = o.inversor && o.inversor.match(/INVERSOR\s+[\d.,]+\s*KW?\s+([A-Za-zÀ-ú]+)/i); if(m) o.marcaInv=m[1].toUpperCase();
  return o;
}

// Valor por extenso (reais).
function _ate999(x){
  var U=['zero','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
  var D=['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
  var C=['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];
  if(x===0) return ''; if(x===100) return 'cem';
  var c=Math.floor(x/100), r=x%100, p=[];
  if(c) p.push(C[c]);
  if(r<20 && r>0) p.push(U[r]);
  else { var d=Math.floor(r/10), u=r%10, q=[]; if(d) q.push(D[d]); if(u) q.push(U[u]); if(q.length) p.push(q.join(' e ')); }
  return p.join(' e ');
}
function _grupos(x){
  if(x===0) return 'zero';
  var g=[Math.floor(x/1000000), Math.floor((x%1000000)/1000), x%1000], parts=[], nums=[];
  for(var i=0;i<3;i++){ if(g[i]>0){ var w; if(i===0) w=(g[i]===1?'um milhão':_ate999(g[i])+' milhões'); else if(i===1) w=(g[i]===1?'mil':_ate999(g[i])+' mil'); else w=_ate999(g[i]); parts.push(w); nums.push(g[i]); } }
  var s=parts[0];
  for(var k=1;k<parts.length;k++){ var isLast=(k===parts.length-1); var useE=isLast&&(nums[k]<100||nums[k]%100===0); s+=(useE?' e ':', ')+parts[k]; }
  return s;
}
function _extensoReais(n){
  n=Math.round(n*100)/100; var reais=Math.floor(n), cent=Math.round((n-reais)*100);
  var unidade=(reais===1?' real':' reais');
  if(reais>=1000000 && reais%1000000===0) unidade=' de reais';
  var txt=_grupos(reais)+unidade;
  if(cent>0) txt+=' e '+_grupos(cent)+(cent===1?' centavo':' centavos');
  return txt;
}

function _htmlProcuracao(d){
  var css = "body{font-family:Arial,Helvetica,sans-serif;font-size:12pt;color:#111;line-height:1.7}"
    + ".hdr{font-size:11pt;line-height:1.5;margin-bottom:34px}"
    + "h1{text-align:center;font-size:14pt;margin:8px 0 26px}"
    + "p{text-align:justify;margin:0 0 26px}"
    + ".sig .nm{font-weight:bold}";
  var procFixo = "a pessoa fisica VINICIUS MACEDO DE FIGUEIREDO SANTOS, inscrito no CPF sob n.º 038.017.235-69, residente na rua Macedio, 18 - Terras Alphaville 1, Universidade, CEP: 45032-405 no estado da Bahia";
  var atos = "com o ato específico para, assinatura de ART, elaboração do projeto fotovoltaico, consulta para disponibilidade da rede de distribuição, alteração de rateio, projeto e aumento de carga, solicitação de nova ligação de energia, alteração de titularidade junto a distribuidora de energia local, Companhia de Eletricidade do Estado da Bahia - Coelba.";
  var tipo = (d.proc_tipo || d.tipo || 'PF').toUpperCase();
  var outorgante, assinaDoc;
  if (tipo === 'PJ'){
    outorgante = "eu " + d.nome + " , pessoa jurídica, inscrita sob o CNPJ nº" + (d.proc_doc||d.cpf) + " , localizada no endereço: " + d.endereco + " , estado da Bahia";
    assinaDoc = "CNPJ nº" + (d.proc_doc||d.cpf);
  } else {
    outorgante = "eu " + d.nome + " , pessoa física, inscrita sob o CPF n° " + (d.proc_doc||d.cpf) + ", localizada no endereço: " + d.endereco + ", estado da Bahia";
    assinaDoc = "CPF " + (d.proc_doc||d.cpf);
  }
  var h = '<html><head><meta charset="utf-8"><style>'+css+'</style></head><body>';
  h += '<div class="hdr">Rua Maceio, 18 – Terras alphaville 1<br>Universidade<br>CEP: 45032-405<br>Vitória da Conquista – BA</div>';
  h += '<h1>PROCURAÇÃO</h1>';
  h += '<p>Pelo presente instrumento particular de procuração, ' + outorgante + ', constituo meu bastante procurador, ' + procFixo + '; ' + atos + '</p>';
  h += '<p>Vitória da Conquista - BA, ' + d.data_dia + ' de ' + d.data_mes + ' de ' + d.data_ano + '.</p>';
  h += '<div class="sig"><div class="nm">' + d.nome + '</div>' + assinaDoc + '</div>';
  h += '</body></html>';
  return h;
}

/* ================= FINANCEIRO (Fluxo de Caixa) =================
 *
 *  Uma planilha "FLUXO DE CAIXA - UNIÃO SOLAR" no Drive guarda tudo.
 *  O ID dela fica salvo nas Propriedades do Script (compartilhado por
 *  toda a equipe que usa a mesma conta). Rode setupFinanceiro UMA vez
 *  (ou deixe que ela seja criada sozinha no primeiro uso).
 *
 *  Colunas da aba "Movimentacoes":
 *   A ID | B Tipo | C Status | D Data prevista | E Data realizada |
 *   F Cliente/Fornecedor/Onde | G Descrição | H Categoria |
 *   I Conta | J Valor | K Origem | L Observação
 *
 *  ENTRADAS: criadas automaticamente ao gerar o contrato (Em aberto),
 *            validadas quando o dinheiro cai (finReceber, com valor
 *            parcial gerando saldo em aberto).
 *  SAÍDAS:   preenchidas no formulário do app (data, onde, fixo/variável,
 *            o que foi, de qual conta saiu, valor).
 *===============================================================*/

var FIN_SHEET_NAME = 'FLUXO DE CAIXA - UNIÃO SOLAR';
var FIN_TAB        = 'Movimentacoes';
var FIN_HEADERS = ['ID','Tipo','Status','Data prevista','Data realizada',
  'Cliente / Fornecedor / Onde','Descrição','Categoria','Conta','Valor','Origem','Observação','Mês','Ano'];

function _finId(){
  var p = PropertiesService.getScriptProperties();
  var id = p.getProperty('FIN_SHEET_ID');
  if(id){
    try{ SpreadsheetApp.openById(id); return id; }catch(e){ /* recria abaixo */ }
  }
  return _finCriar().getId();
}

// Paleta (tema verde solar)
var FIN_VERDE   = '#0e6b31';   // cabeçalho / títulos
var FIN_VERDE2  = '#1aa64d';   // banner secundário
var FIN_ZEBRA   = '#e8f6ee';   // linha alternada (verde bem claro)
var FIN_DESTAQUE= '#fff3cd';   // célula editável (amarelo suave)
var FIN_TOTALBG = '#cdefd8';   // linha de total

function _finCriar(){
  var ss = SpreadsheetApp.create(FIN_SHEET_NAME);
  var sh = ss.getActiveSheet();
  sh.setName(FIN_TAB);
  sh.getRange(1,1,1,FIN_HEADERS.length).setValues([FIN_HEADERS]);
  _finBeautifyMov(sh);
  _finCriarResumoGeral(ss);
  _finCriarResumoAnual(ss);
  PropertiesService.getScriptProperties().setProperty('FIN_SHEET_ID', ss.getId());
  return DriveApp.getFileById(ss.getId());
}

// Remove faixas (bandings) existentes de uma aba (pra poder reaplicar sem erro).
function _finClearBandings(sh){
  try{ var bs = sh.getBandings(); for(var i=0;i<bs.length;i++) bs[i].remove(); }catch(e){}
}

// Deixa a aba de lançamentos bonita: cabeçalho em destaque + linhas zebradas.
function _finBeautifyMov(sh){
  sh.getRange(1,1,1,FIN_HEADERS.length).setValues([FIN_HEADERS]);
  var rows = Math.max(sh.getMaxRows(), 500);
  _finClearBandings(sh);
  var rng = sh.getRange(1,1,rows,FIN_HEADERS.length);
  var band = rng.applyRowBanding(SpreadsheetApp.BandingTheme.GREEN, true, false);
  try{ band.setHeaderRowColor(FIN_VERDE).setFirstRowColor('#ffffff').setSecondRowColor(FIN_ZEBRA); }catch(e){}
  sh.getRange(1,1,1,FIN_HEADERS.length)
    .setFontWeight('bold').setFontColor('#ffffff').setBackground(FIN_VERDE)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sh.setRowHeight(1,34);
  sh.setFrozenRows(1);
  sh.getRange(2,10,rows-1,1).setNumberFormat('R$ #,##0.00');            // Valor
  sh.getRange(1,1,rows,1).setHorizontalAlignment('center');            // ID
  sh.getRange(1,3,rows,1).setHorizontalAlignment('center');            // Status
  sh.getRange(1,4,rows,2).setHorizontalAlignment('center');            // Datas
  sh.getRange(1,13,rows,2).setHorizontalAlignment('center');           // Mês/Ano
  sh.setColumnWidth(1,50);  sh.setColumnWidth(2,80);  sh.setColumnWidth(3,90);
  sh.setColumnWidth(4,105); sh.setColumnWidth(5,105); sh.setColumnWidth(6,230);
  sh.setColumnWidth(7,240); sh.setColumnWidth(8,95);  sh.setColumnWidth(9,150);
  sh.setColumnWidth(10,120);sh.setColumnWidth(11,90); sh.setColumnWidth(12,220);
  sh.setColumnWidth(13,55); sh.setColumnWidth(14,60);
}

// (Re)cria a aba "Resumo" (totais gerais) já formatada.
function _finCriarResumoGeral(ss){
  var r = ss.getSheetByName('Resumo') || ss.insertSheet('Resumo');
  r.clear(); _finClearBandings(r);
  r.getRange('A1:B1').merge().setValue('RESUMO — TOTAIS GERAIS')
    .setFontWeight('bold').setFontSize(13).setFontColor('#ffffff')
    .setBackground(FIN_VERDE).setHorizontalAlignment('center').setVerticalAlignment('middle');
  r.setRowHeight(1,32);
  var linhas = [
    ['Vendas / entradas (total)', '=SUMIFS(Movimentacoes!J:J,Movimentacoes!B:B,"Entrada")'],
    ['   • Já recebidas', '=SUMIFS(Movimentacoes!J:J,Movimentacoes!B:B,"Entrada",Movimentacoes!C:C,"Recebido")'],
    ['   • Em aberto (a receber)', '=SUMIFS(Movimentacoes!J:J,Movimentacoes!B:B,"Entrada",Movimentacoes!C:C,"Em aberto")'],
    ['Saídas pagas (total)', '=SUMIFS(Movimentacoes!J:J,Movimentacoes!B:B,"Saída")'],
    ['   • Custos fixos', '=SUMIFS(Movimentacoes!J:J,Movimentacoes!B:B,"Saída",Movimentacoes!H:H,"Fixo")'],
    ['   • Custos variáveis', '=SUMIFS(Movimentacoes!J:J,Movimentacoes!B:B,"Saída",Movimentacoes!H:H,"Variável")'],
    ['SALDO (recebido − saídas)', '=B4-B6']
  ];
  r.getRange(3,1,linhas.length,2).setValues(linhas);
  r.getRange(3,1,linhas.length,2).applyRowBanding(SpreadsheetApp.BandingTheme.GREEN, false, false);
  r.getRange(3,2,linhas.length,1).setNumberFormat('R$ #,##0.00').setHorizontalAlignment('right');
  r.getRange(3,1,linhas.length,1).setFontWeight('bold');
  // linha SALDO em destaque
  r.getRange(9,1,1,2).setBackground(FIN_TOTALBG).setFontWeight('bold');
  r.setColumnWidth(1,240); r.setColumnWidth(2,160);
  r.setFrozenRows(1);
  return r;
}

// (Re)cria a aba "Resumo Anual" com os 12 meses do ano (controle total de vendas).
function _finCriarResumoAnual(ss){
  var a = ss.getSheetByName('Resumo Anual') || ss.insertSheet('Resumo Anual');
  a.clear(); _finClearBandings(a);
  a.getRange('A1:F1').merge().setValue('RESUMO ANUAL — VENDAS E FLUXO DE CAIXA')
    .setFontWeight('bold').setFontSize(14).setFontColor('#ffffff')
    .setBackground(FIN_VERDE).setHorizontalAlignment('center').setVerticalAlignment('middle');
  a.setRowHeight(1,36);
  a.getRange('A2').setValue('Ano:').setFontWeight('bold').setHorizontalAlignment('right');
  a.getRange('B2').setValue((new Date()).getFullYear()).setNumberFormat('0')
    .setBackground(FIN_DESTAQUE).setFontWeight('bold').setHorizontalAlignment('center')
    .setBorder(true,true,true,true,false,false);
  a.getRange('C2').setValue('← troque o ano aqui').setFontColor('#8a6d3b').setFontStyle('italic');
  var hdr = ['Mês','Vendas (contratos)','Recebido','Em aberto','Saídas','Saldo'];
  a.getRange(4,1,1,hdr.length).setValues([hdr]).setFontWeight('bold')
    .setBackground(FIN_VERDE).setFontColor('#ffffff')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  a.setRowHeight(4,30);
  var meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var M = 'Movimentacoes';
  for(var i=0;i<12;i++){
    var row = 5 + i, mes = i + 1;
    a.getRange(row,1).setValue(meses[i]).setFontWeight('bold');
    a.getRange(row,2).setFormula('=SUMIFS('+M+'!$J:$J,'+M+'!$B:$B,"Entrada",'+M+'!$M:$M,'+mes+','+M+'!$N:$N,$B$2)');
    a.getRange(row,3).setFormula('=SUMIFS('+M+'!$J:$J,'+M+'!$B:$B,"Entrada",'+M+'!$C:$C,"Recebido",'+M+'!$M:$M,'+mes+','+M+'!$N:$N,$B$2)');
    a.getRange(row,4).setFormula('=SUMIFS('+M+'!$J:$J,'+M+'!$B:$B,"Entrada",'+M+'!$C:$C,"Em aberto",'+M+'!$M:$M,'+mes+','+M+'!$N:$N,$B$2)');
    a.getRange(row,5).setFormula('=SUMIFS('+M+'!$J:$J,'+M+'!$B:$B,"Saída",'+M+'!$M:$M,'+mes+','+M+'!$N:$N,$B$2)');
    a.getRange(row,6).setFormula('=C'+row+'-E'+row);
  }
  // zebra nos 12 meses
  a.getRange(5,1,12,6).applyRowBanding(SpreadsheetApp.BandingTheme.GREEN, false, false);
  a.getRange(17,1).setValue('TOTAL DO ANO').setFontWeight('bold');
  for(var c=2;c<=6;c++){
    var L = String.fromCharCode(64+c);
    a.getRange(17,c).setFormula('=SUM('+L+'5:'+L+'16)').setFontWeight('bold');
  }
  a.getRange('B5:F17').setNumberFormat('R$ #,##0.00');
  a.getRange(17,1,1,6).setBackground(FIN_TOTALBG).setFontWeight('bold').setBorder(true,false,false,false,false,false);
  a.setColumnWidth(1,120);
  for(var w=2;w<=6;w++) a.setColumnWidth(w,150);
  a.setFrozenRows(4);
  return a;
}

// Mês/Ano de competência a partir de uma data 'dd/MM/yyyy'.
function _finComp(dataBR){
  var p = (dataBR||'').toString().split('/');
  if(p.length===3) return { m:parseInt(p[1],10)||'', y:parseInt(p[2],10)||'' };
  return { m:'', y:'' };
}

// Normaliza um valor lido da planilha para 'dd/MM/yyyy' (o Sheets às vezes
// devolve datas como objeto Date; aqui garantimos o texto correto de volta).
function _dataBR(v){
  if(v == null || v === '') return '';
  if(Object.prototype.toString.call(v) === '[object Date]')
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  return String(v);
}

// Rode para criar OU embelezar a planilha (aplica cores/zebra sem perder dados).
function setupFinanceiro(){
  var id = _finId();
  var ss = SpreadsheetApp.openById(id);
  var sh = ss.getSheetByName(FIN_TAB) || ss.insertSheet(FIN_TAB);
  _finBeautifyMov(sh);          // cabeçalho + zebra na aba de lançamentos
  _finCriarResumoGeral(ss);     // (re)cria a aba Resumo já formatada
  _finCriarResumoAnual(ss);     // (re)cria a aba Resumo Anual (12 meses)
  SpreadsheetApp.flush();
  var url = 'https://docs.google.com/spreadsheets/d/' + id + '/edit';
  Logger.log('FLUXO DE CAIXA: ' + url);
  return url;
}

function _finMov(){
  return SpreadsheetApp.openById(_finId()).getSheetByName(FIN_TAB);
}

function _finNextId(sh){
  var last = sh.getLastRow();
  if(last < 2) return 1;
  var ids = sh.getRange(2,1,last-1,1).getValues();
  var mx = 0;
  for(var i=0;i<ids.length;i++){ var n=parseInt(ids[i][0],10); if(!isNaN(n)&&n>mx) mx=n; }
  return mx + 1;
}

var _FIN_MESES = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];

function _finMesNum(nome){
  var n = (nome||'').toString().trim().toUpperCase();
  for(var i=0;i<_FIN_MESES.length;i++) if(_FIN_MESES[i]===n) return i+1;
  var p = parseInt(n,10); return isNaN(p)?0:p;
}

// Normaliza data para 'dd/MM/yyyy' (aceita 'yyyy-mm-dd', 'dd/MM/yyyy' ou vazio=hoje).
function _finData(v){
  var s = (v||'').toString().trim();
  if(!s) return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(m) return m[3]+'/'+m[2]+'/'+m[1];
  return s;
}

function _finMesAno(dataBR){
  var p = (dataBR||'').toString().split('/');
  if(p.length===3) return { m:parseInt(p[1],10), y:parseInt(p[2],10) };
  return { m:0, y:0 };
}

// ENTRADA automática vinda do contrato (fica Em aberto, valor total).
function finLancarEntradaContrato(d){
  var valor = _num(d.valor);
  if(!(valor > 0)) return { ok:false, erro:'valor do contrato ausente' };
  var dia = ('0'+(parseInt(d.data_dia,10)||1)).slice(-2);
  var mes = _finMesNum(d.data_mes);
  var ano = parseInt(d.data_ano,10) || (new Date()).getFullYear();
  var dataPrev = mes ? (dia+'/'+('0'+mes).slice(-2)+'/'+ano) : _finData('');
  var descr = 'Contrato' + (d.projeto ? ' nº '+d.projeto : '');
  var pg = (d.pagamento && d.pagamento.length) ? d.pagamento.join(' ') : '';
  var sh = _finMov();
  // Evita duplicar a venda se o contrato for gerado de novo (mesmo cliente + valor + origem Contrato).
  var last = sh.getLastRow();
  if(last >= 2){
    var chk = sh.getRange(2,1,last-1,FIN_HEADERS.length).getValues();
    var alvo = (d.nome||'').toString().trim().toUpperCase();
    for(var i=0;i<chk.length;i++){
      if(String(chk[i][1])==='Entrada' && String(chk[i][10])==='Contrato'
         && String(chk[i][5]).trim().toUpperCase()===alvo && _num(chk[i][9])===valor){
        return { ok:true, existe:true, id:chk[i][0], valor:valor };
      }
    }
  }
  var id = _finNextId(sh);
  var cp = _finComp(dataPrev);
  sh.appendRow([id,'Entrada','Em aberto',dataPrev,'',(d.nome||''),descr,'','',valor,'Contrato',pg,cp.m,cp.y]);
  SpreadsheetApp.flush();
  return { ok:true, id:id, valor:valor, dataPrevista:dataPrev };
}

// SAÍDA (gasto) preenchida no app.
function finAddSaida(d){
  var valor = _num(d.valor);
  if(!(valor > 0)) return { ok:false, erro:'Informe um valor válido para o gasto.' };
  var cat = (d.categoria||'').toString().trim();
  if(cat.toUpperCase().indexOf('FIX')===0) cat='Fixo';
  else if(cat.toUpperCase().indexOf('VAR')===0) cat='Variável';
  var sh = _finMov();
  var id = _finNextId(sh);
  var dr = _finData(d.data);
  var cp = _finComp(dr);
  sh.appendRow([id,'Saída','Pago','',dr,(d.onde||d.local||''),
    (d.descricao||d.oque||''),cat,(d.conta||''),valor,'Manual',(d.obs||''),cp.m,cp.y]);
  SpreadsheetApp.flush();
  return { ok:true, id:id };
}

// ENTRADA manual avulsa (ex.: outra receita). recebida=true já entra como Recebido.
function finAddEntrada(d){
  var valor = _num(d.valor);
  if(!(valor > 0)) return { ok:false, erro:'Informe um valor válido.' };
  var recebida = d.recebida === true || d.recebida === 'true';
  var sh = _finMov();
  var id = _finNextId(sh);
  var dp = _finData(d.data);
  var cp = _finComp(dp);
  sh.appendRow([id,'Entrada',(recebida?'Recebido':'Em aberto'),
    dp, (recebida?dp:''),
    (d.cliente||''),(d.descricao||''),'',(d.conta||''),valor,'Manual',(d.obs||''),cp.m,cp.y]);
  SpreadsheetApp.flush();
  return { ok:true, id:id };
}

// Valida um recebimento (total ou parcial). Parcial gera saldo Em aberto.
function finReceber(d){
  var id = parseInt(d.id,10);
  if(isNaN(id)) return { ok:false, erro:'ID do recebimento inválido.' };
  var sh = _finMov();
  var last = sh.getLastRow();
  if(last < 2) return { ok:false, erro:'Sem lançamentos.' };
  var vals = sh.getRange(2,1,last-1,FIN_HEADERS.length).getValues();
  for(var i=0;i<vals.length;i++){
    if(parseInt(vals[i][0],10) === id){
      var row = i + 2;
      if(String(vals[i][1]) !== 'Entrada' || String(vals[i][2]) !== 'Em aberto')
        return { ok:false, erro:'Esse lançamento não é uma entrada em aberto.' };
      var aberto = _num(vals[i][9]);
      var dataReal = _finData(d.data);
      var rec = d.valor!=null && d.valor!=='' ? _num(d.valor) : aberto;
      if(!(rec > 0)) rec = aberto;
      if(rec > aberto) rec = aberto;
      // competência da venda (normaliza a data — o Sheets às vezes devolve objeto Date)
      var dataPrevStr = _dataBR(vals[i][3]);
      var cp = _finComp(dataPrevStr);
      if(!(cp.m && cp.y)) cp = _finComp(_dataBR(vals[i][4]) || dataReal);
      // marca a linha como recebida (valor efetivamente recebido)
      sh.getRange(row,3).setValue('Recebido');
      sh.getRange(row,5).setValue(dataReal);
      sh.getRange(row,10).setValue(rec);
      if(vals[i][12]==='' || vals[i][12]==null || vals[i][13]==='' || vals[i][13]==null){
        sh.getRange(row,13).setValue(cp.m); sh.getRange(row,14).setValue(cp.y);
      }
      var saldo = Math.round((aberto - rec)*100)/100;
      var novoId = null;
      if(saldo > 0){ // saldo continua em aberto (mesma competência da venda)
        novoId = _finNextId(sh);
        sh.appendRow([novoId,'Entrada','Em aberto',dataPrevStr,'',vals[i][5],
          (vals[i][6]||'')+' (saldo)','','',saldo,'Contrato',(vals[i][11]||''),cp.m,cp.y]);
      }
      SpreadsheetApp.flush();
      return { ok:true, id:id, recebido:rec, saldo:saldo, saldoId:novoId };
    }
  }
  return { ok:false, erro:'Recebimento não encontrado (ID '+id+').' };
}

// Lista os recebimentos em aberto + resumo do mês + últimas movimentações.
function finListar(d){
  var sh = _finMov();
  var last = sh.getLastRow();
  var hoje = new Date();
  var mes = d && d.mes ? parseInt(d.mes,10) : (hoje.getMonth()+1);
  var ano = d && d.ano ? parseInt(d.ano,10) : hoje.getFullYear();
  var out = { ok:true, mes:mes, ano:ano, emAberto:[], ultimas:[], contasPagar:[],
    planilhaUrl:'https://docs.google.com/spreadsheets/d/'+_finId()+'/edit',
    resumo:{ entradasMes:0, saidasMes:0, saldoMes:0, fixasMes:0, variaveisMes:0, emAbertoTotal:0, vendidoMes:0, contasPagarTotal:0 } };
  if(last < 2) return out;
  var vals = sh.getRange(2,1,last-1,FIN_HEADERS.length).getValues();
  for(var i=0;i<vals.length;i++){
    var r = vals[i];
    var tipo=String(r[1]), status=String(r[2]);
    var valor=_num(r[9]);
    var rm=parseInt(r[12],10), ry=parseInt(r[13],10);        // Mês/Ano de competência
    var noMes = (rm===mes && ry===ano);
    if(tipo==='Entrada' && status==='Em aberto'){
      out.emAberto.push({ id:r[0], cliente:r[5], descricao:r[6], dataPrevista:r[3], valor:valor, obs:r[11] });
      out.resumo.emAbertoTotal += valor;
    }
    if(tipo==='Entrada' && status==='Recebido' && noMes) out.resumo.entradasMes += valor;
    if(tipo==='Entrada' && noMes) out.resumo.vendidoMes += valor;   // vendido = contratos + avulsas do mês (recebido + em aberto)
    if(tipo==='Saída' && status==='A pagar'){
      out.contasPagar.push({ id:r[0], destino:r[5], descricao:r[6], categoria:r[7], conta:r[8],
        vencimento:_dataBR(r[3]), boleto:r[11], valor:valor });
      out.resumo.contasPagarTotal += valor;
    }
    if(tipo==='Saída' && status!=='A pagar' && noMes){   // só saídas efetivamente pagas entram no mês
      out.resumo.saidasMes += valor;
      if(String(r[7])==='Fixo') out.resumo.fixasMes += valor;
      else if(String(r[7])==='Variável') out.resumo.variaveisMes += valor;
    }
  }
  out.resumo.saldoMes = Math.round((out.resumo.entradasMes - out.resumo.saidasMes)*100)/100;
  out.resumo.entradasMes = Math.round(out.resumo.entradasMes*100)/100;
  out.resumo.saidasMes   = Math.round(out.resumo.saidasMes*100)/100;
  out.resumo.fixasMes    = Math.round(out.resumo.fixasMes*100)/100;
  out.resumo.variaveisMes= Math.round(out.resumo.variaveisMes*100)/100;
  out.resumo.emAbertoTotal = Math.round(out.resumo.emAbertoTotal*100)/100;
  out.resumo.contasPagarTotal = Math.round(out.resumo.contasPagarTotal*100)/100;
  // Quadro de metas mensais
  out.resumo.vendidoMes = Math.round(out.resumo.vendidoMes*100)/100;
  out.resumo.meta = FIN_META_MENSAL;
  out.resumo.faltaMeta = Math.max(0, Math.round((FIN_META_MENSAL - out.resumo.vendidoMes)*100)/100);
  // últimas 20 movimentações (mais recentes primeiro)
  var start = Math.max(0, vals.length - 20);
  for(var j=vals.length-1; j>=start; j--){
    var v=vals[j];
    out.ultimas.push({ id:v[0], tipo:v[1], status:v[2], data:(v[4]||v[3]),
      quem:v[5], descricao:v[6], categoria:v[7], conta:v[8], valor:_num(v[9]) });
  }
  return out;
}

// CORREÇÃO ÚNICA: preenche o Mês/Ano de lançamentos antigos que ficaram em branco.
function finCorrigirCompetencia(){
  var sh = _finMov();
  var last = sh.getLastRow();
  if(last < 2) return 'Sem lançamentos para corrigir.';
  var vals = sh.getRange(2,1,last-1,FIN_HEADERS.length).getValues();
  var n = 0;
  for(var i=0;i<vals.length;i++){
    var m = vals[i][12], y = vals[i][13];
    if(!(m==='' || m==null || y==='' || y==null)) continue;
    var base = _dataBR(vals[i][3]) || _dataBR(vals[i][4]);
    var cp = _finComp(base);
    if(cp.m && cp.y){ sh.getRange(i+2,13).setValue(cp.m); sh.getRange(i+2,14).setValue(cp.y); n++; }
  }
  SpreadsheetApp.flush();
  var msg = 'Competência corrigida em '+n+' lançamento(s).';
  Logger.log(msg); return msg;
}

// CONTAS A PAGAR: registra uma saída com status "A pagar" (ainda não abate o saldo).
function finContaAdd(d){
  var valor = _num(d.valor);
  if(!(valor > 0)) return { ok:false, erro:'Informe um valor válido para a conta.' };
  var destino = (d.destino||d.onde||'').toString().trim();
  if(!destino) return { ok:false, erro:'Informe para onde é o pagamento.' };
  var cat = (d.categoria||'').toString().trim();
  if(cat.toUpperCase().indexOf('FIX')===0) cat='Fixo';
  else if(cat.toUpperCase().indexOf('VAR')===0) cat='Variável';
  var sh = _finMov();
  var id = _finNextId(sh);
  var venc = _finData(d.vencimento || d.data);
  var cp = _finComp(venc);
  sh.appendRow([id,'Saída','A pagar',venc,'',destino,
    (d.descricao||d.oque||''),cat,(d.conta||''),valor,'Conta a pagar',(d.boleto||''),cp.m,cp.y]);
  SpreadsheetApp.flush();
  return { ok:true, id:id };
}

// Marca uma conta a pagar como PAGA (abate no fluxo de caixa, na competência do pagamento).
function finContaPagar(d){
  var id = parseInt(d.id,10);
  if(isNaN(id)) return { ok:false, erro:'ID da conta inválido.' };
  var sh = _finMov();
  var last = sh.getLastRow();
  if(last < 2) return { ok:false, erro:'Sem lançamentos.' };
  var vals = sh.getRange(2,1,last-1,FIN_HEADERS.length).getValues();
  for(var i=0;i<vals.length;i++){
    if(parseInt(vals[i][0],10) === id){
      var row = i + 2;
      if(String(vals[i][1]) !== 'Saída' || String(vals[i][2]) !== 'A pagar')
        return { ok:false, erro:'Esse lançamento não é uma conta a pagar em aberto.' };
      var dataPg = _finData(d.data);
      var cp = _finComp(dataPg);
      sh.getRange(row,3).setValue('Pago');
      sh.getRange(row,5).setValue(dataPg);
      sh.getRange(row,13).setValue(cp.m);   // competência = mês do pagamento
      sh.getRange(row,14).setValue(cp.y);
      SpreadsheetApp.flush();
      return { ok:true, id:id };
    }
  }
  return { ok:false, erro:'Conta não encontrada (ID '+id+').' };
}

/* ================= RELATÓRIO MENSAL (PDF) =================
 *
 *  Gera um PDF com o fechamento do mês (vendas, recebimentos, saídas,
 *  custos fixos/variáveis e lucro) e salva na pasta
 *  "RELATÓRIOS FINANCEIROS - UNIÃO SOLAR" no Drive.
 *
 *  Automático: rode UMA vez setupRelatorioMensal — ele cria um gatilho
 *  diário que, no ÚLTIMO dia do mês, gera o relatório sozinho.
 *  Manual: botão no app (acao 'fin_relatorio') ou rode gerarRelatorioMensal.
 *===============================================================*/

var _FIN_MESES_NOME = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// Formata número em Real (pt-BR) sem depender de locale.
function _finBRL(n){
  n = Math.round((+n || 0) * 100) / 100;
  var neg = n < 0; if(neg) n = -n;
  var s = n.toFixed(2).split('.'); var int = s[0], out = '';
  for(var i=0;i<int.length;i++){ if(i>0 && (int.length-i)%3===0) out += '.'; out += int.charAt(i); }
  return (neg?'-':'') + 'R$ ' + out + ',' + s[1];
}

function _pastaRelatorios(){
  var nome = 'RELATÓRIOS FINANCEIROS - UNIÃO SOLAR';
  var it = DriveApp.getFoldersByName(nome);
  return it.hasNext() ? it.next() : DriveApp.createFolder(nome);
}

function _ehUltimoDiaDoMes(d){
  var t = new Date(d.getTime()); t.setDate(t.getDate() + 1);
  return t.getMonth() !== d.getMonth();
}

// Gatilho diário: só gera no último dia do mês.
function relatorioMensalAuto(){
  var hoje = new Date();
  if(!_ehUltimoDiaDoMes(hoje)) return;
  gerarRelatorioMensal(hoje.getMonth() + 1, hoje.getFullYear());
}

// Rode UMA vez: cria o gatilho diário que dispara o relatório no fim do mês.
function setupRelatorioMensal(){
  var trs = ScriptApp.getProjectTriggers();
  for(var i=0;i<trs.length;i++)
    if(trs[i].getHandlerFunction() === 'relatorioMensalAuto') ScriptApp.deleteTrigger(trs[i]);
  ScriptApp.newTrigger('relatorioMensalAuto').timeBased().everyDays(1).atHour(21).create();
  Logger.log('Gatilho do relatório mensal criado (checa todo dia às 21h, gera no último dia do mês).');
  return 'ok';
}

// Ação do app (botão): gera o relatório do mês pedido (ou do mês atual).
function finRelatorioAcao(d){
  var hoje = new Date();
  var mes = d && d.mes ? parseInt(d.mes,10) : (hoje.getMonth() + 1);
  var ano = d && d.ano ? parseInt(d.ano,10) : hoje.getFullYear();
  return gerarRelatorioMensal(mes, ano);
}

// Núcleo: monta os dados do mês, gera o PDF e salva no Drive.
function gerarRelatorioMensal(mes, ano){
  var sh = _finMov();
  var last = sh.getLastRow();
  var R = { mes:mes, ano:ano, mesNome:_FIN_MESES_NOME[mes-1] || ('Mês '+mes),
    vendas:0, recebido:0, emAberto:0, saidas:0, fixas:0, variaveis:0,
    entradas:[], listaSaidas:[], porConta:{}, pendencias:[] };

  if(last >= 2){
    var vals = sh.getRange(2,1,last-1,FIN_HEADERS.length).getValues();
    for(var i=0;i<vals.length;i++){
      var r = vals[i];
      var rm = parseInt(r[12],10), ry = parseInt(r[13],10);
      if(rm !== mes || ry !== ano) continue;
      var tipo = String(r[1]), status = String(r[2]), valor = _num(r[9]);
      if(tipo === 'Entrada'){
        R.vendas += valor;
        if(status === 'Recebido') R.recebido += valor;
        else { R.emAberto += valor; R.pendencias.push({ cliente:r[5], descricao:r[6], valor:valor }); }
        R.entradas.push({ data:(r[4]||r[3]), cliente:r[5], descricao:r[6], status:status, valor:valor });
      } else if(tipo === 'Saída'){
        R.saidas += valor;
        var cat = String(r[7]);
        if(cat === 'Fixo') R.fixas += valor; else if(cat === 'Variável') R.variaveis += valor;
        var conta = r[8] || '(sem conta)';
        R.porConta[conta] = (R.porConta[conta] || 0) + valor;
        R.listaSaidas.push({ data:(r[4]||r[3]), onde:r[5], categoria:cat, oque:r[6], conta:r[8], valor:valor });
      }
    }
  }
  R.lucro = Math.round((R.recebido - R.saidas) * 100) / 100;         // resultado de caixa
  R.resultadoVendas = Math.round((R.vendas - R.saidas) * 100) / 100; // vendas − saídas

  var html = _htmlRelatorio(R);
  var pdf = Utilities.newBlob(html, 'text/html', 'rel.html').getAs('application/pdf')
              .setName('Relatório Financeiro - ' + ('0'+mes).slice(-2) + '-' + ano + '.pdf');
  var arq = _pastaRelatorios().createFile(pdf);
  return { ok:true, mes:mes, ano:ano, mesNome:R.mesNome, url:arq.getUrl(),
    lucro:R.lucro, vendas:R.vendas, recebido:R.recebido, saidas:R.saidas };
}

function _relCard(label, valor, cor){
  return '<td style="border:1px solid #cfe8d8;padding:10px 12px;background:#f5fbf7">'
    + '<div style="font-size:8.5pt;color:#5a6a60;text-transform:uppercase;letter-spacing:.4px">'+label+'</div>'
    + '<div style="font-size:14pt;font-weight:bold;color:'+(cor||'#1c2b22')+';margin-top:2px">'+valor+'</div></td>';
}

function _htmlRelatorio(R){
  var css = "body{font-family:Arial,Helvetica,sans-serif;color:#222;font-size:10pt;line-height:1.4}"
    + "h1{font-size:15pt;color:#0e6b31;margin:0}"
    + ".sub{color:#555;font-size:9.5pt;margin:2px 0 12px}"
    + ".hd{border-bottom:3px solid #1aa64d;padding-bottom:8px;margin-bottom:12px}"
    + ".hd b{color:#0e6b31;font-size:12pt}.hd .s{font-size:8pt;color:#555}"
    + "table{width:100%;border-collapse:collapse;margin:6px 0 14px}"
    + "h2{font-size:11pt;color:#0e6b31;margin:14px 0 4px;border-left:4px solid #1aa64d;padding-left:8px}"
    + "th{background:#0e6b31;color:#fff;font-size:8.5pt;padding:6px 8px;text-align:left;border:1px solid #0e6b31}"
    + "td.c{font-size:8.7pt;padding:5px 8px;border:1px solid #d7e6dd}"
    + "tr.z td{background:#eef8f1}"
    + ".rt{text-align:right}.tot td{font-weight:bold;background:#cdefd8;border:1px solid #9fd8b4}"
    + ".neg{color:#c0392b}.pos{color:#0e6b31}";

  var h = '<html><head><meta charset="utf-8"><style>'+css+'</style></head><body>';
  h += '<div class="hd"><b>SUDOESTE SOLUÇÕES ELÉTRICAS LTDA</b> — União Solar'
     + '<div class="s">CNPJ: 51.045.101/0001-10 &nbsp;|&nbsp; Vitória da Conquista - BA</div></div>';
  h += '<h1>Relatório Financeiro — '+R.mesNome+' / '+R.ano+'</h1>';
  h += '<div class="sub">Fechamento do mês · gerado automaticamente pela Central União Solar.</div>';

  // Cartões de indicadores
  h += '<table><tr>'
     + _relCard('Vendas (contratos)', _finBRL(R.vendas))
     + _relCard('Recebido no mês', _finBRL(R.recebido), '#0e6b31')
     + _relCard('A receber (em aberto)', _finBRL(R.emAberto), '#b9770e')
     + '</tr><tr>'
     + _relCard('Saídas (gastos)', _finBRL(R.saidas), '#c0392b')
     + _relCard('Custos fixos', _finBRL(R.fixas))
     + _relCard('Custos variáveis', _finBRL(R.variaveis))
     + '</tr></table>';
  h += '<table><tr>'
     + _relCard('LUCRO DO MÊS (recebido − saídas)', _finBRL(R.lucro), R.lucro<0?'#c0392b':'#0e6b31')
     + _relCard('Resultado por vendas (vendas − saídas)', _finBRL(R.resultadoVendas), R.resultadoVendas<0?'#c0392b':'#0e6b31')
     + '</tr></table>';

  // Entradas / vendas
  h += '<h2>Vendas e recebimentos do mês</h2>';
  if(R.entradas.length){
    h += '<table><tr><th>Data</th><th>Cliente</th><th>Descrição</th><th>Status</th><th class="rt">Valor</th></tr>';
    for(var i=0;i<R.entradas.length;i++){ var e=R.entradas[i];
      h += '<tr'+(i%2?' class="z"':'')+'><td class="c">'+(e.data||'')+'</td><td class="c">'+(e.cliente||'')
         + '</td><td class="c">'+(e.descricao||'')+'</td><td class="c">'+e.status
         + '</td><td class="c rt">'+_finBRL(e.valor)+'</td></tr>'; }
    h += '<tr class="tot"><td class="c" colspan="4">TOTAL VENDAS</td><td class="c rt">'+_finBRL(R.vendas)+'</td></tr></table>';
  } else h += '<div class="sub">Sem vendas registradas neste mês.</div>';

  // Saídas
  h += '<h2>Gastos (saídas) do mês</h2>';
  if(R.listaSaidas.length){
    h += '<table><tr><th>Data</th><th>Onde / fornecedor</th><th>Tipo</th><th>O que foi</th><th>Conta</th><th class="rt">Valor</th></tr>';
    for(var j=0;j<R.listaSaidas.length;j++){ var s=R.listaSaidas[j];
      h += '<tr'+(j%2?' class="z"':'')+'><td class="c">'+(s.data||'')+'</td><td class="c">'+(s.onde||'')
         + '</td><td class="c">'+(s.categoria||'')+'</td><td class="c">'+(s.oque||'')
         + '</td><td class="c">'+(s.conta||'')+'</td><td class="c rt">'+_finBRL(s.valor)+'</td></tr>'; }
    h += '<tr class="tot"><td class="c" colspan="5">TOTAL SAÍDAS</td><td class="c rt">'+_finBRL(R.saidas)+'</td></tr></table>';
  } else h += '<div class="sub">Sem gastos registrados neste mês.</div>';

  // Saídas por conta
  var contas = Object.keys(R.porConta);
  if(contas.length){
    h += '<h2>Saídas por conta</h2><table><tr><th>Conta</th><th class="rt">Total</th></tr>';
    for(var k=0;k<contas.length;k++)
      h += '<tr'+(k%2?' class="z"':'')+'><td class="c">'+contas[k]+'</td><td class="c rt">'+_finBRL(R.porConta[contas[k]])+'</td></tr>';
    h += '</table>';
  }

  // Pendências
  if(R.pendencias.length){
    h += '<h2>Recebimentos ainda em aberto (deste mês)</h2><table><tr><th>Cliente</th><th>Descrição</th><th class="rt">Valor</th></tr>';
    for(var p=0;p<R.pendencias.length;p++){ var q=R.pendencias[p];
      h += '<tr'+(p%2?' class="z"':'')+'><td class="c">'+(q.cliente||'')+'</td><td class="c">'+(q.descricao||'')
         + '</td><td class="c rt">'+_finBRL(q.valor)+'</td></tr>'; }
    h += '<tr class="tot"><td class="c" colspan="2">TOTAL A RECEBER</td><td class="c rt">'+_finBRL(R.emAberto)+'</td></tr></table>';
  }

  h += '<div class="sub" style="margin-top:16px;color:#888">Relatório gerado em '
     + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')
     + ' · União Solar · valores em Reais (R$).</div>';
  h += '</body></html>';
  return h;
}

/* ================= OBRA / ENGENHARIA (checklist por cliente) =================
 *
 *  Ao gerar o contrato, cria-se automaticamente UMA obra (uma linha na
 *  planilha "OBRAS - UNIÃO SOLAR") com o material já preenchido e o
 *  checklist do passo a passo em aberto. Na plataforma a equipe marca a
 *  data de conclusão de cada etapa (só libera a próxima quando a anterior
 *  estiver concluída) e ao salvar grava tudo na planilha.
 *
 *  Etapa 2 (documentação) tem o bloco COELBA: se houver serviço, descreve,
 *  informa a data e gera uma ORDEM DE SERVIÇO em PDF (botão GERAR OS).
 *  Cada obra também guarda o APP DO CLIENTE (aplicativo, login, senha).
 *===========================================================================*/

var OBRAS_SHEET_NAME = 'OBRAS - UNIÃO SOLAR';
var OBRAS_TAB        = 'Obras';
var OBRA_ETAPAS = [
  'Compra do Material',
  'Envio da documentação de Primeira Etapa',
  'ART e Homologação do Projeto',
  'Chegada do material no local',
  'Instalação do Sistema',
  'Assinatura do Termo de Conclusão de Obra',
  'Pedido da Vistoria',
  'Usina Gerando'
];
var OBRAS_HEADERS = ['ID','Cliente','Projeto','Data contrato','Valor','Material','Status',
  '1. Compra Material','2. Doc 1ª Etapa','3. ART/Homologação','4. Chegada Material',
  '5. Instalação','6. Termo Conclusão','7. Pedido Vistoria','8. Usina Gerando',
  'COELBA?','Serviço COELBA','Data Serviço COELBA','OS (link)',
  'App Cliente','Login','Senha','Observações',
  'Equipe (ID)','Valor Serviço','Endereço Instalação','Telefone','Atualizado em',
  'Orçamento Previsto','Materiais Comprados','NF (link)','Receita Disponível'];

function _obrasId(){
  var p = PropertiesService.getScriptProperties();
  var id = p.getProperty('OBRAS_SHEET_ID');
  if(id){ try{ SpreadsheetApp.openById(id); return id; }catch(e){} }
  return _obrasCriar().getId();
}

function _obrasCriar(){
  var ss = SpreadsheetApp.create(OBRAS_SHEET_NAME);
  var sh = ss.getActiveSheet(); sh.setName(OBRAS_TAB);
  sh.getRange(1,1,1,OBRAS_HEADERS.length).setValues([OBRAS_HEADERS]);
  _obrasBeautify(sh);
  PropertiesService.getScriptProperties().setProperty('OBRAS_SHEET_ID', ss.getId());
  return DriveApp.getFileById(ss.getId());
}

function _obrasBeautify(sh){
  sh.getRange(1,1,1,OBRAS_HEADERS.length).setValues([OBRAS_HEADERS]);
  var rows = Math.max(sh.getMaxRows(), 300);
  _finClearBandings(sh);
  var band = sh.getRange(1,1,rows,OBRAS_HEADERS.length).applyRowBanding(SpreadsheetApp.BandingTheme.GREEN, true, false);
  try{ band.setHeaderRowColor(FIN_VERDE).setFirstRowColor('#ffffff').setSecondRowColor(FIN_ZEBRA); }catch(e){}
  sh.getRange(1,1,1,OBRAS_HEADERS.length)
    .setFontWeight('bold').setFontColor('#ffffff').setBackground(FIN_VERDE)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sh.setRowHeight(1,38);
  sh.setFrozenRows(1); sh.setFrozenColumns(2);
  sh.getRange(2,5,rows-1,1).setNumberFormat('R$ #,##0.00');   // Valor
  sh.setColumnWidth(1,45); sh.setColumnWidth(2,190); sh.setColumnWidth(3,120);
  sh.setColumnWidth(6,260); sh.setColumnWidth(23,240);
  for(var c=8;c<=15;c++) sh.setColumnWidth(c,110);
}

// Rode para criar OU embelezar a planilha de obras (sem perder dados).
function setupObras(){
  var id = _obrasId();
  var ss = SpreadsheetApp.openById(id);
  var sh = ss.getSheetByName(OBRAS_TAB) || ss.insertSheet(OBRAS_TAB);
  _obrasBeautify(sh);
  SpreadsheetApp.flush();
  var url = 'https://docs.google.com/spreadsheets/d/' + id + '/edit';
  Logger.log('OBRAS: ' + url);
  return url;
}

function _obrasMov(){ var sh=SpreadsheetApp.openById(_obrasId()).getSheetByName(OBRAS_TAB); try{ _ensureCols(sh, OBRAS_HEADERS.length); }catch(e){} return sh; }

function _obrasNextId(sh){
  var last = sh.getLastRow(); if(last < 2) return 1;
  var ids = sh.getRange(2,1,last-1,1).getValues(), mx=0;
  for(var i=0;i<ids.length;i++){ var n=parseInt(ids[i][0],10); if(!isNaN(n)&&n>mx) mx=n; }
  return mx + 1;
}

function _obrasFind(sh, id, cliente){
  var last = sh.getLastRow(); if(last < 2) return null;
  var vals = sh.getRange(2,1,last-1,OBRAS_HEADERS.length).getValues();
  var alvo = (cliente||'').toString().trim().toUpperCase();
  for(var i=0;i<vals.length;i++){
    if(id && parseInt(vals[i][0],10)===parseInt(id,10)) return { row:i+2, vals:vals[i] };
    if(!id && alvo && String(vals[i][1]).trim().toUpperCase()===alvo) return { row:i+2, vals:vals[i] };
  }
  return null;
}

// Cria a obra a partir do contrato (chamado dentro de gerarContrato).
function obraCriarDeContrato(d){
  var cliente = (d.nome||'').toString().trim();
  if(!cliente) return { ok:false, erro:'sem cliente' };
  var sh = _obrasMov();
  var material = (d.equipamentos && d.equipamentos.length) ? d.equipamentos.join(' | ') : '';
  var ja = _obrasFind(sh, null, cliente);
  if(ja){
    // Obra já existe: atualiza só o material/projeto/valor (mantém o checklist e o resto).
    if(material)      sh.getRange(ja.row, 6).setValue(material);
    if(d.projeto)     sh.getRange(ja.row, 3).setValue(d.projeto);
    if(_num(d.valor)) sh.getRange(ja.row, 5).setValue(_num(d.valor));
    if(d.contato)     sh.getRange(ja.row, 27).setValue(d.contato);
    sh.getRange(ja.row, 28).setValue(new Date());
    SpreadsheetApp.flush();
    return { ok:true, existe:true, atualizado:true, id:ja.vals[0] };
  }
  var dia = ('0'+(parseInt(d.data_dia,10)||1)).slice(-2);
  var mes = _finMesNum(d.data_mes);
  var ano = parseInt(d.data_ano,10) || (new Date()).getFullYear();
  var data = mes ? (dia+'/'+('0'+mes).slice(-2)+'/'+ano) : _finData('');
  var id = _obrasNextId(sh);
  sh.appendRow([id, cliente, (d.projeto||''), data, _num(d.valor)||'', material, '0/8',
    '','','','','','','','',        // 8 etapas
    'Não','','','',                  // COELBA?, serviço, data, OS
    '','','',                        // app, login, senha
    '',                              // obs
    '','',(d.endereco_instalacao||d.endereco||''), // equipe, valor serviço, endereço instalação
    (d.contato||''), new Date()]);   // telefone, atualizado em
  SpreadsheetApp.flush();
  return { ok:true, id:id };
}

// Cria uma obra manualmente (cliente que não passou por contrato gerado).
function obraCriarManual(d){
  var cliente = (d.cliente||'').toString().trim();
  if(!cliente) return { ok:false, erro:'Informe o nome do cliente.' };
  var sh = _obrasMov();
  var ja = _obrasFind(sh, null, cliente);
  if(ja) return { ok:false, erro:'Já existe uma obra para "'+cliente+'" na lista.', existe:true, id:ja.vals[0] };
  var id = _obrasNextId(sh);
  var data = d.dataContrato ? _finData(d.dataContrato) : _finData('');
  sh.appendRow([id, cliente, (d.projeto||''), data, _num(d.valor)||'', (d.material||''), '0/8',
    '','','','','','','','',
    'Não','','','',
    '','','',
    '',
    '','',(d.endereco||''),
    (d.telefone||''), new Date()]);
  SpreadsheetApp.flush();
  return { ok:true, id:id };
}

// Exclui um contrato do sistema INTEIRO: obra + entrada(s) no financeiro +
// status no funil + PDFs do contrato no Drive (a pasta volta para ORÇAMENTOS).
function contratoExcluir(d){
  var cliente = (d.cliente||'').toString().trim();
  var obraId = d.obraId || d.id;
  var out = { ok:true, cliente:cliente, removido:{ obra:false, financeiro:0, funil:false, drive:false } };
  var shO = _obrasMov();
  var fo = _obrasFind(shO, obraId, cliente);
  if(fo && !cliente) cliente = fo.vals[1];
  if(!cliente) return { ok:false, erro:'Informe o cliente do contrato a excluir.' };
  var alvo = _normNome(cliente);
  out.cliente = cliente;

  // 1. OBRA — apaga a linha
  try{ if(fo){ shO.deleteRow(fo.row); out.removido.obra = true; } }catch(e){ out.obraErro = String(e); }

  // 2. FINANCEIRO — remove as entradas de Contrato desse cliente (original + saldos)
  try{
    var shF = _finMov(); var lastF = shF.getLastRow();
    if(lastF >= 2){
      var vf = shF.getRange(2,1,lastF-1,FIN_HEADERS.length).getValues();
      var del = [];
      for(var i=0;i<vf.length;i++){
        if(String(vf[i][1])==='Entrada' && String(vf[i][10])==='Contrato' && _normNome(vf[i][5]||'')===alvo) del.push(i+2);
      }
      for(var k=del.length-1;k>=0;k--){ shF.deleteRow(del[k]); out.removido.financeiro++; }
    }
  }catch(e2){ out.financeiroErro = String(e2); }

  // 3. FUNIL — remove a linha do funil (o lead volta ao estado base "Lead frio")
  try{
    var mk=_mktMov(); var lastM=mk.getLastRow();
    if(lastM>=2){
      var vm=mk.getRange(2,1,lastM-1,MKT_HEADERS.length).getValues();
      for(var j=vm.length-1;j>=0;j--){ if(_normNome(vm[j][1]||'')===alvo){ mk.deleteRow(j+2); out.removido.funil=true; } }
    }
  }catch(e3){ out.funilErro=String(e3); }

  // 4. DRIVE — lixeira no contrato/procuração e move a pasta de volta para ORÇAMENTOS
  try{
    var pasta=_acharPastaCliente(cliente);
    if(pasta){
      ['CONTRATO - '+cliente.toUpperCase()+'.pdf','PROCURAÇÃO - '+cliente.toUpperCase()+'.pdf'].forEach(function(fn){
        try{ var it=pasta.getFilesByName(fn); while(it.hasNext()){ it.next().setTrashed(true); } }catch(e){}
      });
      try{ pasta.moveTo(DriveApp.getFolderById(ORCAMENTOS_FOLDER)); }catch(e){}
      out.removido.drive=true;
    }
  }catch(e4){ out.driveErro=String(e4); }

  SpreadsheetApp.flush();
  return out;
}

function obraListar(d){
  var sh = _obrasMov();
  var last = sh.getLastRow();
  var out = { ok:true, obras:[] };
  if(last < 2) return out;
  var vals = sh.getRange(2,1,last-1,OBRAS_HEADERS.length).getValues();
  for(var i=0;i<vals.length;i++){
    var v = vals[i]; if(!v[1]) continue;
    var feitas=0; for(var e=0;e<8;e++) if(v[7+e]) feitas++;
    var ref = v[27] || v[3];
    out.obras.push({ id:v[0], cliente:v[1], projeto:v[2], status:(feitas+'/8'), feitas:feitas, total:8,
      atualizadoEm:_dataBR(v[27]), diasSemAtualizar:_diasDesde(ref) });
  }
  // mais recentes primeiro
  out.obras.reverse();
  return out;
}

function _diasDesde(v){
  if(v == null || v === '') return null;
  var dt;
  if(Object.prototype.toString.call(v) === '[object Date]') dt = v;
  else { var s = String(v).split(' ')[0].split('/');
    if(s.length===3) dt = new Date(parseInt(s[2],10), parseInt(s[1],10)-1, parseInt(s[0],10)); }
  if(!dt || isNaN(dt.getTime())) return null;
  return Math.floor((new Date().getTime() - dt.getTime()) / 86400000);
}

function obraGet(d){
  var sh = _obrasMov();
  var f = _obrasFind(sh, d.id, d.cliente);
  if(!f) return { ok:false, erro:'Obra não encontrada.' };
  var v = f.vals;
  var etapas = [];
  for(var i=0;i<8;i++) etapas.push({ nome:OBRA_ETAPAS[i], data:_dataBR(v[7+i]) });
  return { ok:true, id:v[0], cliente:v[1], projeto:v[2], dataContrato:_dataBR(v[3]),
    valor:v[4], material:(v[5]||''), status:v[6], etapas:etapas,
    coelba:(v[15]||'Não'), servicoCoelba:(v[16]||''), dataCoelba:_dataBR(v[17]), osUrl:(v[18]||''),
    aplicativo:(v[19]||''), login:(v[20]||''), senha:(v[21]||''), obs:(v[22]||''),
    equipe:(v[23]||''), valorServico:(v[24]||''), enderecoInstalacao:(v[25]||''), telefone:(v[26]||''),
    orcamentoPrevisto:(v[28]||''), materiais:_parseMats(v[29]), nfUrl:(v[30]||''), receitaDisponivel:(v[31]||'') };
}
function _parseMats(s){ if(!s) return []; try{ var a=JSON.parse(s); return Array.isArray(a)?a:[]; }catch(e){ return []; } }

// Salva os custos da etapa 5: orçamento previsto, receita disponível, lista de material e (opcional) a NF.
function obraCustosSalvar(d){
  var sh=_obrasMov();
  var f=_obrasFind(sh, d.id, d.cliente);
  if(!f) return { ok:false, erro:'Obra não encontrada.' };
  var row=f.row;
  sh.getRange(row,29).setValue(_num(d.orcamentoPrevisto)||'');
  sh.getRange(row,30).setValue(JSON.stringify(d.materiais||[]));
  if(d.receitaDisponivel!==undefined) sh.getRange(row,32).setValue(_num(d.receitaDisponivel)||'');
  var out={ ok:true };
  if(d.nf){
    try{ var meta=_obraSalvarNF(f.vals[1], d.nf, d.nfTipo);
      sh.getRange(row,31).setValue(meta.url); out.nfUrl=meta.url;
    }catch(e){ out.nfErro=String(e); }
  }
  sh.getRange(row,28).setValue(new Date());
  SpreadsheetApp.flush();
  return out;
}
function _pastaNF(){
  var n='NOTAS FISCAIS - UNIÃO SOLAR';
  var it=DriveApp.getFoldersByName(n);
  return it.hasNext()? it.next() : DriveApp.createFolder(n);
}
function _obraSalvarNF(cliente, b64data, tipo){
  var m=String(b64data).match(/^data:([^;]+);base64,(.*)$/);
  var mime=m? m[1] : (tipo||'application/pdf');
  var raw=m? m[2] : String(b64data);
  var bytes=Utilities.base64Decode(raw);
  var ext=(mime.indexOf('pdf')>-1)?'pdf':(mime.indexOf('png')>-1?'png':'jpg');
  var carimbo=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd_HHmm');
  var fname='NF - '+String(cliente).toUpperCase()+' - '+carimbo+'.'+ext;
  var blob=Utilities.newBlob(bytes, mime, fname);
  var pasta=_acharPastaCliente(cliente) || _pastaNF();
  var file=pasta.createFile(blob);
  try{ file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }catch(e){}
  return { url:file.getUrl() };
}
// Salva o PDF da análise de rentabilidade (rasterizado no app) na pasta do cliente.
function obraAnaliseSalvar(d){
  var cliente=(d.cliente||d.nome||'').toString().trim();
  if(!cliente) return { ok:false, erro:'Sem cliente.' };
  if(!d.pdf) return { ok:false, erro:'Sem PDF.' };
  var b64=String(d.pdf).replace(/^data:application\/pdf;base64,/,'');
  var bytes=Utilities.base64Decode(b64);
  var carimbo=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');
  var fname='ANÁLISE DE RENTABILIDADE - '+cliente.toUpperCase()+' - '+carimbo+'.pdf';
  var blob=Utilities.newBlob(bytes,'application/pdf',fname);
  var pasta=_acharPastaCliente(cliente) || _criarPasta(cliente);
  try{ var it=pasta.getFilesByName(fname); while(it.hasNext()){ it.next().setTrashed(true); } }catch(e){}
  var f=pasta.createFile(blob);
  try{ f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }catch(e){}
  return { ok:true, url:f.getUrl(), pastaUrl:pasta.getUrl() };
}

function obraSalvar(d){
  var sh = _obrasMov();
  var f = _obrasFind(sh, d.id, d.cliente);
  if(!f) return { ok:false, erro:'Obra não encontrada.' };
  var row = f.row, et = d.etapas || [];
  var dates = [];
  for(var i=0;i<8;i++){ var val=(et[i]||'').toString().trim(); dates.push(val?_finData(val):''); }
  // gate sequencial: não pode concluir uma etapa sem a anterior
  for(var j=1;j<8;j++){
    if(dates[j] && !dates[j-1])
      return { ok:false, erro:'Conclua a etapa "'+OBRA_ETAPAS[j-1]+'" antes de "'+OBRA_ETAPAS[j]+'".' };
  }
  var feitas=0;
  for(var k=0;k<8;k++){ sh.getRange(row,8+k).setValue(dates[k]); if(dates[k]) feitas++; }
  sh.getRange(row,7).setValue(feitas+'/8');
  sh.getRange(row,16).setValue(d.coelba||'Não');
  sh.getRange(row,17).setValue(d.servicoCoelba||'');
  sh.getRange(row,18).setValue(d.dataCoelba?_finData(d.dataCoelba):'');
  sh.getRange(row,20).setValue(d.aplicativo||'');
  sh.getRange(row,21).setValue(d.login||'');
  sh.getRange(row,22).setValue(d.senha||'');
  sh.getRange(row,23).setValue(d.obs||'');
  if(d.equipe!==undefined)     sh.getRange(row,24).setValue(d.equipe||'');
  if(d.valorServico!==undefined) sh.getRange(row,25).setValue(d.valorServico?_num(d.valorServico):'');
  if(d.enderecoInstalacao!==undefined) sh.getRange(row,26).setValue(d.enderecoInstalacao||'');
  if(d.telefone!==undefined){
    sh.getRange(row,27).setValue(d.telefone||'');
    try{ if(d.telefone) _setContatoControle(f.vals[1], d.telefone); }catch(e){}
  }
  sh.getRange(row,28).setValue(new Date());
  SpreadsheetApp.flush();
  return { ok:true, status:feitas+'/8' };
}

function _pastaOS(){
  var n = 'ORDENS DE SERVIÇO - UNIÃO SOLAR';
  var it = DriveApp.getFoldersByName(n);
  return it.hasNext() ? it.next() : DriveApp.createFolder(n);
}

// Gera a Ordem de Serviço (COELBA) em PDF e salva na pasta do cliente.
function obraGerarOS(d){
  var sh = _obrasMov();
  var f = _obrasFind(sh, d.id, d.cliente);
  if(!f) return { ok:false, erro:'Obra não encontrada.' };
  var row = f.row, v = f.vals;
  var cliente = v[1];
  var servico = (d.servicoCoelba || v[16] || '').toString().trim();
  var data    = d.dataCoelba ? _finData(d.dataCoelba) : (v[17] || '');
  if(!servico) return { ok:false, erro:'Descreva o serviço da COELBA antes de gerar a OS.' };
  // persiste os dados COELBA
  sh.getRange(row,16).setValue('Sim');
  sh.getRange(row,17).setValue(servico);
  sh.getRange(row,18).setValue(data);
  var pasta = _acharPastaCliente(cliente) || _pastaOS();
  var html = _htmlOS({ cliente:cliente, projeto:v[2], material:(v[5]||''), servico:servico, data:data });
  var pdf = Utilities.newBlob(html,'text/html','os.html').getAs('application/pdf')
              .setName('ORDEM DE SERVIÇO - ' + cliente.toUpperCase() + '.pdf');
  var url = pasta.createFile(pdf).getUrl();
  sh.getRange(row,19).setValue(url);
  sh.getRange(row,28).setValue(new Date());
  SpreadsheetApp.flush();
  return { ok:true, url:url };
}

function _htmlOS(o){
  var css = "body{font-family:Arial,Helvetica,sans-serif;color:#222;font-size:11pt;line-height:1.5}"
    + ".hd{border-bottom:3px solid #1aa64d;padding-bottom:8px;margin-bottom:16px}"
    + ".hd b{color:#0e6b31;font-size:13pt}.hd .s{font-size:8.5pt;color:#555}"
    + "h1{font-size:15pt;color:#0e6b31;text-align:center;margin:6px 0 18px}"
    + ".box{border:1px solid #cfe8d8;border-radius:6px;padding:12px 14px;margin:10px 0;background:#f5fbf7}"
    + ".lbl{font-size:8.5pt;color:#5a6a60;text-transform:uppercase;letter-spacing:.4px}"
    + ".val{font-size:11pt;font-weight:bold;color:#1c2b22;margin-top:2px}"
    + "p{margin:8px 0}.mat{white-space:pre-line;font-size:10pt}"
    + ".sign{margin-top:60px;text-align:center}.line{border-top:1px solid #000;width:70%;margin:40px auto 4px}";
  var h = '<html><head><meta charset="utf-8"><style>'+css+'</style></head><body>';
  h += '<div class="hd"><b>SUDOESTE SOLUÇÕES ELÉTRICAS LTDA</b> — União Solar'
     + '<div class="s">CNPJ: 51.045.101/0001-10 &nbsp;|&nbsp; Rua Goes Calmon, 145, Centro &nbsp;|&nbsp; Vitória da Conquista - BA &nbsp;|&nbsp; (77) 99975-0486</div></div>';
  h += '<h1>ORDEM DE SERVIÇO</h1>';
  h += '<div class="box"><div class="lbl">Cliente</div><div class="val">'+(o.cliente||'')+'</div></div>';
  if(o.projeto) h += '<div class="box"><div class="lbl">Projeto</div><div class="val">'+o.projeto+'</div></div>';
  h += '<div class="box"><div class="lbl">Serviço a ser executado (COELBA)</div><div class="val" style="font-weight:normal">'+(o.servico||'')+'</div></div>';
  h += '<div class="box"><div class="lbl">Data prevista para realização</div><div class="val">'+(o.data||'A definir')+'</div></div>';
  if(o.material) h += '<div class="box"><div class="lbl">Material / equipamentos do sistema</div><div class="val mat" style="font-weight:normal">'+String(o.material).split(' | ').join('\n')+'</div></div>';
  h += '<div class="sign"><div class="line"></div><b>SUDOESTE SOLUÇÕES ELÉTRICAS LTDA</b><br>Responsável Técnico</div>';
  h += '<p style="font-size:8.5pt;color:#888;margin-top:30px">Ordem de serviço gerada pela Central União Solar em '
     + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')+'.</p>';
  h += '</body></html>';
  return h;
}

/* ================= PÓS-VENDA (chamados + Nota de Serviço) =================
 *
 *  Registra chamados de serviço dos clientes. A lista de clientes que
 *  fecharam contrato vem da planilha de OBRAS (busca no app). Clientes
 *  antigos podem ser digitados na hora. De cada chamado dá pra gerar
 *  uma NOTA DE SERVIÇO em PDF com o nome do cliente.
 *========================================================================*/

var POS_SHEET_NAME = 'PÓS-VENDA - UNIÃO SOLAR';
var POS_TAB        = 'Chamados';
var POS_HEADERS = ['ID','Data do chamado','Cliente','Serviço','Atendente',
  'Prazo p/ retorno','Protocolo / Nota','Status','Nota de Serviço (link)','Registrado em'];

function _posId(){
  var p = PropertiesService.getScriptProperties();
  var id = p.getProperty('POS_SHEET_ID');
  if(id){ try{ SpreadsheetApp.openById(id); return id; }catch(e){} }
  return _posCriar().getId();
}
function _posCriar(){
  var ss = SpreadsheetApp.create(POS_SHEET_NAME);
  var sh = ss.getActiveSheet(); sh.setName(POS_TAB);
  sh.getRange(1,1,1,POS_HEADERS.length).setValues([POS_HEADERS]);
  _posBeautify(sh);
  PropertiesService.getScriptProperties().setProperty('POS_SHEET_ID', ss.getId());
  return DriveApp.getFileById(ss.getId());
}
function _posBeautify(sh){
  sh.getRange(1,1,1,POS_HEADERS.length).setValues([POS_HEADERS]);
  var rows = Math.max(sh.getMaxRows(), 300);
  _finClearBandings(sh);
  var band = sh.getRange(1,1,rows,POS_HEADERS.length).applyRowBanding(SpreadsheetApp.BandingTheme.GREEN, true, false);
  try{ band.setHeaderRowColor(FIN_VERDE).setFirstRowColor('#ffffff').setSecondRowColor(FIN_ZEBRA); }catch(e){}
  sh.getRange(1,1,1,POS_HEADERS.length)
    .setFontWeight('bold').setFontColor('#ffffff').setBackground(FIN_VERDE)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sh.setRowHeight(1,34); sh.setFrozenRows(1);
  sh.setColumnWidth(1,45); sh.setColumnWidth(2,120); sh.setColumnWidth(3,190);
  sh.setColumnWidth(4,260); sh.setColumnWidth(5,150); sh.setColumnWidth(6,120);
  sh.setColumnWidth(7,140); sh.setColumnWidth(8,100); sh.setColumnWidth(9,180); sh.setColumnWidth(10,150);
}
function setupPosVenda(){
  var id = _posId();
  var ss = SpreadsheetApp.openById(id);
  var sh = ss.getSheetByName(POS_TAB) || ss.insertSheet(POS_TAB);
  _posBeautify(sh); SpreadsheetApp.flush();
  var url = 'https://docs.google.com/spreadsheets/d/' + id + '/edit';
  Logger.log('PÓS-VENDA: ' + url);
  return url;
}
function _posMov(){ return SpreadsheetApp.openById(_posId()).getSheetByName(POS_TAB); }
function _posNextId(sh){
  var last = sh.getLastRow(); if(last < 2) return 1;
  var ids = sh.getRange(2,1,last-1,1).getValues(), mx=0;
  for(var i=0;i<ids.length;i++){ var n=parseInt(ids[i][0],10); if(!isNaN(n)&&n>mx) mx=n; }
  return mx + 1;
}
function _posFind(sh, id){
  var last = sh.getLastRow(); if(last < 2) return null;
  var vals = sh.getRange(2,1,last-1,POS_HEADERS.length).getValues();
  for(var i=0;i<vals.length;i++) if(parseInt(vals[i][0],10)===parseInt(id,10)) return { row:i+2, vals:vals[i] };
  return null;
}

function posRegistrar(d){
  var cliente = (d.cliente||'').toString().trim();
  if(!cliente) return { ok:false, erro:'Informe o nome do cliente.' };
  var servico = (d.servico||'').toString().trim();
  if(!servico) return { ok:false, erro:'Descreva o serviço solicitado.' };
  var sh = _posMov();
  var id = _posNextId(sh);
  var prazo = d.prazo ? _finData(d.prazo) : '';
  var carimbo = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  sh.appendRow([id, _finData(d.data), cliente, servico, (d.atendente||''),
    prazo, (d.protocolo||''), 'Aberto', '', carimbo]);
  SpreadsheetApp.flush();
  return { ok:true, id:id };
}

function posListar(d){
  var sh = _posMov();
  var last = sh.getLastRow();
  var out = { ok:true, chamados:[] };
  if(last < 2) return out;
  var vals = sh.getRange(2,1,last-1,POS_HEADERS.length).getValues();
  var start = Math.max(0, vals.length - 40);
  for(var i=vals.length-1; i>=start; i--){
    var v = vals[i]; if(!v[2]) continue;
    out.chamados.push({ id:v[0], data:_dataBR(v[1]), cliente:v[2], servico:v[3], atendente:v[4],
      prazo:_dataBR(v[5]), protocolo:v[6], status:(v[7]||'Aberto'), notaUrl:(v[8]||'') });
  }
  return out;
}

function posStatus(d){
  var sh = _posMov();
  var f = _posFind(sh, d.id);
  if(!f) return { ok:false, erro:'Chamado não encontrado.' };
  var novo = (d.status==='Concluído') ? 'Concluído' : 'Aberto';
  sh.getRange(f.row, 8).setValue(novo);
  SpreadsheetApp.flush();
  return { ok:true, status:novo };
}

function _pastaNotas(){
  var n = 'NOTAS DE SERVIÇO - UNIÃO SOLAR';
  var it = DriveApp.getFoldersByName(n);
  return it.hasNext() ? it.next() : DriveApp.createFolder(n);
}

function posGerarNota(d){
  var sh = _posMov();
  var f = _posFind(sh, d.id);
  if(!f) return { ok:false, erro:'Chamado não encontrado.' };
  var v = f.vals;
  var o = { id:v[0], data:v[1], cliente:v[2], servico:v[3], atendente:v[4], prazo:v[5], protocolo:v[6] };
  var pasta = _acharPastaCliente(o.cliente) || _pastaNotas();
  var html = _htmlNotaServico(o);
  var pdf = Utilities.newBlob(html,'text/html','nota.html').getAs('application/pdf')
              .setName('NOTA DE SERVIÇO - ' + (o.cliente||'').toUpperCase() + ' - ' + o.id + '.pdf');
  var url = pasta.createFile(pdf).getUrl();
  sh.getRange(f.row, 9).setValue(url);
  SpreadsheetApp.flush();
  return { ok:true, url:url };
}

function _htmlNotaServico(o){
  var css = "body{font-family:Arial,Helvetica,sans-serif;color:#222;font-size:11pt;line-height:1.5}"
    + ".hd{border-bottom:3px solid #1aa64d;padding-bottom:8px;margin-bottom:16px}"
    + ".hd b{color:#0e6b31;font-size:13pt}.hd .s{font-size:8.5pt;color:#555}"
    + "h1{font-size:16pt;color:#0e6b31;text-align:center;margin:6px 0 4px}"
    + ".num{text-align:center;color:#555;font-size:9.5pt;margin-bottom:16px}"
    + ".box{border:1px solid #cfe8d8;border-radius:6px;padding:11px 13px;margin:9px 0;background:#f5fbf7}"
    + ".lbl{font-size:8.5pt;color:#5a6a60;text-transform:uppercase;letter-spacing:.4px}"
    + ".val{font-size:11.5pt;font-weight:bold;color:#1c2b22;margin-top:2px}"
    + ".two{display:flex;gap:10px}.two .box{flex:1}"
    + ".sign{margin-top:60px;text-align:center}.line{border-top:1px solid #000;width:70%;margin:40px auto 4px}";
  var h = '<html><head><meta charset="utf-8"><style>'+css+'</style></head><body>';
  h += '<div class="hd"><b>SUDOESTE SOLUÇÕES ELÉTRICAS LTDA</b> — União Solar'
     + '<div class="s">CNPJ: 51.045.101/0001-10 &nbsp;|&nbsp; Rua Goes Calmon, 145, Centro &nbsp;|&nbsp; Vitória da Conquista - BA &nbsp;|&nbsp; (77) 99975-0486</div></div>';
  h += '<h1>NOTA DE SERVIÇO</h1>';
  h += '<div class="num">Nº ' + o.id + (o.protocolo ? ' &nbsp;·&nbsp; Protocolo/Nota: ' + o.protocolo : '') + '</div>';
  h += '<div class="box"><div class="lbl">Cliente</div><div class="val">'+(o.cliente||'')+'</div></div>';
  h += '<div class="two"><div class="box"><div class="lbl">Data do chamado</div><div class="val">'+(o.data||'')+'</div></div>'
     + '<div class="box"><div class="lbl">Prazo para retorno</div><div class="val">'+(o.prazo||'A definir')+'</div></div></div>';
  h += '<div class="box"><div class="lbl">Serviço solicitado / executado</div><div class="val" style="font-weight:normal">'+(o.servico||'')+'</div></div>';
  h += '<div class="box"><div class="lbl">Atendente responsável</div><div class="val">'+(o.atendente||'')+'</div></div>';
  h += '<div class="sign"><div class="line"></div><b>'+(o.cliente||'')+'</b><br>Assinatura do cliente</div>';
  h += '<div class="sign" style="margin-top:34px"><div class="line"></div><b>SUDOESTE SOLUÇÕES ELÉTRICAS LTDA</b><br>Responsável pelo atendimento</div>';
  h += '<p style="font-size:8.5pt;color:#888;margin-top:26px">Nota de serviço gerada pela Central União Solar em '
     + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')+'.</p>';
  h += '</body></html>';
  return h;
}

/* ================= MARKETING (funil de leads) =================
 *
 *  Puxa TODOS os clientes que tiveram orçamento gerado (aba "Base de
 *  Dados") e monta um funil por etapa. O estado de cada lead (etapa,
 *  contato, data de retorno) fica salvo na planilha MARKETING no Drive.
 *============================================================*/

var MKT_SHEET_NAME = 'MARKETING - UNIÃO SOLAR';
var MKT_TAB        = 'Funil';
var MKT_ETAPAS = ['Lead frio','Orçamento enviado','Visita marcada',
  'Financiamento aprovado','Pendência de documentação','Retornar contato','Novo Cliente'];
var MKT_HEADERS = ['Nº Orçamento','Nome','Cidade','Valor','Potência','Inversor','Módulos',
  'Contato','Etapa','Data retorno','Atualizado em'];

function _mktId(){
  var p = PropertiesService.getScriptProperties();
  var id = p.getProperty('MKT_SHEET_ID');
  if(id){ try{ SpreadsheetApp.openById(id); return id; }catch(e){} }
  return _mktCriar().getId();
}
function _mktCriar(){
  var ss = SpreadsheetApp.create(MKT_SHEET_NAME);
  var sh = ss.getActiveSheet(); sh.setName(MKT_TAB);
  sh.getRange(1,1,1,MKT_HEADERS.length).setValues([MKT_HEADERS]);
  _mktBeautify(sh);
  PropertiesService.getScriptProperties().setProperty('MKT_SHEET_ID', ss.getId());
  return DriveApp.getFileById(ss.getId());
}
function _mktBeautify(sh){
  sh.getRange(1,1,1,MKT_HEADERS.length).setValues([MKT_HEADERS]);
  var rows = Math.max(sh.getMaxRows(), 300);
  _finClearBandings(sh);
  var band = sh.getRange(1,1,rows,MKT_HEADERS.length).applyRowBanding(SpreadsheetApp.BandingTheme.GREEN, true, false);
  try{ band.setHeaderRowColor(FIN_VERDE).setFirstRowColor('#ffffff').setSecondRowColor(FIN_ZEBRA); }catch(e){}
  sh.getRange(1,1,1,MKT_HEADERS.length)
    .setFontWeight('bold').setFontColor('#ffffff').setBackground(FIN_VERDE)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sh.setRowHeight(1,34); sh.setFrozenRows(1); sh.setFrozenColumns(2);
  sh.getRange(2,4,rows-1,1).setNumberFormat('R$ #,##0.00');
  sh.setColumnWidth(1,95); sh.setColumnWidth(2,190); sh.setColumnWidth(3,150);
  sh.setColumnWidth(6,150); sh.setColumnWidth(7,160); sh.setColumnWidth(8,150);
  sh.setColumnWidth(9,180); sh.setColumnWidth(10,110); sh.setColumnWidth(11,140);
}
function setupMarketing(){
  var id = _mktId();
  var ss = SpreadsheetApp.openById(id);
  var sh = ss.getSheetByName(MKT_TAB) || ss.insertSheet(MKT_TAB);
  _mktBeautify(sh); SpreadsheetApp.flush();
  var url = 'https://docs.google.com/spreadsheets/d/' + id + '/edit';
  Logger.log('MARKETING: ' + url);
  return url;
}
function _mktMov(){ return SpreadsheetApp.openById(_mktId()).getSheetByName(MKT_TAB); }

// Lista os leads = orçamentos da Base de Dados + estado salvo do funil.
function mktListar(d){
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_TAB);
  var last = sh.getLastRow();
  var leads = [];
  if(last >= 1){
    var ncol = Math.min(15, sh.getMaxColumns());
    var vals = sh.getRange(1,1,last,ncol).getValues();
    for(var i=0;i<vals.length;i++){
      var v = vals[i];
      var no = parseInt(v[0],10);
      if(isNaN(no) || !v[2]) continue;                // precisa de Nº e Nome
      leads.push({ numero:no, nome:v[2], cidade:v[3], valor:v[7],
        potencia:v[5], inversor:v[12], modulos:v[13],
        contatoBase:(ncol>=15 ? (v[14]||'') : '') });
    }
  }
  // estado do funil (etapa/contato/data retorno) por Nº
  var estado = {};
  var mk = _mktMov(); var ml = mk.getLastRow();
  if(ml >= 2){
    var mv = mk.getRange(2,1,ml-1,MKT_HEADERS.length).getValues();
    for(var j=0;j<mv.length;j++){
      estado[String(mv[j][0])] = { etapa:(mv[j][8]||'Lead frio'), contato:(mv[j][7]||''), dataRetorno:_dataBR(mv[j][9]) };
    }
  }
  var out = [];
  for(var k=0;k<leads.length;k++){
    var e = estado[String(leads[k].numero)];
    var etapa = e ? e.etapa : 'Lead frio';
    if(etapa === 'Finalizado') continue;        // negociação finalizada: fora do funil
    leads[k].etapa = etapa;
    leads[k].contato = (e && e.contato) ? e.contato : (leads[k].contatoBase || '');
    leads[k].dataRetorno = e ? e.dataRetorno : '';
    out.push(leads[k]);
  }
  out.reverse();   // mais recentes primeiro
  return { ok:true, etapas:MKT_ETAPAS, leads:out };
}

// Marca o lead como "Novo Cliente" no funil (chamado ao gerar o contrato).
function mktMarcarNovoCliente(nome){
  var alvo = _normNome(nome||'');
  if(!alvo) return { ok:false };
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_TAB);
  var last = sh.getLastRow(); var lead = null;
  if(last >= 1){
    var vals = sh.getRange(1,1,last,14).getValues();
    for(var i=0;i<vals.length;i++){
      var v = vals[i]; var no = parseInt(v[0],10);
      if(isNaN(no) || !v[2]) continue;
      if(_normNome(v[2]) === alvo)
        lead = { numero:no, nome:v[2], cidade:v[3], valor:v[7], potencia:v[5], inversor:v[12], modulos:v[13] };
    }
  }
  if(!lead) return { ok:false, semOrcamento:true };
  return mktSalvar({ numero:lead.numero, nome:lead.nome, cidade:lead.cidade, valor:lead.valor,
    potencia:lead.potencia, inversor:lead.inversor, modulos:lead.modulos, etapa:'Novo Cliente' });
}

// Salva/atualiza o estado de um lead no funil.
function mktSalvar(d){
  var numero = String(d.numero||'').trim();
  if(!numero) return { ok:false, erro:'Lead sem número de orçamento.' };
  var sh = _mktMov();
  var last = sh.getLastRow();
  var row = -1;
  if(last >= 2){
    var ids = sh.getRange(2,1,last-1,1).getValues();
    for(var i=0;i<ids.length;i++){ if(String(ids[i][0])===numero){ row=i+2; break; } }
  }
  var carimbo = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  var dret = (d.etapa==='Retornar contato' && d.dataRetorno) ? _finData(d.dataRetorno) : (d.dataRetorno?_finData(d.dataRetorno):'');
  var contatoAtual = (row > -1) ? String(sh.getRange(row,8).getValue()||'') : '';
  var contato = (d.contato!=null && String(d.contato).trim()!=='') ? String(d.contato).trim() : contatoAtual;
  var linha = [numero,(d.nome||''),(d.cidade||''),_num(d.valor)||'',(d.potencia||''),
    (d.inversor||''),(d.modulos||''),contato,(d.etapa||'Lead frio'),dret,carimbo];
  if(row > -1) sh.getRange(row,1,1,MKT_HEADERS.length).setValues([linha]);
  else sh.appendRow(linha);
  SpreadsheetApp.flush();
  return { ok:true };
}

/* ================= ORGANIZAR PLANILHAS =================
 *  Move as planilhas criadas pelo sistema (Fluxo de Caixa, Obras,
 *  Pós-venda e Marketing) para a pasta PLANILHAS. Rode UMA vez, depois
 *  de já ter criado as planilhas (setupFinanceiro/Obras/PosVenda/Marketing).
 *======================================================*/
function organizarPlanilhas(){
  var pastaId = PLANILHAS_FOLDER;
  var p = PropertiesService.getScriptProperties();
  var alvo = [
    ['Fluxo de Caixa', p.getProperty('FIN_SHEET_ID')],
    ['Obras',          p.getProperty('OBRAS_SHEET_ID')],
    ['Pós-venda',      p.getProperty('POS_SHEET_ID')],
    ['Marketing',      p.getProperty('MKT_SHEET_ID')],
    ['Manutenções',    p.getProperty('MANUT_SHEET_ID')]
  ];
  var res = [];
  for(var i=0;i<alvo.length;i++){
    var nome = alvo[i][0], id = alvo[i][1];
    if(!id){ res.push(nome + ': ainda não criada — rode o setup dela primeiro'); continue; }
    try{
      _moverParaPasta(id, pastaId);                    // API avançada (funciona em Drive compartilhado)
      res.push(nome + ': movida para PLANILHAS ✓');
    }catch(err){
      try{ DriveApp.getFileById(id).moveTo(DriveApp.getFolderById(pastaId)); res.push(nome + ': movida ✓'); }
      catch(e2){ res.push(nome + ': ERRO — ' + err); }
    }
  }
  var msg = res.join('\n');
  Logger.log(msg);
  return msg;
}

// Move um arquivo para a pasta destino usando a API avançada do Drive
// (compatível com Drive compartilhado, onde o moveTo comum falha).
function _moverParaPasta(fileId, pastaId){
  var meta = Drive.Files.get(fileId, { supportsAllDrives: true, fields: 'parents' });
  var rem = '';
  if(meta && meta.parents && meta.parents.length){
    rem = meta.parents.map(function(pp){ return (typeof pp === 'string') ? pp : pp.id; }).join(',');
  }
  Drive.Files.update({}, fileId, null, { addParents: pastaId, removeParents: rem, supportsAllDrives: true });
}

/* ================= EQUIPES DE EXECUÇÃO + LINK DA OBRA =================
 *
 *  Cadastro das equipes (CONTRATADO do contrato de prestação de serviço).
 *  Cada obra seleciona uma equipe + valor do serviço; o link da equipe
 *  (doGet ?exec=1&obra=...) mostra o contrato preenchido + upload de fotos.
 *===================================================================*/

var EQ_SHEET_NAME = 'EQUIPES DE EXECUÇÃO - UNIÃO SOLAR';
var EQ_TAB        = 'Equipes';
var EQ_HEADERS = ['ID','Nome / Razão social','CNPJ','Representante legal','CPF representante',
  'Endereço','CEP','Cidade/UF','Telefone','Cadastrado em'];

function _eqId(){
  var p = PropertiesService.getScriptProperties();
  var id = p.getProperty('EQ_SHEET_ID');
  if(id){ try{ SpreadsheetApp.openById(id); return id; }catch(e){} }
  return _eqCriar().getId();
}
function _eqCriar(){
  var ss = SpreadsheetApp.create(EQ_SHEET_NAME);
  var sh = ss.getActiveSheet(); sh.setName(EQ_TAB);
  sh.getRange(1,1,1,EQ_HEADERS.length).setValues([EQ_HEADERS]);
  _eqBeautify(sh);
  PropertiesService.getScriptProperties().setProperty('EQ_SHEET_ID', ss.getId());
  return DriveApp.getFileById(ss.getId());
}
function _eqBeautify(sh){
  sh.getRange(1,1,1,EQ_HEADERS.length).setValues([EQ_HEADERS]);
  var rows = Math.max(sh.getMaxRows(), 200);
  _finClearBandings(sh);
  var band = sh.getRange(1,1,rows,EQ_HEADERS.length).applyRowBanding(SpreadsheetApp.BandingTheme.GREEN, true, false);
  try{ band.setHeaderRowColor(FIN_VERDE).setFirstRowColor('#ffffff').setSecondRowColor(FIN_ZEBRA); }catch(e){}
  sh.getRange(1,1,1,EQ_HEADERS.length).setFontWeight('bold').setFontColor('#ffffff').setBackground(FIN_VERDE)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sh.setRowHeight(1,34); sh.setFrozenRows(1);
  sh.setColumnWidth(2,220); sh.setColumnWidth(6,240); sh.setColumnWidth(4,190);
}
function setupEquipes(){
  var id=_eqId(); var ss=SpreadsheetApp.openById(id);
  var sh=ss.getSheetByName(EQ_TAB)||ss.insertSheet(EQ_TAB);
  _eqBeautify(sh); SpreadsheetApp.flush();
  var url='https://docs.google.com/spreadsheets/d/'+id+'/edit'; Logger.log('EQUIPES: '+url); return url;
}
function _eqMov(){ return SpreadsheetApp.openById(_eqId()).getSheetByName(EQ_TAB); }
function _eqNextId(sh){ var last=sh.getLastRow(); if(last<2) return 1;
  var ids=sh.getRange(2,1,last-1,1).getValues(), mx=0;
  for(var i=0;i<ids.length;i++){ var n=parseInt(ids[i][0],10); if(!isNaN(n)&&n>mx) mx=n; } return mx+1; }
function _eqFind(sh,id){ var last=sh.getLastRow(); if(last<2) return null;
  var vals=sh.getRange(2,1,last-1,EQ_HEADERS.length).getValues();
  for(var i=0;i<vals.length;i++) if(parseInt(vals[i][0],10)===parseInt(id,10)) return {row:i+2, vals:vals[i]};
  return null; }

function equipeSalvar(d){
  var nome=(d.nome||'').toString().trim();
  if(!nome) return { ok:false, erro:'Informe o nome / razão social da equipe.' };
  var sh=_eqMov();
  var carimbo=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'dd/MM/yyyy HH:mm');
  var linha=[null,nome,(d.cnpj||''),(d.representante||''),(d.cpf||''),(d.endereco||''),(d.cep||''),(d.cidade||''),(d.telefone||''),carimbo];
  if(d.id){
    var f=_eqFind(sh,d.id);
    if(f){ linha[0]=parseInt(d.id,10); sh.getRange(f.row,1,1,EQ_HEADERS.length).setValues([linha]); SpreadsheetApp.flush(); return {ok:true, id:parseInt(d.id,10)}; }
  }
  var id=_eqNextId(sh); linha[0]=id; sh.appendRow(linha); SpreadsheetApp.flush();
  return { ok:true, id:id };
}
function equipeListar(d){
  var sh=_eqMov(); var last=sh.getLastRow(); var out={ok:true, equipes:[]};
  if(last<2) return out;
  var vals=sh.getRange(2,1,last-1,EQ_HEADERS.length).getValues();
  for(var i=0;i<vals.length;i++){ var v=vals[i]; if(!v[1]) continue;
    out.equipes.push({ id:v[0], nome:v[1], cnpj:v[2], representante:v[3], cpf:v[4], endereco:v[5], cep:v[6], cidade:v[7], telefone:v[8] }); }
  return out;
}
function equipeExcluir(d){
  var sh=_eqMov(); var f=_eqFind(sh,d.id); if(!f) return {ok:false, erro:'Equipe não encontrada.'};
  sh.deleteRow(f.row); SpreadsheetApp.flush(); return {ok:true};
}

/* ---------- Dados + HTML do contrato de prestação de serviço ---------- */

var _MES_MIN = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function _contratoServicoDados(obra, equipe){
  var mat = (obra.material||'').toString().split(' | ');
  var hoje = new Date();
  return {
    nome: (equipe&&equipe.nome)||'', cnpj:(equipe&&equipe.cnpj)||'', endereco:(equipe&&equipe.endereco)||'',
    cep:(equipe&&equipe.cep)||'', cidade:(equipe&&equipe.cidade)||'', representante:(equipe&&equipe.representante)||'', cpf:(equipe&&equipe.cpf)||'',
    cliente: obra.cliente||'',
    modulos: (mat[0]||'').trim(), inversor: (mat[1]||'').trim(),
    enderecoInstalacao: obra.enderecoInstalacao||'',
    valor: obra.valorServico? ('R$ '+_num(obra.valorServico).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})) : '',
    valorExtenso: obra.valorServico? _extensoReais(_num(obra.valorServico)) : '',
    dataDia: ('0'+hoje.getDate()).slice(-2), dataMes: _MES_MIN[hoje.getMonth()], dataAno: hoje.getFullYear()
  };
}

function _htmlContratoServico(d){
  function b(x){ return x||'________________'; }
  var css="body{font-family:'Times New Roman',Georgia,serif;color:#111;font-size:11pt;line-height:1.55}"
    +"h1{text-align:center;font-size:14pt;margin:0 0 20px}h2{font-size:11pt;margin:16px 0 6px}"
    +"p{text-align:justify;margin:8px 0}b{font-weight:bold} .cl{margin:8px 0;text-align:justify}"
    +".sig{margin-top:40px}.sig p{margin:34px 0 2px}";
  var h='<html><head><meta charset="utf-8"><style>'+css+'</style></head><body>';
  h+='<h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>';
  h+='<p><b>CONTRATANTE:</b> <i>SUDOESTE SOLUÇÕES ELETRICAS LTDA</i>, inscrita no CNPJ sob n.º 51.045.101/0001-10, estabelecida na Rua Goes Calmon, n.º 145 – Edif. Manoelito Freitas, Sala 007, Bairro Centro, Vitória da Conquista, com endereço eletrônico uniaosolarvca@gmail.com.</p>';
  h+='<p><b>CONTRATADO:</b> <i>'+b(d.nome)+'</i>, CNPJ nº '+b(d.cnpj)+', localizado na '+b(d.endereco)+', CEP nº '+b(d.cep)+', '+b(d.cidade)+'. Neste ato representado na forma dos seus atos constitutivos, tendo como representante legal: '+b(d.representante)+', brasileiro, CPF nº '+b(d.cpf)+', residente e domiciliado na '+b(d.endereco)+', CEP nº '+b(d.cep)+', '+b(d.cidade)+'.</p>';
  h+='<p><i>As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Prestação de Serviços, que se regerá pelas cláusulas seguintes e pelas condições de preço, forma e termo de pagamento descritas no presente.</i></p>';
  h+='<h2>1. DO OBJETO DO CONTRATO</h2>';
  h+='<p class="cl"><b>Cláusula 1ª.</b> A parte <b>CONTRATADA</b>, por meio do presente contrato se compromete à prestação de serviços que possui como objeto: A instalação de um gerador fotovoltaico composto por '+b(d.modulos)+' e '+b(d.inversor)+', em imóvel localizado em '+b(d.enderecoInstalacao)+', estado da Bahia. – conforme os termos e condições a seguir elencados.</p>';
  h+='<h2>2. DO PRAZO DO CONTRATO</h2>';
  h+='<p class="cl"><b>Cláusula 2ª.</b> Este contrato possui prazo de vigência até a data da finalização da instalação fotovoltaica.</p>';
  h+='<p class="cl"><b>Cláusula 3ª.</b> A empresa <b>CONTRATADA</b> deverá prestar os serviços obedecendo os prazos que forem determinados no documento em anexo, sendo de total responsabilidade do mesmo, comunicar caso não seja possível o cumprimento da prestação de serviços contratada, descrevendo os motivos e informando um novo prazo de previsão.</p>';
  h+='<h2>3. DO PAGAMENTO</h2>';
  h+='<p class="cl"><b>Cláusula 4ª.</b> O <b>CONTRATANTE</b>, deverá efetuar o pagamento de '+b(d.valor)+' ('+b(d.valorExtenso)+'), a serem pagos da seguinte forma: 50% do valor acordado no início da instalação e 50% após a conclusão completa do serviço.</p>';
  h+='<h2>4. OBRIGAÇÕES DO CONTRATANTE</h2>';
  h+='<p class="cl"><b>Cláusula 5ª.</b> O <b>CONTRATANTE</b> deverá fornecer ao <b>CONTRATADO</b> todas as informações necessárias à realização do serviço, devendo especificar os detalhes necessários à perfeita consecução do mesmo, e a forma de como ele deve ser entregue.</p>';
  h+='<p class="cl"><b>Cláusula 6ª.</b> O <b>CONTRATANTE</b> deverá efetuar o pagamento de 50% do valor acordado no início da instalação e 50% após a conclusão completa do serviço.</p>';
  h+='<p class="cl"><b>Cláusula 7ª.</b> Adimplir com o pagamento, conforme consta neste contrato, nas formas especificadas.</p>';
  h+='<h2>5. OBRIGAÇÕES DO CONTRATADO</h2>';
  h+='<p class="cl"><b>Cláusula 8ª.</b> É dever do <b>CONTRATADO</b> executar o serviço da forma requerida pelo <b>CONTRATANTE</b> e coerente com as normas vigentes, bem como enviar fotos da instalação, conforme solicitado no manual de instalação.</p>';
  h+='<p class="cl"><b>Cláusula 9ª.</b> É dever do <b>CONTRATADO</b> oferecer a garantia do serviço pela duração de 12 meses após a conclusão do serviço.</p>';
  h+='<p class="cl"><b>Cláusula 10ª.</b> O <b>CONTRATADO</b> deve sempre fornecer notas ou cupons fiscais referentes aos pagamentos do presente instrumento.</p>';
  h+='<p class="cl"><b>Cláusula 11ª.</b> É dever do <b>CONTRATADO</b>, informar com antecedência a ocorrência de qualquer subcontratação do trabalho.</p>';
  h+='<p class="cl"><b>Cláusula 12ª.</b> É dever do <b>CONTRATADO</b> e de seus subordinados o respeito a todas as especificações técnicas, normas e as condições de segurança que serão aplicáveis aos serviços que foram contratados, bem como o uso de EPI\'s (Equipamento de Proteção Individual), além da garantia de conclusão dos cursos de NR10 e NR35.</p>';
  h+='<p class="cl"><b>Cláusula 13ª.</b> É dever do <b>CONTRATADO</b>, em caso de atos e omissões praticados por seus subordinados a responsabilização por qualquer dano seja ele causado ao contratante ou a terceiros.</p>';
  h+='<p class="cl"><b>Cláusula 14ª.</b> É responsabilidade do <b>CONTRATADO</b>, todo ônus de origem trabalhista ou tributário referente aos funcionários que foram contratados para a prestação do serviço, conforme a legislação vigente, ficando a <b>CONTRATANTE</b> isenta de qualquer responsabilidade desse cunho em relação a eles.</p>';
  h+='<p class="cl"><b>Cláusula 15ª.</b> É dever do <b>CONTRATADO</b>, providenciar aos seus subordinados os meios e equipamentos necessários para a execução correta da prestação do serviço.</p>';
  h+='<p class="cl"><b>Cláusula 16ª.</b> É dever do <b>CONTRATADO</b>, que este possua seguro de vida, incluindo os casos de subcontratação, que todos possuam seguro de vida, para prevenção em caso de possíveis acidentes.</p>';
  h+='<h2>6. DA RESCISÃO CONTRATUAL</h2>';
  h+='<p class="cl">Se qualquer cláusula do contrato for descumprida, por qualquer uma das partes, implicará a imediata rescisão do presente documento, não podendo a parte que foi <b>CONTRATADA</b> se isentar das suas responsabilidades referentes ao cuidado e sigilo com as informações e dados do <b>CONTRATANTE</b>.</p>';
  h+='<p class="cl"><b>Cláusula 17ª.</b> Em caso de descumprimento do presente contrato, caberá uma multa de 30% sobre o valor total do contrato firmado entre as partes.</p>';
  h+='<p class="cl"><b>Cláusula 18ª.</b> É obrigada a devolução dos valores já pagos pelo <b>CONTRATADO</b>, se ocorrer rescisão por justa causa pela parte do <b>CONTRATANTE</b>.</p>';
  h+='<p class="cl"><b>Cláusula 19ª.</b> Havendo rescisão por qualquer uma das partes, ainda assim o <b>CONTRATANTE</b> deverá efetuar o pagamento dos valores já vencidos.</p>';
  h+='<p class="cl"><b>OBS:</b> O presente documento poderá ser rescindido, a qualquer momento, por qualquer uma das partes, sem qualquer motivo relevante. Contudo, deve ser respeitado o prazo de no mínimo 05 dias, onde as parcelas referentes aos serviços já prestados deverão ser pagas, ou, os serviços já pagos, deverão ser prestados e finalizados.</p>';
  h+='<h2>7. DA EXTINÇÃO DO CONTRATO</h2>';
  h+='<p class="cl">Será extinto o presente contrato quando ocorrer alguma das hipóteses dispostas a seguir:</p>';
  h+='<p class="cl">a) Conclusão do serviço.<br>b) Extinção da Pessoa Jurídica.<br>c) Rescisão contratual em caso de falta de pagamento de qualquer uma das partes ou caso haja alguma impossibilidade de o contrato ser continuado, por situações de força maior ou de calamidade.</p>';
  h+='<h2>8. DAS CONDIÇÕES GERAIS</h2>';
  h+='<p class="cl"><b>Cláusula 20ª.</b> Fica compactuado entre as partes a total inexistência de vínculo trabalhista entre as partes contratantes, excluindo as obrigações previdenciárias e os encargos sociais, não havendo entre <b>CONTRATADO</b> e <b>CONTRATANTE</b> qualquer tipo de relação de subordinação.</p>';
  h+='<p class="cl"><b>Cláusula 21ª.</b> Salvo com a expressa autorização do <b>CONTRATANTE</b>, não pode o <b>CONTRATADO</b> transferir ou subcontratar os serviços previstos neste instrumento, sob o risco de ocorrer a rescisão imediata.</p>';
  h+='<p class="cl"><b>Cláusula 22ª.</b> Deverá a <b>CONTRATADA</b> assumir a responsabilidade por todas as providências e obrigações estabelecidas na legislação específica de acidentes de trabalho, quando, em ocorrência da espécie, forem vítimas os seus empregados durante a execução do contrato ou em conexão com ele.</p>';
  h+='<h2>9. DO FORO</h2>';
  h+='<p class="cl"><b>Cláusula 23ª.</b> Para dirimir quaisquer controvérsias oriundas do presente contrato, as partes elegem o foro da Comarca de Vitória da Conquista no Estado da Bahia.</p>';
  h+='<p class="cl">Por estarem assim justos e contratados, firmam o presente instrumento, em duas vias de igual teor, juntamente com 2 (duas) testemunhas.</p>';
  h+='<p>Vitória da Conquista, '+d.dataDia+' de '+d.dataMes+' de '+d.dataAno+'.</p>';
  h+='<div class="sig"><p>____________________________________________</p><b>SUDOESTE SOLUÇÕES ELETRICAS LTDA - CONTRATANTE</b>';
  h+='<p>____________________________________________</p><b>'+b(d.nome)+' - CONTRATADA</b></div>';
  h+='</body></html>';
  return h;
}

/* ================= MANUTENÇÕES ================= */
var MANUT_SHEET_NAME = 'MANUTENÇÕES - UNIÃO SOLAR';
var MANUT_TAB        = 'Manutencoes';
var MANUT_HEADERS = ['ID','Data','Cliente','Cidade','Qtd Módulos','Valor por Módulo',
  'Deslocamento','Total','Status','Concluída em','Lançado no Financeiro'];
function _manutId(){
  var p = PropertiesService.getScriptProperties();
  var id = p.getProperty('MANUT_SHEET_ID');
  if(id){ try{ SpreadsheetApp.openById(id); return id; }catch(e){} }
  return _manutCriar().getId();
}
function _manutCriar(){
  var ss = SpreadsheetApp.create(MANUT_SHEET_NAME);
  var sh = ss.getActiveSheet(); sh.setName(MANUT_TAB);
  sh.getRange(1,1,1,MANUT_HEADERS.length).setValues([MANUT_HEADERS]);
  _manutBeautify(sh);
  PropertiesService.getScriptProperties().setProperty('MANUT_SHEET_ID', ss.getId());
  return DriveApp.getFileById(ss.getId());
}
function _manutBeautify(sh){
  sh.getRange(1,1,1,MANUT_HEADERS.length).setValues([MANUT_HEADERS]);
  var rows = Math.max(sh.getMaxRows(), 300);
  _finClearBandings(sh);
  var band = sh.getRange(1,1,rows,MANUT_HEADERS.length).applyRowBanding(SpreadsheetApp.BandingTheme.GREEN, true, false);
  try{ band.setHeaderRowColor(FIN_VERDE).setFirstRowColor('#ffffff').setSecondRowColor(FIN_ZEBRA); }catch(e){}
  sh.getRange(1,1,1,MANUT_HEADERS.length).setFontWeight('bold').setFontColor('#ffffff').setBackground(FIN_VERDE)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sh.setRowHeight(1,34); sh.setFrozenRows(1);
  sh.getRange(2,6,rows-1,3).setNumberFormat('R$ #,##0.00');
  sh.getRange(1,1,rows,1).setHorizontalAlignment('center');
  sh.getRange(1,5,rows,1).setHorizontalAlignment('center');
  sh.getRange(1,9,rows,1).setHorizontalAlignment('center');
  sh.setColumnWidth(3,220); sh.setColumnWidth(4,170);
  sh.setColumnWidth(8,120); sh.setColumnWidth(11,150);
}
function setupManutencoes(){
  var id=_manutId(); var ss=SpreadsheetApp.openById(id);
  var sh=ss.getSheetByName(MANUT_TAB)||ss.insertSheet(MANUT_TAB);
  _manutBeautify(sh); SpreadsheetApp.flush();
  var url='https://docs.google.com/spreadsheets/d/'+id+'/edit'; Logger.log('MANUTENÇÕES: '+url); return url;
}
function _manutMov(){ return SpreadsheetApp.openById(_manutId()).getSheetByName(MANUT_TAB); }
function _manutNextId(sh){ var last=sh.getLastRow(); if(last<2) return 1;
  var ids=sh.getRange(2,1,last-1,1).getValues(), mx=0;
  for(var i=0;i<ids.length;i++){ var n=parseInt(ids[i][0],10); if(!isNaN(n)&&n>mx) mx=n; } return mx+1; }
function _manutFind(sh,id){ var last=sh.getLastRow(); if(last<2) return null;
  var vals=sh.getRange(2,1,last-1,MANUT_HEADERS.length).getValues();
  for(var i=0;i<vals.length;i++) if(parseInt(vals[i][0],10)===parseInt(id,10)) return {row:i+2, vals:vals[i]};
  return null; }
function manutSalvar(d){
  var cliente=(d.cliente||'').toString().trim();
  if(!cliente) return { ok:false, erro:'Informe o nome do cliente.' };
  var qtd = parseInt(d.qtd,10)||0;
  var vmod = _num(d.valorModulo);
  var desloc = _num(d.deslocamento);
  var total = qtd*vmod + desloc;
  if(!(total > 0)) return { ok:false, erro:'Informe a quantidade de módulos e o valor por módulo.' };
  var sh=_manutMov();
  var data=_finData(d.data);
  if(d.id){
    var f=_manutFind(sh,d.id);
    if(f){
      var status = f.vals[8] || 'Aberto';
      sh.getRange(f.row,1,1,MANUT_HEADERS.length).setValues([[parseInt(d.id,10),data,cliente,
        (d.cidade||''),qtd,vmod,desloc,total,status,(f.vals[9]||''),(f.vals[10]||'Não')]]);
      SpreadsheetApp.flush();
      return { ok:true, id:parseInt(d.id,10), total:total };
    }
  }
  var id=_manutNextId(sh);
  sh.appendRow([id,data,cliente,(d.cidade||''),qtd,vmod,desloc,total,'Aberto','','Não']);
  SpreadsheetApp.flush();
  return { ok:true, id:id, total:total };
}
function manutListar(d){
  var sh=_manutMov(); var last=sh.getLastRow(); var out={ok:true, manutencoes:[]};
  if(last<2) return out;
  var vals=sh.getRange(2,1,last-1,MANUT_HEADERS.length).getValues();
  for(var i=0;i<vals.length;i++){ var v=vals[i]; if(!v[2]) continue;
    out.manutencoes.push({ id:v[0], data:_dataBR(v[1]), cliente:v[2], cidade:v[3],
      qtd:v[4], valorModulo:_num(v[5]), deslocamento:_num(v[6]), total:_num(v[7]),
      status:(v[8]||'Aberto'), concluidaEm:_dataBR(v[9]),
      lancado:(String(v[10]).toUpperCase().indexOf('SIM')===0) }); }
  out.manutencoes.reverse();
  return out;
}
function manutConcluir(d){
  var sh=_manutMov(); var f=_manutFind(sh,d.id);
  if(!f) return { ok:false, erro:'Manutenção não encontrada.' };
  var novo = (d.status==='Aberto') ? 'Aberto' : 'Concluído';
  var jaLancado = String(f.vals[10]).toUpperCase().indexOf('SIM')===0;
  sh.getRange(f.row,9).setValue(novo);
  var out = { ok:true, id:parseInt(d.id,10), status:novo };
  if(novo==='Concluído'){
    sh.getRange(f.row,10).setValue(Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'dd/MM/yyyy'));
    if(!jaLancado){
      var total=_num(f.vals[7]);
      var r = finAddEntrada({ cliente:(f.vals[2]||''), descricao:'Manutenção fotovoltaica',
        valor:total, recebida:true, data:'' });
      sh.getRange(f.row,11).setValue(r&&r.ok ? ('Sim (#'+r.id+')') : 'Sim');
      out.lancado = true; out.financeiroId = r&&r.id;
    } else { out.lancado = false; out.jaLancado = true; }
  }
  SpreadsheetApp.flush();
  return out;
}

/* ================= PROPOSTA NO DRIVE + CONTATO DO CLIENTE ================= */
function _controle(){ return SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_TAB); }
function _ensureCols(sh,n){ var c=sh.getMaxColumns(); if(c<n) sh.insertColumnsAfter(c, n-c); }
function _normNome(s){ return (''+s).trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function propSalvar(d){
  var nome=(d.cliente||d.nome||'').toString().trim();
  if(!nome) return { ok:false, erro:'Sem cliente.' };
  if(!d.pdf) return { ok:false, erro:'Sem PDF.' };
  var b64=String(d.pdf).replace(/^data:application\/pdf;base64,/,'');
  var bytes=Utilities.base64Decode(b64);
  var fname='PROPOSTA - '+nome.toUpperCase()+'.pdf';
  var blob=Utilities.newBlob(bytes,'application/pdf',fname);
  var pasta=_acharPastaCliente(nome) || _criarPasta(nome);
  try{ var it=pasta.getFilesByName(fname); while(it.hasNext()){ it.next().setTrashed(true); } }catch(e){}
  var f=pasta.createFile(blob);
  try{ f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }catch(e){}
  return { ok:true, url:f.getUrl(), pastaUrl:pasta.getUrl() };
}
function _setContatoControle(chave, contato){
  var sh=_controle(); var last=sh.getLastRow(); if(last<4) return { ok:false };
  var vals=sh.getRange(1,1,last,3).getValues();
  var alvoNo   = (''+chave).match(/^\d+$/) ? parseInt(chave,10) : null;
  var alvoNome = _normNome(chave);
  var row=-1;
  for(var i=3;i<vals.length;i++){
    var no=parseInt(vals[i][0],10);
    var nm=_normNome(vals[i][2]||'');
    if(alvoNo!==null){ if(no===alvoNo){ row=i+1; break; } }
    else if(nm && nm===alvoNome){ row=i+1; }
  }
  if(row<0) return { ok:false, naoAchou:true };
  _ensureCols(sh,15);
  sh.getRange(row,15).setValue(String(contato||'').trim());
  var h=sh.getRange(3,15).getValue(); if(h===''||h===null) sh.getRange(3,15).setValue('Contato / WhatsApp');
  SpreadsheetApp.flush();
  var numero=parseInt(sh.getRange(row,1).getValue(),10);
  try{ _mktSetContatoRow(numero, contato); }catch(e){}
  return { ok:true, numero:numero };
}
function _mktSetContatoRow(numero, contato){
  var mk=_mktMov(); var ml=mk.getLastRow(); if(ml<2) return;
  var ids=mk.getRange(2,1,ml-1,1).getValues();
  for(var i=0;i<ids.length;i++){
    if(String(ids[i][0])===String(numero)){ mk.getRange(i+2,8).setValue(String(contato||'').trim()); return; }
  }
}
function contatoSalvar(d){
  var chave = d.numero || d.nome || d.cliente;
  if(!chave) return { ok:false, erro:'Informe o cliente.' };
  var r=_setContatoControle(chave, d.contato||'');
  if(!r.ok) return { ok:false, erro:'Cliente não encontrado no controle de orçamentos.' };
  return { ok:true, numero:r.numero };
}

/* ---------- Página do link da equipe (mobile) ---------- */

function _paginaExecucao(p){
  var sh = _obrasMov();
  var f = _obrasFind(sh, p.id, p.obra);
  if(!f) return '<html><body style="font-family:Arial;padding:24px"><h3>Obra não encontrada.</h3><p>Peça o link atualizado ao escritório.</p></body></html>';
  var obra = obraGet({ id:f.vals[0] });
  var equipe = null;
  if(obra.equipe){ var ef=_eqFind(_eqMov(), obra.equipe); if(ef){ var v=ef.vals; equipe={nome:v[1],cnpj:v[2],representante:v[3],cpf:v[4],endereco:v[5],cep:v[6],cidade:v[7]}; } }
  var dados = _contratoServicoDados(obra, equipe);
  var contratoHtml = _htmlContratoServico(dados);
  var cliente = (obra.cliente||'').toString();
  var temEquipe = !!equipe, temValor = !!obra.valorServico;

  var css="*{box-sizing:border-box}body{margin:0;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#eef2f0;color:#1c2b22}"
   +".top{background:#0e6b31;color:#fff;padding:16px 18px}.top h1{margin:0;font-size:17px}.top .s{font-size:12.5px;opacity:.9;margin-top:3px}"
   +".wrap{max-width:760px;margin:0 auto;padding:14px}"
   +".card{background:#fff;border-radius:14px;padding:16px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,.06)}"
   +".step{display:flex;align-items:center;gap:10px;font-weight:800;color:#0e6b31;font-size:15px;margin-bottom:8px}"
   +".num{width:26px;height:26px;border-radius:50%;background:#0e6b31;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px}"
   +".btn{display:inline-block;border:none;border-radius:11px;padding:13px 16px;font-size:15px;font-weight:700;cursor:pointer;width:100%;text-align:center}"
   +".btn.p{background:#0e6b31;color:#fff}.btn.o{background:#fff;color:#0e6b31;border:2px solid #0e6b31}.btn:disabled{opacity:.5}"
   +".warn{background:#fff3cd;color:#8a6d3b;border-radius:10px;padding:10px 12px;font-size:13px;margin-top:8px}"
   +".doc{border:1px solid #dfe6e2;border-radius:10px;max-height:300px;overflow:auto;padding:12px;font-size:12px;background:#fafdfb}"
   +".ph{display:flex;gap:10px;align-items:center;border:1px solid #dfe6e2;border-radius:10px;padding:8px;margin-top:8px}"
   +".ph img{width:64px;height:64px;object-fit:cover;border-radius:8px}"
   +".ph input{flex:1;border:1.5px solid #dfe6e2;border-radius:8px;padding:8px;font-size:13px}"
   +".ph .del{background:#c0392b;color:#fff;border:none;border-radius:8px;padding:8px 10px;cursor:pointer}"
   +".mini{font-size:12px;color:#6a7a70;margin-top:6px}";

  var h='<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
   +'<style>'+css+'</style>'
   +'<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" onerror="var s=document.createElement(\'script\');s.src=\'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js\';document.head.appendChild(s);"><\/script>'
   +'</head><body>'
   +'<div class="top"><h1>🔧 Execução de Obra — União Solar</h1><div class="s">Cliente: '+_htmlEsc(cliente)+(dados.nome?(' · Equipe: '+_htmlEsc(dados.nome)):'')+'</div></div>'
   +'<div class="wrap">';

  // Passo 1 — contrato
  h+='<div class="card"><div class="step"><span class="num">1</span> Contrato de prestação de serviço</div>';
  if(!temEquipe) h+='<div class="warn">⚠ O escritório ainda não selecionou a equipe desta obra. O contrato aparece com campos em branco até isso ser feito.</div>';
  if(!temValor) h+='<div class="warn">⚠ O valor do serviço ainda não foi preenchido pelo escritório.</div>';
  h+='<div class="doc" id="docBox">'+contratoHtml.replace(/^[\s\S]*<body>/,'').replace(/<\/body>[\s\S]*$/,'')+'</div>';
  h+='<div style="margin-top:10px"><button class="btn p" id="btnDoc">📄 Baixar contrato em PDF</button></div>';
  h+='</div>';

  // Passo 2 — fotos
  h+='<div class="card"><div class="step"><span class="num">2</span> Fotos da obra</div>';
  h+='<div class="mini">Adicione as fotos da instalação (você pode dar um nome a cada uma). Depois gere o PDF e envie ao escritório.</div>';
  h+='<div style="margin-top:10px"><label class="btn o" for="fotoInput">➕ Adicionar fotos</label><input id="fotoInput" type="file" accept="image/*" multiple style="display:none"></div>';
  h+='<div id="fotos"></div>';
  h+='<div style="margin-top:12px"><button class="btn p" id="btnFotos" disabled>🖼️ Gerar PDF das fotos</button></div>';
  h+='<div class="mini" id="fstatus"></div>';
  h+='</div>';

  h+='</div>'; // wrap

  // scripts
  var contratoJS = JSON.stringify(contratoHtml);
  var postUrl=''; try{ postUrl=ScriptApp.getService().getUrl(); }catch(e){}
  h+='<script>'
   +'var CONTRATO='+contratoJS+', CLIENTE='+JSON.stringify(cliente)+', POSTURL='+JSON.stringify(postUrl)+', TK='+JSON.stringify(TOKEN)+';'
   +'document.getElementById("btnDoc").onclick=function(){var w=window.open("","_blank");if(!w){alert("Permita pop-ups para baixar o contrato.");return;}w.document.open();w.document.write(CONTRATO);w.document.close();setTimeout(function(){try{w.focus();w.print();}catch(e){}},600);};'
   +'var fotos=[];'
   +'function comprime(u){return new Promise(function(res){var im=new Image();im.onload=function(){var mx=1600,w=im.naturalWidth,h=im.naturalHeight,r=Math.min(1,mx/Math.max(w,h));var cv=document.createElement("canvas");cv.width=Math.round(w*r);cv.height=Math.round(h*r);cv.getContext("2d").drawImage(im,0,0,cv.width,cv.height);try{res(cv.toDataURL("image/jpeg",0.72));}catch(e){res(u);}};im.onerror=function(){res(u);};im.src=u;});}'
   +'document.getElementById("fotoInput").onchange=function(ev){var fs=ev.target.files;for(var i=0;i<fs.length;i++){(function(file){var rd=new FileReader();rd.onload=async function(){var c=await comprime(rd.result);fotos.push({url:c,nome:""});render();};rd.readAsDataURL(file);})(fs[i]);}ev.target.value="";};'
   +'function render(){var c=document.getElementById("fotos");c.innerHTML="";fotos.forEach(function(f,idx){var d=document.createElement("div");d.className="ph";d.innerHTML=\'<img src="\'+f.url+\'"><input placeholder="Nome da foto (ex.: Padrão de entrada)" value="\'+(f.nome||"")+\'"><button class="del">✕</button>\';d.querySelector("input").oninput=function(){fotos[idx].nome=this.value;};d.querySelector(".del").onclick=function(){fotos.splice(idx,1);render();};c.appendChild(d);});document.getElementById("btnFotos").disabled=fotos.length===0;}'
   +'document.getElementById("btnFotos").onclick=async function(){var st=document.getElementById("fstatus"),b=this;if(!fotos.length){return;}b.disabled=true;st.textContent="⏳ Preparando…";var JS=window.jspdf;if(!JS){for(var w=0;w<40 && !window.jspdf;w++){await new Promise(function(r){setTimeout(r,150);});}JS=window.jspdf;}if(!JS){st.textContent="Não consegui carregar o gerador de PDF. Confira a internet e tente novamente.";b.disabled=false;return;}st.textContent="⏳ Gerando PDF…";var doc=new JS.jsPDF({unit:"pt",format:"a4"});var W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight();for(var i=0;i<fotos.length;i++){if(i>0)doc.addPage();doc.setFontSize(14);doc.setTextColor(14,107,49);doc.text("União Solar — Fotos da obra",40,44);doc.setFontSize(11);doc.setTextColor(60,60,60);doc.text("Cliente: "+CLIENTE,40,64);if(fotos[i].nome){doc.setFontSize(12);doc.setTextColor(20,20,20);doc.text(fotos[i].nome,40,88);}try{var img=await load(fotos[i].url);var maxW=W-80,maxH=H-140;var r=Math.min(maxW/img.w,maxH/img.h);var iw=img.w*r,ih=img.h*r;doc.addImage(fotos[i].url,"JPEG",(W-iw)/2,104,iw,ih);}catch(e){}}'
     +'var b64="";try{b64=doc.output("datauristring").split(",")[1];}catch(e){}'
     +'st.textContent="⏳ Salvando no Drive…";var saved=false,link="";'
     +'try{var r=await fetch(POSTURL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({token:TK,acao:"exec_fotos_salvar",obra:CLIENTE,pdf:b64})});var j=await r.json();if(j&&j.ok){saved=true;link=j.url;}}catch(e){}'
     +'try{doc.save("Fotos - "+CLIENTE+".pdf");}catch(e){}'
     +'st.innerHTML=saved?(\'✓ PDF gerado, baixado e <b>salvo no Drive</b> (pasta do cliente).\'+(link?(\' <a href="\'+link+\'" target="_blank">abrir</a>\'):\'\')):"✓ PDF gerado e baixado. Não consegui salvar no Drive agora — confira a conexão (o download foi feito).";b.disabled=false;};'
   +'function load(u){return new Promise(function(res,rej){var im=new Image();im.onload=function(){res({w:im.naturalWidth,h:im.naturalHeight});};im.onerror=rej;im.src=u;});}'
   +'<\/script>'
   +'</body></html>';
  return h;
}

function _htmlEsc(s){ return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Pasta reserva para fotos, caso a pasta do cliente não seja encontrada.
function _pastaFotos(){
  var n='FOTOS DE OBRA - UNIÃO SOLAR';
  var it=DriveApp.getFoldersByName(n);
  return it.hasNext()?it.next():DriveApp.createFolder(n);
}

// Recebe o PDF das fotos (base64) do link da equipe e salva na pasta do cliente.
function execFotosSalvar(d){
  var cliente=(d.obra||'').toString().trim();
  if(!cliente) return { ok:false, erro:'Obra não informada.' };
  if(!d.pdf)   return { ok:false, erro:'PDF vazio.' };
  var pasta=_acharPastaCliente(cliente) || _pastaFotos();
  var carimbo=Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy HHmm');
  var bytes=Utilities.base64Decode(d.pdf);
  var blob=Utilities.newBlob(bytes,'application/pdf','FOTOS DA OBRA - '+cliente.toUpperCase()+' - '+carimbo+'.pdf');
  var url=pasta.createFile(blob).getUrl();
  return { ok:true, url:url };
}

/* ================= B) FORMULÁRIO (celular) ================= */

// Rode ESTA função uma vez para criar o formulário e o link.
function setupFormulario(){
  // remove gatilhos antigos deste handler (evita duplicar)
  var trs = ScriptApp.getProjectTriggers();
  for (var i=0;i<trs.length;i++){
    if (trs[i].getHandlerFunction() === 'onFormSubmit') ScriptApp.deleteTrigger(trs[i]);
  }

  var form = FormApp.create('União Solar — Novo Orçamento');
  form.setDescription('Preencha para registrar o orçamento. A pasta no Drive e a planilha de dimensionamento são criadas automaticamente.');
  form.setCollectEmail(false);

  form.addTextItem().setTitle('Nome do cliente').setRequired(true);
  form.addTextItem().setTitle('Cidade (ex.: VITORIA DA CONQUISTA - BA)').setRequired(true);
  form.addMultipleChoiceItem().setTitle('Tipo de telhado')
      .setChoiceValues(['Cerâmico','Fibrocimento','Metálico','Mini Trilho','Laje','Solo']).setRequired(true);
  form.addMultipleChoiceItem().setTitle('Tipo de ligação')
      .setChoiceValues(['Monofásico','Bifásico','Trifásico']).setRequired(true);
  form.addTextItem().setTitle('Consumo mensal em kWh (só números, ex.: 1000)').setRequired(true);
  form.addTextItem().setTitle('Valor final do orçamento em R$ (só números, ex.: 15900)').setRequired(true);
  form.addTextItem().setTitle('Marca do módulo (ex.: OSDA)').setRequired(true);
  form.addTextItem().setTitle('Potência do módulo em Wp (só números, ex.: 620)').setRequired(true);
  form.addTextItem().setTitle('Modelo do inversor (ex.: SOFAR 6KTLX)').setRequired(true);

  ScriptApp.newTrigger('onFormSubmit').forForm(form).onFormSubmit().create();

  var url = form.getPublishedUrl();
  // guarda o link num documento fácil de achar no Drive
  var doc = DocumentApp.create('UNIAO SOLAR - LINK DO FORMULARIO');
  doc.getBody().setText('Link do formulário (abra no celular):\n\n' + url);
  doc.saveAndClose();

  Logger.log('LINK DO FORMULÁRIO: ' + url);
  return url;
}

// Disparado a cada envio do formulário.
function onFormSubmit(e){
  var m = {};
  var items = e.response.getItemResponses();
  for (var i=0;i<items.length;i++) m[items[i].getItem().getTitle()] = items[i].getResponse();

  var d = {
    nome     : (m['Nome do cliente'] || '').toString().trim(),
    cidadeKey: (m['Cidade (ex.: VITORIA DA CONQUISTA - BA)'] || '').toString().trim().toUpperCase(),
    telhado  : m['Tipo de telhado'] || '',
    ligacao  : m['Tipo de ligação'] || '',
    consumo  : _num(m['Consumo mensal em kWh (só números, ex.: 1000)']),
    valor    : _num(m['Valor final do orçamento em R$ (só números, ex.: 15900)']),
    marcaModulo: (m['Marca do módulo (ex.: OSDA)'] || '').toString().trim(),
    wp       : _num(m['Potência do módulo em Wp (só números, ex.: 620)']),
    inversor : (m['Modelo do inversor (ex.: SOFAR 6KTLX)'] || '').toString().trim(),
    qtdInversor: 1
  };
  d.cidade = d.cidadeKey;
  d.data = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
  d.moduloDesc = (d.marcaModulo + ' ' + d.wp + 'W').trim();

  var nome  = d.nome;
  var pasta = _criarPasta(nome);
  var copia = _copiaDim(d, nome, pasta);

  // calcula kWp e módulos a partir da irradiação da própria planilha copiada
  var calc = _lerDimensionamento(copia.getId(), d.consumo, d.wp);
  d.potencia = calc.kwp;
  d.nModulos = calc.nmod;

  _lancarLinha(d, nome);
}

/* ================= Motor comum ================= */

function registrar(d){
  var nome = (d.nome || '').toString().trim();
  if(!nome) throw 'Nome do cliente vazio';
  var out = { ok:true, cliente:nome };
  out.numero      = _lancarLinha(d, nome);
  var pasta       = _criarPasta(nome);
  out.pastaUrl    = pasta.getUrl();
  // A cópia do dimensionamento é secundária: se falhar, o registro e a pasta
  // NÃO podem quebrar. O erro fica só informado.
  try{ out.planilhaUrl = _copiaDim(d, nome, pasta).getUrl(); }
  catch(e){ out.dimensionamentoErro = String(e); }
  return out;
}

function _lancarLinha(d, nome){
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_TAB);
  var colA = sh.getRange(1, 1, sh.getMaxRows(), 1).getValues();
  var row = 4, maiorNo = 0;
  for (var i = 3; i < colA.length; i++){
    var v = colA[i][0];
    if (v !== '' && v !== null){
      row = i + 2;
      var n = parseInt(v, 10);
      if (!isNaN(n) && n > maiorNo) maiorNo = n;
    }
  }
  var no = maiorNo + 1;

  var mes = '', ano = '';
  var p = (d.data || '').toString().split('/');
  if (p.length === 3){ mes = parseInt(p[1],10); ano = parseInt(p[2],10); }

  var inversorStr = (d.qtdInversor || 1) + 'x ' + (d.inversor || '').toString().trim();
  var modulosStr  = (d.nModulos || '')  + 'x ' + (d.moduloDesc || '').toString().trim();
  var potTxt      = (d.potencia != null && d.potencia !== '') ? (d.potencia + ' kWp') : '';

  sh.getRange(row, 1).setValue(no);
  sh.getRange(row, 2).setValue(d.data || '');
  sh.getRange(row, 3).setValue(nome);
  sh.getRange(row, 4).setValue(d.cidade || d.cidadeKey || '');
  sh.getRange(row, 5).setValue(d.telhado || '');
  sh.getRange(row, 6).setValue(potTxt);
  if (d.valor != null && d.valor !== '') sh.getRange(row, 8).setValue(Number(d.valor));
  sh.getRange(row, 11).setValue(mes);
  sh.getRange(row, 12).setValue(ano);
  sh.getRange(row, 13).setValue(inversorStr);
  sh.getRange(row, 14).setValue(modulosStr);
  if (d.contato){
    _ensureCols(sh, 15);
    sh.getRange(row, 15).setValue(String(d.contato).trim());
    var _h = sh.getRange(3, 15).getValue();
    if (_h === '' || _h === null) sh.getRange(3, 15).setValue('Contato / WhatsApp');
  }
  SpreadsheetApp.flush();
  return no;
}

function _criarPasta(nome){
  var base = DriveApp.getFolderById(ORCAMENTOS_FOLDER);
  var alvo = nome.toUpperCase();
  var it = base.getFoldersByName(alvo);
  return it.hasNext() ? it.next() : base.createFolder(alvo);
}

function _copiaDim(d, nome, pasta){
  var copia = DriveApp.getFileById(TABELA_MASTER)
                      .makeCopy('DIMENSIONAMENTO - ' + nome.toUpperCase(), pasta);
  var sh = SpreadsheetApp.openById(copia.getId()).getSheetByName('Dimensionamento');
  _setDim(sh,'B3', d.data || '');
  _setDim(sh,'B4', nome);
  _setDim(sh,'B5', d.cidadeKey || d.cidade || '');
  _setDim(sh,'B8', LIG_MAP[d.ligacao] || d.ligacao || '');
  if (d.marcaModulo) _setDim(sh,'B23', d.marcaModulo);
  if (d.wp)          _setDim(sh,'C23', Number(d.wp));
  if (d.telhado)     _setDim(sh,'B25', d.telhado);
  if (d.consumo)     _setDim(sh,'K15', Number(d.consumo));
  SpreadsheetApp.flush();
  return copia;
}

// Escreve numa célula do dimensionamento sem quebrar quando a célula tem
// validação de dados (ex.: B23 só aceita marcas de uma lista). Se o valor for
// rejeitado pela validação, remove a validação daquela célula (na CÓPIA do
// cliente, não afeta o modelo) e grava mesmo assim. Nunca lança exceção.
function _setDim(sh, a1, val){
  try{
    var rg = sh.getRange(a1);
    try{ rg.setValue(val); }
    catch(e){ try{ rg.setDataValidation(null); rg.setValue(val); }catch(e2){} }
  }catch(e3){}
}

// lê a irradiação anual (M34) da planilha copiada e calcula kWp / nº de módulos
function _lerDimensionamento(fileId, consumo, wp){
  var sh = SpreadsheetApp.openById(fileId).getSheetByName('Dimensionamento');
  SpreadsheetApp.flush();
  Utilities.sleep(1500);
  var hsp = sh.getRange('M34').getValue();
  if (typeof hsp === 'number' && hsp > 0 && consumo > 0 && wp > 0){
    var kwpCalc = (consumo/30) / (hsp * (1 - PERDAS));
    var nmod = Math.ceil(kwpCalc * 1000 / wp);
    var kwp  = Math.round(nmod * wp / 1000 * 100) / 100;
    return { kwp: kwp, nmod: nmod };
  }
  // fallback: lê direto as células calculadas
  var b17 = sh.getRange('B17').getValue();
  var b24 = sh.getRange('B24').getValue();
  return {
    kwp:  (typeof b17==='number' && b17>0) ? Math.round(b17*100)/100 : '',
    nmod: (typeof b24==='number' && b24>0) ? Math.round(b24) : ''
  };
}

/* ================= util ================= */

function _num(v){
  if (v == null) return '';
  var s = String(v).replace(/[^0-9.,]/g,'');
  if (s.indexOf(',') > -1 && s.indexOf('.') > -1) s = s.replace(/\./g,'').replace(',','.'); // 15.900,00
  else if (s.indexOf(',') > -1) s = s.replace(',','.');                                     // 1500,5
  var n = parseFloat(s);
  return isNaN(n) ? '' : n;
}

function _json(o){
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
