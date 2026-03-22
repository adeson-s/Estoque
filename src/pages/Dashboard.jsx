import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import Chart from 'chart.js/auto';
import { useApp } from '../AppContext';
import PageHeader from '../components/PageHeader';
import SheetsService from '../services/SheetsService';
import { parseDate } from '../services/date';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  blue:     '#2563EB', blueSoft:   '#EFF6FF',
  red:      '#DC2626', redSoft:    '#FEF2F2',
  green:    '#16A34A', greenSoft:  '#F0FDF4',
  amber:    '#D97706', amberSoft:  '#FFFBEB',
  violet:   '#7C3AED',
  border:   '#E5E7EB', borderLt:   '#F3F4F6',
  text:     '#111827', muted:      '#6B7280',
  bg:       '#F9FAFB', white:      '#FFFFFF',
};

// 4 status fixos — ordem e cor imutáveis
const STATUS_CFG = {
  'NÃO ASSOCIOU': { color: '#7C3AED', soft: '#F5F3FF' },
  'TROCA':        { color: '#2563EB', soft: '#EFF6FF' },
  'PERDIDO':      { color: '#DC2626', soft: '#FEF2F2' },
  'SOBRA':        { color: '#16A34A', soft: '#F0FDF4' },
};
const S_KEYS   = Object.keys(STATUS_CFG);
const S_COLORS = S_KEYS.map(k => STATUS_CFG[k].color);
const PROD_CLR = ['#2563EB','#4F7FEF','#7BA3F5','#A8C0FA','#C7D9FF'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const initials   = (n='') => n.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
const AV_PALETTE = [
  {bg:'#EFF6FF',color:'#1D4ED8'},{bg:'#F0FDF4',color:'#166534'},
  {bg:'#FFF7ED',color:'#C2410C'},{bg:'#F5F3FF',color:'#5B21B6'},
  {bg:'#FEF2F2',color:'#991B1B'},{bg:'#ECFDF5',color:'#065F46'},
];
const avStyle = (n='') => AV_PALETTE[n.charCodeAt(0) % AV_PALETTE.length];
const stockPct = (a,m) => m ? Math.min(100, Math.round((a/m)*100)) : 100;

const byPeriod = (movs, p) => {
  if (p === 'all') return movs;

  const days = p === '7d' ? 7 : p === '30d' ? 30 : 1;

  const cut = new Date();
  cut.setDate(cut.getDate() - days + 1);
  cut.setHours(0, 0, 0, 0);

  return movs.filter(m => {
    const d = parseDate(m.DATA);
    console.log('RAW:', m.DATA, typeof m.DATA);
console.log('PARSED:', parseDate(m.DATA));
    return d && d >= cut;
  });
};

const byDay = movs => {
  const map = {};

  movs.forEach(m => {
    const d = parseDate(m.DATA);
    if (!d) return;

    // 🔥 FORMATO LOCAL (SEM UTC)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    map[key] = (map[key] || 0) + 1;
  });

  const sorted = Object.entries(map)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]));

  const labels = sorted.map(([k]) => {
    const [y, m, d] = k.split('-');
    return `${d}/${m}`; // 🔥 sem new Date aqui
  });

  const values = sorted.map(([, v]) => v);

  return { labels, values };
};

// ─── Componentes utilitários ──────────────────────────────────────────────────

/** Bullet • Online / • Offline — encaixado no slot direito do PageHeader via portal simples */
function SheetDot({ status, onSync }) {
  // status: 'online' | 'offline' | 'syncing'
  const dot = status==='online' ? C.green : status==='syncing' ? C.amber : C.red;
  const lbl = status==='online' ? 'Online' : status==='syncing' ? 'Sincronizando…' : 'Offline';
  return (
    <div style={{display:'flex',alignItems:'center',gap:10}}>
      <div style={{display:'flex',alignItems:'center',gap:5,fontSize:12}}>
        <span style={{
          width:8, height:8, borderRadius:'50%', background:dot, flexShrink:0,
          animation: status==='online' ? 'dotPulse 2.5s ease-in-out infinite' : 'none',
        }}/>
        <span style={{color: status==='online' ? C.green : status==='syncing' ? C.amber : C.red, fontWeight:500}}>
          {lbl}
        </span>
      </div>
      <button
        onClick={onSync}
        disabled={status==='syncing'}
        title="Sincronizar agora"
        style={{
          background:'none', border:`0.5px solid ${C.border}`, borderRadius:6,
          padding:'3px 8px', fontSize:12, color:C.muted, cursor: status==='syncing'?'default':'pointer',
          opacity: status==='syncing'?.45:1, transition:'opacity .2s',
        }}
      >↻</button>
    </div>
  );
}

