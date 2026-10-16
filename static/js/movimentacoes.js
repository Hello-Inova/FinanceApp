const viewKey = document.querySelector('meta[name="finance-view"]')?.content || "saldo";
const itensPorPagina = 8;
let dados = [], paginaAtual = 1, editId = null, toastTimer;
const datasSelecionadas = new Set();
const lancamentosSelecionados = new Set();
const moeda = valor => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataLocal = valor => new Intl.DateTimeFormat("pt-BR").format(new Date(`${valor}T00:00:00`));
async function json(res) { const body = await res.json().catch(() => ({})); if (!res.ok) throw new Error(body.mensagem || "Não foi possível concluir a operação."); return body; }
function toast(msg, erro=false) { const el=document.getElementById("toast"); clearTimeout(toastTimer); el.textContent=`${erro?"⚠":"✓"} ${msg}`; el.classList.toggle("error",erro); el.classList.add("show"); toastTimer=setTimeout(()=>el.classList.remove("show"),3500); }
function tipoDaPagina() { return viewKey==="entradas"?"Entrada":viewKey==="saidas"?"Saída":null; }
function dadosDaPagina() { const tipo=tipoDaPagina(); const termo=iptPesquisa.value.trim().toLocaleLowerCase("pt-BR"); const mes=filtroMes.value; return dados.filter(i=>(!tipo||i.tipo===tipo)&&(!mes||String(i.data).slice(0,7)===mes)&&(!datasSelecionadas.size||datasSelecionadas.has(String(i.data)))&&(!termo||[i.descricao,i.obs,i.valor,moeda(i.valor)].some(v=>String(v||"").toLocaleLowerCase("pt-BR").includes(termo)))); }
function valorNaPagina(item) { return (viewKey === "saldo" && item.tipo === "Saída" ? -1 : 1) * Number(item.valor || 0); }
function atualizarSelecionarTodos(lista, quantidadeSelecionada){const checkbox=document.getElementById("selecionarTodos");if(!checkbox)return;checkbox.disabled=lista.length===0;checkbox.checked=lista.length>0&&quantidadeSelecionada===lista.length;checkbox.indeterminate=quantidadeSelecionada>0&&quantidadeSelecionada<lista.length;checkbox.setAttribute("aria-label",checkbox.checked?"Desmarcar todos os lançamentos filtrados":"Selecionar todos os lançamentos filtrados");}
function alternarTodos(marcar){dadosDaPagina().forEach(item=>{marcar?lancamentosSelecionados.add(item.id):lancamentosSelecionados.delete(item.id);});renderizar();}
function estaPago(item){return Number(item.pago||0)===1;}
function preencherMeses(){ const atual=filtroMes.value; const tipo=tipoDaPagina(); filtroMes.innerHTML='<option value="">Todos os meses</option>'; const nomes=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]; [...new Set(dados.filter(i=>!tipo||i.tipo===tipo).map(i=>String(i.data).slice(0,7)))].sort().reverse().forEach(chave=>{const [a,m]=chave.split("-"); filtroMes.add(new Option(`${nomes[Number(m)-1]}/${a}`,chave));}); filtroMes.value=[...filtroMes.options].some(opcao=>opcao.value===atual)?atual:""; }
function atualizarResumoDatas(){ const quantidade=datasSelecionadas.size; filtroDataResumo.textContent=quantidade===0?"Todas as datas":quantidade===1?dataLocal([...datasSelecionadas][0]):`${quantidade} datas`; }
function preencherDatas(){ const tipo=tipoDaPagina(); const mes=filtroMes.value; const disponiveis=[...new Set(dados.filter(i=>(!tipo||i.tipo===tipo)&&(!mes||String(i.data).slice(0,7)===mes)).map(i=>String(i.data)))].sort().reverse(); [...datasSelecionadas].forEach(data=>{if(!disponiveis.includes(data))datasSelecionadas.delete(data);}); filtroDataOpcoes.replaceChildren(); if(!disponiveis.length){const vazio=document.createElement("span");vazio.className="date-filter-empty";vazio.textContent="Nenhuma data disponível";filtroDataOpcoes.append(vazio);} disponiveis.forEach(data=>{const label=document.createElement("label");const input=document.createElement("input");const texto=document.createElement("span");input.type="checkbox";input.value=data;input.checked=datasSelecionadas.has(data);input.setAttribute("aria-label",dataLocal(data));texto.textContent=dataLocal(data);input.addEventListener("change",()=>{input.checked?datasSelecionadas.add(data):datasSelecionadas.delete(data);atualizarResumoDatas();paginaAtual=1;renderizar();});label.append(input,texto);filtroDataOpcoes.append(label);}); atualizarResumoDatas(); }
function renderizar(){
  const lista=dadosDaPagina(), totalPaginas=Math.ceil(lista.length/itensPorPagina)||1;
  paginaAtual=Math.min(paginaAtual,totalPaginas);
  const pagina=lista.slice((paginaAtual-1)*itensPorPagina,paginaAtual*itensPorPagina);
  const selecionados=lista.filter(item=>lancamentosSelecionados.has(item.id));
  const total=lista.reduce((s,item)=>s+valorNaPagina(item),0);
  const totalTabela=lista.reduce((s,item)=>s+Number(item.valor||0),0);
  const valorSelecionado=selecionados.reduce((s,item)=>s+Number(item.valor||0),0);
  tabela.replaceChildren();
  if(!pagina.length){
    const tr=tabela.insertRow(),td=tr.insertCell();
    td.colSpan=7;
    td.innerHTML='<div class="empty-table"><strong>Nenhum lançamento encontrado</strong><span>Ajuste os filtros ou use o botão Novo lançamento acima.</span></div>';
  }
  pagina.forEach(item=>{
    const tr=tabela.insertRow();
    if(viewKey==="saidas"&&estaPago(item))tr.classList.add("item-paid");
    if(lancamentosSelecionados.has(item.id))tr.classList.add("item-selected");
    const selecao=tr.insertCell();
    selecao.className="selection-cell";
    const checkbox=document.createElement("input");
    checkbox.type="checkbox";
    checkbox.className="item-checkbox";
    checkbox.checked=lancamentosSelecionados.has(item.id);
    checkbox.setAttribute("aria-label",`Selecionar ${item.descricao||"lançamento"}`);
    checkbox.addEventListener("change",()=>{
      checkbox.checked?lancamentosSelecionados.add(item.id):lancamentosSelecionados.delete(item.id);
      renderizar();
    });
    selecao.appendChild(checkbox);
    const rotulos=["Data","Tipo","Descrição","Valor","Observação"];
    [dataLocal(item.data),item.tipo,item.descricao,moeda(item.valor),item.obs||"—"].forEach((valor,n)=>{
      const td=tr.insertCell();
      td.textContent=valor;
      td.dataset.label=rotulos[n];
      if(n===4)td.className="desktop-only";
      if(n===3)td.className=item.tipo==="Entrada"?"valor-entrada":"valor-saida";
    });
    const acoes=tr.insertCell();
    acoes.dataset.label="Ações";
    const pago=estaPago(item);
    const botaoPagamento=viewKey==="saidas"?`<button type="button" class="btn-acao btn-payment ${pago?"btn-payment-paid":""}" onclick="alternarPagamento(${item.id},${pago?"false":"true"})" aria-label="${pago?"Marcar como não pago":"Marcar como pago"}">${pago?"✓ Pago":"Pagar"}</button>`:"";
    acoes.innerHTML=`<div class="acoes-tabela">${botaoPagamento}<button type="button" class="btn-acao btn-edit" onclick="editar(${item.id})" aria-label="Editar">✏️</button><button type="button" class="btn-acao btn-delete" onclick="excluir(${item.id})" aria-label="Excluir">🗑️</button></div>`;
  });
  totalPagina.textContent=moeda(total);
  totalPagina.classList.remove("loading-value");
  selecionadosResumo.textContent=`${selecionados.length} ${selecionados.length===1?"selecionado":"selecionados"}`;
  totalSelecionado.textContent=moeda(valorSelecionado);
  totalRestante.textContent=moeda(totalTabela-valorSelecionado);
  atualizarSelecionarTodos(lista,selecionados.length);
  contadorLancamentos.textContent=`${lista.length} ${lista.length===1?"lançamento":"lançamentos"}`;
  pageInfo.textContent=`Página ${paginaAtual} de ${totalPaginas}`;
  prevBtn.disabled=paginaAtual===1;
  nextBtn.disabled=paginaAtual===totalPaginas;
  resumoPeriodo.textContent=datasSelecionadas.size===1?`Em ${dataLocal([...datasSelecionadas][0])}`:(datasSelecionadas.size>1?`Em ${datasSelecionadas.size} datas selecionadas`:(filtroMes.selectedIndex>0?filtroMes.options[filtroMes.selectedIndex].text:"Em todos os meses"));
}
async function carregar(){try{dados=await json(await fetch("/lancamentos",{loadingMessage:"Carregando lançamentos..."}));const idsAtuais=new Set(dados.map(item=>item.id));[...lancamentosSelecionados].forEach(id=>{if(!idsAtuais.has(id))lancamentosSelecionados.delete(id);});preencherMeses();preencherDatas();renderizar();}catch(e){tabela.innerHTML=`<tr><td colspan="7"><div class="empty-table"><strong>Erro ao carregar</strong><span>${e.message}</span></div></td></tr>`;toast(e.message,true);}}
async function encerrarCiclo(){if(!dados.length){toast("Não há lançamentos para mover.",true);return;}if(!confirm("Encerrar o ciclo salvará o mês atual no histórico, moverá todos os lançamentos um mês adiante e marcará as saídas como pendentes. Deseja continuar?"))return;try{const resposta=await json(await fetch("/api/financas/encerrar-ciclo",{method:"POST",loadingMessage:"Encerrando ciclo financeiro..."}));lancamentosSelecionados.clear();datasSelecionadas.clear();paginaAtual=1;iptPesquisa.value="";filtroMes.value="";await carregar();toast(resposta.mensagem);}catch(e){toast(e.message,true);}}
function limparFiltros(){iptPesquisa.value="";filtroMes.value="";datasSelecionadas.clear();preencherDatas();filtroData.open=false;paginaAtual=1;renderizar();}
function editar(id){const i=dados.find(x=>x.id===id);if(!i)return;editId=id;editData.value=i.data;editTipo.value=i.tipo;editDescricao.value=i.descricao;editValor.value=i.valor;editObs.value=i.obs||"";modalEdit.style.display="flex";document.body.style.overflow="hidden";}
function fecharModalEdit(){modalEdit.style.display="none";document.body.style.overflow="";editId=null;}
async function salvarEdicao(){const body={data:editData.value,tipo:editTipo.value,descricao:editDescricao.value.trim(),valor:Number(editValor.value),obs:editObs.value.trim()};if(!body.data||!body.descricao||body.valor<=0){erroEdicao.textContent="Preencha os campos obrigatórios.";erroEdicao.style.display="block";return;}try{await json(await fetch(`/lancamentos/${editId}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),loadingMessage:"Atualizando lançamento..."}));fecharModalEdit();await carregar();toast("Lançamento atualizado.");}catch(e){erroEdicao.textContent=e.message;erroEdicao.style.display="block";}}
async function excluir(id){const i=dados.find(x=>x.id===id);if(!i||!confirm(`Excluir o lançamento “${i.descricao}”?`))return;try{await json(await fetch(`/lancamentos/${id}`,{method:"DELETE",loadingMessage:"Excluindo lançamento..."}));await carregar();toast("Lançamento excluído.");}catch(e){toast(e.message,true);}}
async function alternarPagamento(id,pago){const item=dados.find(x=>x.id===id);if(!item||item.tipo!=="Saída")return;try{const resposta=await json(await fetch(`/lancamentos/${id}/pagamento`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({pago}),loadingMessage:pago?"Marcando como pago...":"Reabrindo pagamento..."}));item.pago=resposta.pago?1:0;renderizar();toast(resposta.pago?"Lançamento marcado como pago.":"Lançamento marcado como pendente.");}catch(e){toast(e.message,true);}}
function abrirNovoLancamento(){const tipo=viewKey==="saidas"?"Saída":"Entrada";novoData.value=new Date().toISOString().slice(0,10);novoTipo.value=tipo;novoDescricao.value="";novoValor.value="";novoObs.value="";erroNovoLancamento.style.display="none";modalNovoLancamento.style.display="flex";document.body.style.overflow="hidden";novoDescricao.focus();}
function fecharNovoLancamento(){modalNovoLancamento.style.display="none";document.body.style.overflow="";}
async function salvarNovoLancamento(){const body={data:novoData.value,tipo:novoTipo.value,descricao:novoDescricao.value.trim(),valor:Number(novoValor.value),obs:novoObs.value.trim()};if(!body.data||!body.descricao||body.valor<=0){erroNovoLancamento.textContent="Preencha data, descrição e um valor maior que zero.";erroNovoLancamento.style.display="block";return;}try{await json(await fetch("/lancamentos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),loadingMessage:"Salvando lançamento..."}));fecharNovoLancamento();await carregar();toast("Lançamento salvo com sucesso.");}catch(e){erroNovoLancamento.textContent=e.message;erroNovoLancamento.style.display="block";}}
window.limparFiltros=limparFiltros;window.editar=editar;window.excluir=excluir;window.alternarPagamento=alternarPagamento;window.encerrarCiclo=encerrarCiclo;window.fecharModalEdit=fecharModalEdit;window.salvarEdicao=salvarEdicao;window.abrirNovoLancamento=abrirNovoLancamento;window.fecharNovoLancamento=fecharNovoLancamento;window.salvarNovoLancamento=salvarNovoLancamento;
window.addEventListener("DOMContentLoaded",()=>{iptPesquisa.addEventListener("input",()=>{paginaAtual=1;renderizar();});filtroMes.addEventListener("change",()=>{preencherDatas();paginaAtual=1;renderizar();});document.getElementById("selecionarTodos").addEventListener("change",e=>alternarTodos(e.currentTarget.checked));prevBtn.addEventListener("click",()=>{if(paginaAtual>1){paginaAtual--;renderizar();}});nextBtn.addEventListener("click",()=>{paginaAtual++;renderizar();});modalNovoLancamento.addEventListener("mousedown",e=>{if(e.target===modalNovoLancamento)fecharNovoLancamento();});document.addEventListener("click",e=>{if(filtroData.open&&!filtroData.contains(e.target))filtroData.open=false;});carregar();});
