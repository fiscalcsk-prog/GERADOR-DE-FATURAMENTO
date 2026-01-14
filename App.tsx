
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Printer, Upload, Sparkles, FileText, CheckCircle2, AlertCircle, Image as ImageIcon, X, MapPin, Calendar, Search as SearchIcon, ChevronDown, DollarSign, Download, FileDown, Lock } from 'lucide-react';
import { BillingData, BillingMonth } from './types';
import BillingDocument from './components/BillingDocument';
import { extractBillingData } from './services/geminiService';

const MONTHS_LIST = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
];

const INITIAL_STATE: BillingData = {
  companyName: '',
  cep: '',
  address: '',
  addressComplement: '',
  cnpj: '',
  city: '',
  state: '',
  date: '',
  locationDateText: '',
  declarationText: 'Declaramos para os devidos fins que, a empresa [EMPRESA], com sede à [ENDEREÇO], inscrita no CNPJ/MF nº [CNPJ], houve faturamento nos períodos, a saber:',
  logoUrl: null,
  footerLine1: 'CSK CONTABIL CONSULTORIA E ASSESSORIA LTDA | CNPJ 68.224.526/0001-99',
  footerLine2: 'Avenida Paulista, 1765, Andar 7 Conj 72 CV 10593 - Bela Vista - São Paulo/SP',
  footerLine3: 'CEP 01.311-930 - Fone/Fax: (11) 5599-3561',
  billingMonths: [
    { year: '', month: '', amount: null },
  ],
  partner: {
    name: '',
    role: '',
    identifier: '',
  },
  accountant: {
    name: 'CEZAR SUSUMU KAVASSAKI',
    role: 'CONTADOR',
    identifier: 'CRC: 1SP 186.035/O-9',
  },
};

interface Municipality {
  nome: string;
  uf: string;
}