function LoginBtn({ onClick }) {
  const [h,setH]=useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{
      display:'flex', alignItems:'center', gap:5,
      background:C.white, border:`0.5px solid ${h?C.blue:C.border}`,
      borderRadius:8, padding:'4px 11px', fontSize:11, fontWeight:500,
      color:h?C.blue:C.muted, cursor:'pointer', transition:'all .15s',
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
      Entrar
    </button>
  );
}

function LoginModal({ onClose }) {
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.32)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.white,borderRadius:14,padding:28,width:'100%',maxWidth:348,boxShadow:'0 8px 32px rgba(0,0,0,.13)'}}>
        <p style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:3}}>Acessar sistema</p>
        <p style={{fontSize:12,color:C.muted,marginBottom:20}}>Módulo de autenticação — em desenvolvimento</p>
        {['Usuário','Senha'].map((lbl,i)=>(
          <div key={lbl} style={{marginBottom:i===0?12:20}}>
            <p style={{fontSize:12,color:C.muted,marginBottom:4}}>{lbl}</p>
            <input type={i===1?'password':'text'} placeholder={i===1?'••••••••':'seu.usuario'}
              style={{width:'100%',borderRadius:8,border:`0.5px solid ${C.border}`,padding:'8px 12px',fontSize:13,color:C.text,outline:'none',boxSizing:'border-box',background:C.bg}}/>
          </div>
        ))}
        <div style={{display:'flex',gap:8}}>
          <button onClick={onClose} style={{flex:1,padding:'8px 0',borderRadius:8,fontSize:13,fontWeight:500,background:'none',border:`0.5px solid ${C.border}`,color:C.muted,cursor:'pointer'}}>Cancelar</button>
          <button style={{flex:1,padding:'8px 0',borderRadius:8,fontSize:13,fontWeight:500,background:C.blue,border:'none',color:'#fff',cursor:'not-allowed',opacity:.55}} title="Em breve">Entrar (em breve)</button>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, accent, sub, subColor }) {
  const [h,setH]=useState(false);
  return (
    <div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{
      background:C.white, border:`0.5px solid ${C.border}`, borderRadius:12,
      padding:'15px 16px', position:'relative', overflow:'hidden',
      boxShadow:h?'0 2px 10px rgba(0,0,0,.07)':'none', transition:'box-shadow .18s',
    }}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:accent,borderRadius:'12px 12px 0 0'}}/>
      <p style={{fontSize:11,color:C.muted,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:8}}>{label}</p>
      <p style={{fontSize:28,fontWeight:700,color:C.text,lineHeight:1}}>{value??'—'}</p>
      {sub&&<p style={{fontSize:11,color:subColor||C.muted,marginTop:6}}>{sub}</p>}
    </div>
  );
}

function PeriodFilter({ value, onChange }) {
  const opts=[{k:'today',l:'Hoje'},{k:'7d',l:'7 dias'},{k:'30d',l:'30 dias'},{k:'all',l:'Tudo'}];
  return (
    <div style={{display:'flex',gap:4}}>
      {opts.map(o=>(
        <button key={o.k} onClick={()=>onChange(o.k)} style={{
          fontSize:11, padding:'3px 10px', borderRadius:20, cursor:'pointer', fontWeight:500,
          background:value===o.k?C.blue:C.borderLt, color:value===o.k?'#fff':C.muted,
          border:`0.5px solid ${value===o.k?C.blue:C.border}`, transition:'all .15s',
        }}>{o.l}</button>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg=STATUS_CFG[status];
  if(cfg) return <span style={{background:cfg.soft,color:cfg.color,fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:20,whiteSpace:'nowrap'}}>{status}</span>;
  return <span style={{background:C.blueSoft,color:C.blue,fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:20}}>{status||'—'}</span>;
}

function AlertBar({ atual, minimo }) {
  const p  = stockPct(atual,minimo);
  const cl = p<=30?C.red:p<=65?C.amber:C.green;
  return (
    <div style={{width:54}}>
      <p style={{fontSize:10,color:cl,fontWeight:700,textAlign:'right',marginBottom:3}}>{p}%</p>
      <div style={{height:4,background:C.borderLt,borderRadius:2}}>
        <div style={{height:4,width:`${p}%`,background:cl,borderRadius:2,transition:'width .4s'}}/>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children, style={} }) {
  return (
    <div style={{background:C.white,border:`0.5px solid ${C.border}`,borderRadius:12,padding:'16px 18px',...style}}>
      <p style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:subtitle?2:14}}>{title}</p>
      {subtitle&&<p style={{fontSize:11,color:C.muted,marginBottom:14}}>{subtitle}</p>}
      {children}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { dados } = useApp();
  const { movimentacoes=[], produtos=[] } = dados;

  const [period,    setPeriod]    = useState('30d');
  const [loginOpen, setLoginOpen] = useState(false);
  const [sheetSt,   setSheetSt]  = useState('online');
  const [syncErr,   setSyncErr]  = useState(null);

  // ── Detectar conexão pela chegada de dados ───────────────────────────────
  useEffect(() => {
    if (movimentacoes.length > 0) setSheetSt('online');
  }, [movimentacoes.length]);

  const handleSync = useCallback(async () => {
    setSheetSt('syncing'); setSyncErr(null);
    try {
      if (typeof SheetsService.refresh === 'function') await SheetsService.refresh();
      else await new Promise(r=>setTimeout(r,1200));
      setSheetSt('online');
    } catch(e) {
      setSheetSt('offline'); setSyncErr(e?.message||'Erro de conexão');
    }
  }, []);

  // ── Dados filtrados ──────────────────────────────────────────────────────
  const movsFilt = useMemo(() => byPeriod(movimentacoes, period), [movimentacoes, period]);

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const totalSaidas = movsFilt.length;
  const saidasMes = useMemo(() => {
    const now=new Date();
    return movimentacoes.filter(m=>{
      if(!m.DATA) return false;
      const d = parseDate(m.DATA);
      return !isNaN(d)&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
    }).length;
  }, [movimentacoes]);

  const alertas = useMemo(() =>
    produtos.filter(p=>(parseInt(p['ESTOQUE ATUAL'])||0)<=(parseInt(p['ESTOQUE MÍNIMO'])||0))
  ,[produtos]);

  const alertasOrd = useMemo(() =>
    [...alertas].sort((a,b)=>
      stockPct(parseInt(a['ESTOQUE ATUAL'])||0,parseInt(a['ESTOQUE MÍNIMO'])||1)-
      stockPct(parseInt(b['ESTOQUE ATUAL'])||0,parseInt(b['ESTOQUE MÍNIMO'])||1)
    )
  ,[alertas]);

  const taxaPerda = useMemo(() => {
    if(!movsFilt.length) return 0;
    return Math.round((movsFilt.filter(m=>m.STATUS==='PERDIDO').length/movsFilt.length)*100);
  },[movsFilt]);

  const sTotals = useMemo(() =>
    Object.fromEntries(S_KEYS.map(k=>[k,movsFilt.filter(m=>m.STATUS===k).length]))
  ,[movsFilt]);
  const sTotalSum = S_KEYS.reduce((a,k)=>a+sTotals[k],0)||1;

  const recentes = useMemo(()=>[...movimentacoes].slice(-6).reverse(),[movimentacoes]);

  const rankPerdas = useMemo(()=>{
    const map={};
    movsFilt.filter(m=>m.STATUS==='PERDIDO').forEach(m=>{
      const n=m['TÉCNICO']||m.TECNICO||'N/D';
      map[n]=(map[n]||0)+1;
    });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5);
  },[movsFilt]);
  const maxPerd = rankPerdas[0]?.[1]||1;

  // ── Refs gráficos ────────────────────────────────────────────────────────
  const refSt=useRef(null); const instSt=useRef(null);
  const refT5=useRef(null); const instT5=useRef(null);
  const refTr=useRef(null); const instTr=useRef(null);

  useEffect(()=>{
    if(!refSt.current) return;
    instSt.current?.destroy();
    instSt.current = new Chart(refSt.current.getContext('2d'),{
      type:'doughnut',
      data:{ labels:S_KEYS, datasets:[{data:S_KEYS.map(k=>sTotals[k]),backgroundColor:S_COLORS,borderWidth:0,hoverOffset:5}] },
      options:{ responsive:true,maintainAspectRatio:false,cutout:'74%',
        plugins:{ legend:{display:false}, tooltip:{callbacks:{label:ctx=>` ${ctx.label}: ${ctx.raw}`}} } },
    });
    return ()=>{ instSt.current?.destroy(); instSt.current=null; };
  },[sTotals]);

  useEffect(()=>{
    if(!refT5.current) return;
    instT5.current?.destroy();
    const pm={};
    movsFilt.forEach(m=>{ const p=m.PRODUTO||'Sem Produto'; pm[p]=(pm[p]||0)+(parseInt(m.QUANTIDADE)||0); });
    const top=Object.entries(pm).sort((a,b)=>b[1]-a[1]).slice(0,5);
    instT5.current = new Chart(refT5.current.getContext('2d'),{
      type:'bar',
      data:{ labels:top.map(([n])=>n.length>22?n.slice(0,20)+'…':n), datasets:[{data:top.map(([,v])=>v),backgroundColor:PROD_CLR,borderRadius:6,borderSkipped:false}] },
      options:{ responsive:true,maintainAspectRatio:false,indexAxis:'y',
        plugins:{legend:{display:false}},
        scales:{ x:{beginAtZero:true,grid:{color:'rgba(0,0,0,.04)'},ticks:{color:C.muted,font:{size:11}}}, y:{grid:{display:false},ticks:{color:C.muted,font:{size:11}}} } },
    });
    return ()=>{ instT5.current?.destroy(); instT5.current=null; };
  },[movsFilt]);

  useEffect(()=>{
    if(!refTr.current) return;
    instTr.current?.destroy();
    const bd = byDay(movsFilt);
    instTr.current = new Chart(refTr.current.getContext('2d'),{
      type:'line',
      data:{ labels: bd.labels, datasets:[{label:'Saídas',data: bd.values,borderColor:C.blue,backgroundColor:'rgba(37,99,235,.08)',fill:true,tension:.35,pointRadius:3,pointBackgroundColor:C.blue,borderWidth:2}] },
      options:{ responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false}},
        scales:{ x:{grid:{display:false},ticks:{color:C.muted,font:{size:11}}}, y:{beginAtZero:true,grid:{color:'rgba(0,0,0,.04)'},ticks:{color:C.muted,font:{size:11},stepSize:1}} } },
    });
    return ()=>{ instTr.current?.destroy(); instTr.current=null; };
  },[movsFilt]);

  const pLbl={today:'hoje','7d':'últimos 7 dias','30d':'últimos 30 dias',all:'todo o período'};

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{background:C.bg,minHeight:'100vh'}}>

      {/* ── PageHeader ORIGINAL ─────────────────────────────────────────── */}
      <PageHeader title="Dashboard" subtitle="Visão geral do sistema" />

      

      {/* ── Conteúdo ────────────────────────────────────────────────────── */}
      <div style={{padding:'18px 20px',display:'flex',flexDirection:'column',gap:14,maxWidth:1280,margin:'0 auto'}}>

        {/* Filtro de período */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <p style={{fontSize:12,color:C.muted}}>
            Exibindo: <strong style={{color:C.text}}>{pLbl[period]}</strong>
          </p>
          <PeriodFilter value={period} onChange={setPeriod}/>
        </div>

        {/* ── 4 KPIs ─────────────────────────────────────────────────────── */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12}}>
          <KpiCard label="Total de Saídas"  value={totalSaidas}     accent={C.blue}   sub="no período selecionado"/>
          <KpiCard label="Saídas do Mês"    value={saidasMes}       accent={C.violet} sub={new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}/>
          <KpiCard label="Estoque Crítico"  value={alertas.length}  accent={C.red}
            sub={alertas.length>0?'⚠ Reposição necessária':'✓ Estoque OK'}
            subColor={alertas.length>0?C.amber:C.green}/>
          <KpiCard label="Taxa de Perda"    value={`${taxaPerda}%`} accent={C.amber}
            sub={`${sTotals['PERDIDO']||0} perdas no período`}
            subColor={taxaPerda>10?C.red:taxaPerda>5?C.amber:C.green}/>
        </div>

        {/* ── Donut + Tendência ───────────────────────────────────────────── */}
        <div style={{display:'grid',gridTemplateColumns:'300px 1fr',gap:12}}>

          <Card title="Saídas por Status" subtitle="4 status monitorados">
            {/* Legenda */}
            <div style={{display:'flex',flexDirection:'column',gap:7,marginBottom:14}}>
              {S_KEYS.map(k=>{
                const cfg=STATUS_CFG[k]; const n=sTotals[k];
                const p=Math.round((n/sTotalSum)*100);
                return (
                  <div key={k} style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{width:8,height:8,borderRadius:2,background:cfg.color,flexShrink:0}}/>
                    <span style={{fontSize:11,color:C.muted,flex:1}}>{k}</span>
                    <span style={{fontSize:11,fontWeight:700,color:C.text}}>{n}</span>
                    <span style={{fontSize:10,color:C.muted,minWidth:28,textAlign:'right'}}>{p}%</span>
                  </div>
                );
              })}
            </div>
            <div style={{position:'relative',height:180}}><canvas ref={refSt}/></div>
          </Card>

          <Card title="Tendência de Saídas" subtitle="Saídas por dia no período">
            <div style={{position:'relative',height:242}}><canvas ref={refTr}/></div>
          </Card>

        </div>

        {/* ── Top produtos + Rank de perdas ──────────────────────────────── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>

          <Card title="Top 5 Produtos Movimentados" subtitle="Por quantidade no período">
            <div style={{position:'relative',height:220}}><canvas ref={refT5}/></div>
          </Card>

          <Card title="Técnicos com Mais Perdas" subtitle="Ranking no período selecionado">
            {rankPerdas.length===0?(
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'24px 0',gap:4}}>
                <p style={{fontSize:20}}>🎉</p>
                <p style={{fontSize:12,color:C.green,fontWeight:600}}>Nenhuma perda registrada</p>
                <p style={{fontSize:11,color:C.muted}}>no período selecionado</p>
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {rankPerdas.map(([nome,qtd],i)=>{
                  const av=avStyle(nome); const bar=Math.round((qtd/maxPerd)*100);
                  return (
                    <div key={nome} style={{display:'flex',alignItems:'center',gap:10}}>
                      <span style={{fontSize:11,color:C.muted,minWidth:16,textAlign:'right'}}>#{i+1}</span>
                      <div style={{width:26,height:26,borderRadius:'50%',flexShrink:0,background:av.bg,color:av.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700}}>
                        {initials(nome)}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                          <span style={{fontSize:12,fontWeight:500,color:C.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'72%'}}>{nome}</span>
                          <span style={{fontSize:11,fontWeight:700,color:C.red}}>{qtd} {qtd===1?'perda':'perdas'}</span>
                        </div>
                        <div style={{height:4,background:C.borderLt,borderRadius:2}}>
                          <div style={{height:4,width:`${bar}%`,background:i===0?C.red:C.amber,borderRadius:2}}/>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

        </div>

        {/* ── Movimentações + Alertas ─────────────────────────────────────── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>

          <Card title="Últimas Movimentações" subtitle="Atividade recente dos técnicos">
            {recentes.length===0?(
              <p style={{fontSize:12,color:C.muted,padding:'12px 0',textAlign:'center'}}>Nenhuma movimentação registrada.</p>
            ):(
              <div>
                {recentes.map((m,i)=>{
                  const nome=m['TÉCNICO']||m.TECNICO||'Técnico';
                  const av=avStyle(nome);
                  return (
                    <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:i<recentes.length-1?`0.5px solid ${C.borderLt}`:'none'}}>
                      <div style={{width:28,height:28,borderRadius:'50%',flexShrink:0,background:av.bg,color:av.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700}}>
                        {initials(nome)}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:12,fontWeight:600,color:C.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{nome}</p>
                        <p style={{fontSize:11,color:C.muted,marginTop:1}}>
                          {m.PRODUTO} · Qtd: {m.QUANTIDADE}
                          {m.DATA?' · '+SheetsService.formatDate(m.DATA):''}
                        </p>
                      </div>
                      <StatusBadge status={m.STATUS}/>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="Alertas de Estoque" subtitle="Mais críticos primeiro">
            {alertasOrd.length===0?(
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'20px 0',gap:4}}>
                <p style={{fontSize:22}}>✓</p>
                <p style={{fontSize:12,color:C.green,fontWeight:600}}>Estoque em dia!</p>
                <p style={{fontSize:11,color:C.muted}}>Nenhum produto abaixo do mínimo.</p>
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:7}}>
                {alertasOrd.map((p,i)=>{
                  const atual=parseInt(p['ESTOQUE ATUAL'])||0;
                  const min  =parseInt(p['ESTOQUE MÍNIMO'])||0;
                  const pc   =stockPct(atual,min);
                  const crit =pc<=30;
                  return (
                    <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 11px',background:crit?C.redSoft:C.amberSoft,border:`0.5px solid ${crit?'#FECACA':'#FDE68A'}`,borderRadius:8}}>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:12,fontWeight:600,color:C.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.PRODUTO}</p>
                        <p style={{fontSize:11,color:C.muted,marginTop:1}}>
                          Atual: <strong style={{color:crit?C.red:C.amber}}>{atual}</strong> · Mínimo: {min}
                        </p>
                      </div>
                      <AlertBar atual={atual} minimo={min}/>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

        </div>
      </div>

      {loginOpen&&<LoginModal onClose={()=>setLoginOpen(false)}/>}

      <style>{`
        @keyframes dotPulse {
          0%,100%{opacity:1;transform:scale(1)}
          50%{opacity:.35;transform:scale(.75)}
        }
      `}</style>
    </div>
  );
}