const App: React.FC = () => {
  const [data, setData] = useState<BillingData>(INITIAL_STATE);
  const [isExtracting, setIsExtracting] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [munSearch, setMunSearch] = useState('');
  const [showMunDropdown, setShowMunDropdown] = useState(false);
  const [selectedMun, setSelectedMun] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const totalBilling = data.billingMonths.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const normalize = (str: string) => 
    str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";

  useEffect(() => {
    const fetchMunicipalities = async () => {
      try {
        const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome');
        if (response.ok) {
          const result = await response.json();
          const formatted = result.map((m: any) => ({
            nome: m.nome,
            uf: m.microrregiao?.mesorregiao?.UF?.sigla || 'SP'
          }));
          setMunicipalities(formatted);
        }
      } catch (e) {
        setMunicipalities([{ nome: 'Itanhaém', uf: 'SP' }]);
      }
    };
    fetchMunicipalities();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowMunDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T12:00:00');
    const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
  };

  useEffect(() => {
    if (selectedMun) {
      handleInputChange('locationDateText', `${selectedMun}, ${formatDate(selectedDate)}.`);
    } else {
      handleInputChange('locationDateText', `${formatDate(selectedDate)}.`);
    }
  }, [selectedMun, selectedDate]);

  const handleInputChange = (field: keyof BillingData, value: any) => {
    const upperFields: (keyof BillingData)[] = ['companyName', 'city', 'state', 'address', 'addressComplement'];
    const finalValue = upperFields.includes(field) && typeof value === 'string' ? value.toUpperCase() : value;
    setData((prev) => ({ ...prev, [field]: finalValue }));
  };

  const handleSignatoryChange = (signatory: 'partner' | 'accountant', field: string, value: string) => {
    let finalValue = value.toUpperCase();
    if (signatory === 'partner' && field === 'identifier') {
      const digits = value.replace(/\D/g, '');
      finalValue = digits.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').substring(0, 14);
    }
    setData((prev) => ({
      ...prev,
      [signatory]: { ...prev[signatory], [field]: finalValue },
    }));
  };

  const handleMonthChange = (index: number, field: keyof BillingMonth, value: any) => {
    setData((prev) => {
      const newMonths = [...prev.billingMonths];
      newMonths[index] = { ...newMonths[index], [field]: field === 'month' ? value.toUpperCase() : value } as BillingMonth;
      return { ...prev, billingMonths: newMonths };
    });
  };

  const handleAddNewMonth = () => {
    setData(prev => {
      const last = prev.billingMonths[prev.billingMonths.length - 1];
      let nextMonthName = '';
      if (last && last.month) {
        const currentMonthIdx = MONTHS_LIST.indexOf(last.month.toUpperCase());
        if (currentMonthIdx !== -1) nextMonthName = MONTHS_LIST[(currentMonthIdx + 1) % 12];
      }
      return {
        ...prev,
        billingMonths: [...prev.billingMonths, { year: last?.year || '', month: nextMonthName, amount: null }]
      };
    });
  };

  const formatAsCurrency = (value: number | null) => {
    if (value === null) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleCurrencyInput = (index: number, rawValue: string) => {
    const digits = rawValue.replace(/\D/g, '');
    if (digits === '') {
      handleMonthChange(index, 'amount', null);
      return;
    }
    handleMonthChange(index, 'amount', Number(digits) / 100);
  };

  const handleTableKeyDown = (e: React.KeyboardEvent, index: number, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextInput = document.querySelector(`[data-row="${index + 1}"][data-field="${field}"]`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const handleExportPDF = () => {
    const element = document.getElementById('billing-doc');
    if (!element) {
        alert("Erro: Documento não encontrado para exportação.");
        return;
    }

    const opt = {
      margin: 0,
      filename: `Declaracao_${data.companyName.replace(/\s+/g, '_') || 'Faturamento'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        letterRendering: true
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // @ts-ignore
    html2pdf().set(opt).from(element).save().catch(err => {
        console.error("Erro ao gerar PDF:", err);
        window.print();
    });
  };

  const handleDownloadWord = () => {
    const el = document.getElementById('billing-doc');
    if (!el) return;
    const content = el.innerHTML;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Export Word</title>
    <style>
      body { font-family: 'Arial', sans-serif; }
      table { border-collapse: collapse; width: 100%; border: 1px solid #000; }
      th, td { border: 1px solid #000; padding: 5px; text-align: center; }
    </style>
    </head><body>`;
    const footer = "</body></html>";
    const sourceHTML = header + content + footer;
    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Declaracao_${data.companyName || 'Faturamento'}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredMunicipalities = municipalities.filter(m => {
    const searchNorm = normalize(munSearch);
    if (!searchNorm) return false;
    const nameNorm = normalize(m.nome);
    const ufNorm = normalize(m.uf);
    return nameNorm.includes(searchNorm) || ufNorm === searchNorm;
  }).slice(0, 15);

  const declarationParts = data.declarationText.split(/(\[EMPRESA\]|\[ENDEREÇO\]|\[CNPJ\])/);

  const updateDeclarationPart = (index: number, newValue: string) => {
    const newParts = [...declarationParts];
    newParts[index] = newValue;
    const newFullText = newParts.join('');
    setData((prev) => ({ ...prev, declarationText: newFullText }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f1f5f9]">
      <header className="bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-50 no-print shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#1e3a5f] p-2 rounded-xl text-white shadow-md"><FileText size={24} /></div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Declaração de Faturamento</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-left">Sistema de Geração</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
              <button onClick={() => setActiveTab('edit')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'edit' ? 'bg-white text-[#1e3a5f] shadow-sm' : 'text-gray-500'}`}>EDITAR</button>
              <button onClick={() => setActiveTab('preview')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'preview' ? 'bg-white text-[#1e3a5f] shadow-sm' : 'text-gray-500'}`}>PREVISUALIZAR</button>
            </div>
            <div className="h-6 w-px bg-gray-200 mx-2" />
            <button onClick={handleDownloadWord} className="flex items-center gap-2 bg-[#2563eb] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#1d4ed8] shadow-lg transition-all active:scale-95">
              <Download size={18} /> Word
            </button>
            <button onClick={handleExportPDF} className="flex items-center gap-2 bg-[#059669] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#047857] shadow-lg transition-all active:scale-95">
              <FileDown size={18} /> Baixar PDF
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto no-print">
        <div className="max-w-7xl mx-auto p-6 flex flex-col lg:flex-row gap-8">
          {activeTab === 'edit' && (
            <div className="flex-1 space-y-8 pb-20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2c5282] rounded-3xl p-6 text-white shadow-xl group">
                  <h2 className="text-lg font-bold flex items-center gap-2 mb-2"><Sparkles className="text-yellow-400" size={20} /> IA Assistente</h2>
                  <p className="text-blue-100 text-xs mb-4 opacity-90">Extraia dados automaticamente de um documento anterior.</p>
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-white text-[#1e3a5f] px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-50 transition-all">
                    {isExtracting ? "Processando..." : "Enviar Modelo Antigo"}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setIsExtracting(true);
                      const reader = new FileReader();
                      reader.onload = async (ev) => {
                        const extracted = await extractBillingData(ev.target?.result as string);
                        if (extracted) setData(prev => ({...prev, ...extracted}));
                        setIsExtracting(false);
                      };
                      reader.readAsDataURL(file);
                    }
                  }} />
                </div>
                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 flex items-center gap-6">
                  <div className="w-24 h-24 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center overflow-hidden bg-gray-50 relative">
                    {data.logoUrl ? <img src={data.logoUrl} className="max-w-full max-h-full p-2" /> : <ImageIcon className="text-gray-300" size={28} />}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-gray-400 uppercase mb-2">Logotipo</h3>
                    <button onClick={() => logoInputRef.current?.click()} className="text-[#1e3a5f] text-xs font-bold hover:underline">Alterar Imagem</button>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => handleInputChange('logoUrl', ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </div>
                </div>
              </div>

              {/* Texto da Declaração Protegido com Formato de Parágrafo Contínuo - AJUSTADO SEM ESPAÇOS */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Texto da Declaração</h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-bold border border-blue-100 uppercase">
                    <Lock size={10} /> Tags Bloqueadas
                  </div>
                </div>
                <div className="p-6">
                  <div className="bg-gray-50 border border-gray-300 rounded-2xl p-6 min-h-[120px] text-sm text-gray-700 leading-relaxed text-left cursor-text">
                    {declarationParts.map((part, idx) => {
                      const isTag = part === '[EMPRESA]' || part === '[ENDEREÇO]' || part === '[CNPJ]';
                      if (isTag) {
                        return (
                          <span 
                            key={idx} 
                            className="font-black text-blue-700 underline decoration-blue-400 decoration-1 underline-offset-4 select-none cursor-default px-0 whitespace-nowrap"
                            contentEditable={false}
                            title="Campo automático (Bloqueado)"
                          >
                            {part}
                          </span>
                        );
                      }
                      return (
                        <span
                          key={idx}
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => updateDeclarationPart(idx, e.currentTarget.innerText)}
                          className="outline-none whitespace-pre-wrap px-0"
                        >
                          {part}
                        </span>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-[10px] text-gray-400 font-medium italic">
                    * Clique nos textos acima para editar. As tags azuis são preenchidas automaticamente e não podem ser apagadas.
                  </p>
                </div>
              </div>

              {/* Dados Cadastrais */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 space-y-6">
                <h3 className="text-xs font-black text-gray-400 uppercase flex items-center gap-2"><MapPin size={14} /> Dados da Empresa</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Razão social</label>
                    <input type="text" value={data.companyName} onChange={(e) => handleInputChange('companyName', e.target.value)} placeholder="RAZÃO SOCIAL" className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 font-bold uppercase outline-none focus:bg-white transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">CNPJ</label>
                    <input type="text" value={data.cnpj} onChange={(e) => handleInputChange('cnpj', e.target.value)} placeholder="00.000.000/0000-00" className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 outline-none focus:bg-white transition-all" />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Endereço Completo</label>
                    <input type="text" value={data.address} onChange={(e) => handleInputChange('address', e.target.value)} placeholder="RUA, NÚMERO, BAIRRO" className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 uppercase outline-none focus:bg-white transition-all" />
                  </div>
                </div>
              </div>

              {/* Tabela de Faturamento - COM LÓGICA DE TECLADO */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-xs font-black text-gray-400 uppercase">Meses de Faturamento</h3>
                  <button onClick={handleAddNewMonth} className="bg-[#1e3a5f] text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#2c5282] transition-colors">+ Adicionar</button>
                </div>
                <div className="p-6 flex flex-col space-y-2">
                  {data.billingMonths.map((item, idx) => (
                    <div key={idx} className="flex gap-4 items-center bg-gray-50 p-2 rounded-xl border border-gray-200">
                      <input 
                        type="text" 
                        data-row={idx} 
                        data-field="year" 
                        value={item.year} 
                        onChange={(e) => handleMonthChange(idx, 'year', e.target.value)} 
                        onKeyDown={(e) => handleTableKeyDown(e, idx, 'year')}
                        placeholder="ANO" 
                        className="w-20 bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center outline-none focus:ring-1 focus:ring-blue-200" 
                      />
                      <input 
                        type="text" 
                        data-row={idx} 
                        data-field="month" 
                        value={item.month} 
                        onChange={(e) => handleMonthChange(idx, 'month', e.target.value)} 
                        onKeyDown={(e) => handleTableKeyDown(e, idx, 'month')}
                        placeholder="MÊS" 
                        className="flex-1 bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-bold uppercase outline-none focus:ring-1 focus:ring-blue-200" 
                      />
                      <input 
                        type="text" 
                        data-row={idx} 
                        data-field="amount" 
                        value={formatAsCurrency(item.amount)} 
                        onChange={(e) => handleCurrencyInput(idx, e.target.value)} 
                        onKeyDown={(e) => handleTableKeyDown(e, idx, 'amount')}
                        placeholder="R$ 0,00" 
                        className="w-32 bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-bold text-right outline-none focus:ring-1 focus:ring-blue-200" 
                      />
                      <button 
                        onClick={() => setData(prev => ({...prev, billingMonths: prev.billingMonths.filter((_, i) => i !== idx)}))} 
                        tabIndex={-1} 
                        className="text-gray-300 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Localidade */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase flex items-center gap-2"><MapPin size={14} /> Localidade e Data</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative" ref={dropdownRef}>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Buscar Município</label>
                    <input type="text" value={munSearch} onFocus={() => setShowMunDropdown(true)} onChange={(e) => setMunSearch(e.target.value)} placeholder="DIGITE O MUNICÍPIO..." className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:bg-white" />
                    {showMunDropdown && munSearch && (
                      <div className="absolute z-50 top-full left-0 right-0 bg-white border rounded-xl shadow-xl max-h-48 overflow-y-auto mt-1">
                        {filteredMunicipalities.map((m, i) => (
                          <button key={i} onClick={() => { setSelectedMun(`${m.nome}-${m.uf}`); setMunSearch(`${m.nome}-${m.uf}`); setShowMunDropdown(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 border-b last:border-0">{m.nome}-{m.uf}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Data</label>
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:bg-white" />
                  </div>
                </div>
              </div>

              {/* Assinaturas */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 space-y-6">
                <h3 className="text-xs font-black text-gray-400 uppercase flex items-center gap-2"><CheckCircle2 size={14} /> Assinaturas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-[#1e3a5f] uppercase tracking-widest border-b pb-1">Responsável Empresa</h4>
                    <input type="text" value={data.partner.name} onChange={(e) => handleSignatoryChange('partner', 'name', e.target.value)} placeholder="NOME" className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2 text-xs font-bold uppercase outline-none focus:bg-white" />
                    <input type="text" value={data.partner.role} onChange={(e) => handleSignatoryChange('partner', 'role', e.target.value)} placeholder="CARGO" className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2 text-xs uppercase outline-none focus:bg-white" />
                    <input type="text" value={data.partner.identifier} onChange={(e) => handleSignatoryChange('partner', 'identifier', e.target.value)} placeholder="CPF" className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2 text-xs outline-none focus:bg-white" />
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-[#1e3a5f] uppercase tracking-widest border-b pb-1">Contador Responsável</h4>
                    <input type="text" value={data.accountant.name} onChange={(e) => handleSignatoryChange('accountant', 'name', e.target.value)} placeholder="NOME DO CONTADOR" className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2 text-xs font-bold uppercase outline-none focus:bg-white" />
                    <input type="text" value={data.accountant.role} onChange={(e) => handleSignatoryChange('accountant', 'role', e.target.value)} placeholder="CARGO" className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2 text-xs uppercase outline-none focus:bg-white" />
                    <input type="text" value={data.accountant.identifier} onChange={(e) => handleSignatoryChange('accountant', 'identifier', e.target.value)} placeholder="CRC" className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2 text-xs outline-none focus:bg-white" />
                  </div>
                </div>
              </div>

              {/* Rodapé */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100"><h3 className="text-xs font-black text-gray-400 uppercase flex items-center gap-2"><MapPin size={14} /> Rodapé</h3></div>
                <div className="p-6 space-y-4">
                  <input type="text" value={data.footerLine1} onChange={(e) => handleInputChange('footerLine1', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2 text-xs outline-none focus:bg-white" />
                  <input type="text" value={data.footerLine2} onChange={(e) => handleInputChange('footerLine2', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2 text-xs outline-none focus:bg-white" />
                  <input type="text" value={data.footerLine3} onChange={(e) => handleInputChange('footerLine3', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2 text-xs outline-none focus:bg-white" />
                </div>
              </div>
            </div>
          )}
          {activeTab === 'preview' && (
            <div className="flex-1 flex justify-center py-4 bg-gray-300 rounded-[2rem] shadow-inner overflow-auto">
               <div className="transform origin-top scale-90 lg:scale-100"><BillingDocument data={data} /></div>
            </div>
          )}
        </div>
      </main>
      <div className="hidden print:block bg-white"><BillingDocument data={data} /></div>
    </div>
  );
};

export default App;
