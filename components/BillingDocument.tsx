
import React from 'react';
import { BillingData } from '../types';

interface BillingDocumentProps {
  data: BillingData;
}

const BillingDocument: React.FC<BillingDocumentProps> = ({ data }) => {
  const total = data.billingMonths.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const formatCurrency = (val: number | null) => {
    if (val === null) return '0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val).replace('R$', '').trim();
  };

  const toTitleCase = (str: string) => {
    if (!str) return '';
    const exceptions = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na'];
    return str.toLowerCase().split(' ').map((word, index) => {
      if (index !== 0 && exceptions.includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
  };

  const fullAddressForDoc = `${toTitleCase(data.address)}${data.addressComplement ? ', ' + toTitleCase(data.addressComplement) : ''}, ${data.city} - ${data.state}`;

  const renderProcessedText = () => {
    const text = data.declarationText;
    const companyName = data.companyName || '[NOME DA EMPRESA]';
    const cnpj = data.cnpj || '[CNPJ]';

    const parts = text.split(/(\[EMPRESA\]|\[ENDEREÇO\]|\[CNPJ\])/);

    return parts.map((part, i) => {
      if (part === '[EMPRESA]') {
        return <strong key={i} className="font-bold">{companyName}</strong>;
      }
      if (part === '[ENDEREÇO]') {
        return <span key={i}>{fullAddressForDoc}</span>;
      }
      if (part === '[CNPJ]') {
        return <span key={i}>{cnpj}</span>;
      }
      return part;
    });
  };

  return (
    /* 
       AJUSTE MANUAL DO TOPO DO PAPEL (Margem Geral):
       No 'p-[9mm_20mm_10mm_20mm]' abaixo, o '9mm' é o espaço do topo. 
    */
    <div id="billing-doc" className="bg-white w-[210mm] min-h-[297mm] p-[9mm_20mm_10mm_20mm] mx-auto shadow-2xl print:shadow-none print:m-0 border border-gray-100 print:border-none flex flex-col text-gray-900 leading-tight overflow-hidden font-serif">
      
      <div className="flex flex-col items-center mb-8 min-h-[40px] justify-center no-print-background pt-4">
        {data.logoUrl && <img src={data.logoUrl} className="max-h-[65px] max-w-[280px] object-contain" />}
      </div>

      <h1 className="text-[#1e3a5f] text-[1.4rem] font-bold text-center border-b-[2px] border-[#1e3a5f]/10 pb-1 mb-10 uppercase tracking-[0.2em]">
        Declaração de Faturamento
      </h1>

      <div className="text-justify leading-[1.5] mb-12 whitespace-pre-wrap text-[0.95rem] font-normal text-gray-800" style={{ fontFamily: '"Aptos", "Segoe UI", "Tahoma", sans-serif' }}>
        {renderProcessedText()}
      </div>

      <div className="w-full mb-9 overflow-hidden border border-[#1e3a5f] rounded-sm shadow-sm" style={{ fontFamily: '"Bookman Old Style", "Georgia", serif' }}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#1e3a5f] text-white">
              <th className="py-1 px-4 text-center font-bold uppercase text-[11px] border-r border-white/20">PERÍODO</th>
              <th className="py-1 px-4 text-center font-bold uppercase text-[11px] border-r border-white/20">MÊS</th>
              <th className="py-1 px-4 text-center font-bold uppercase text-[11px]">FATURAMENTO (R$)</th>
            </tr>
          </thead>
          <tbody>
            {data.billingMonths.map((item, idx) => (
              <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#f0f4f8]'} border-b border-gray-200 last:border-0`}>
                <td className="py-1 px-4 text-center text-[11px] border-r border-gray-200">{item.year}</td>
                <td className="py-1 px-4 text-center text-[11px] border-r border-gray-200 uppercase">{item.month}</td>
                <td className="py-1 px-4 text-right text-[11px]">
                  <div className="flex justify-between w-full px-2">
                    {/* AJUSTE: O 'R$' agora é preto (text-gray-900) e herda a fonte da tabela */}
                    <span className="text-gray-900 font-bold">R$</span>
                    <span className="font-bold">{formatCurrency(item.amount)}</span>
                  </div>
                </td>
              </tr>
            ))}
            <tr className="bg-[#1e3a5f] text-white font-bold">
              <td colSpan={2} className="py-1 px-4 text-center text-[13px] uppercase tracking-[0.3em] border-r border-white/20">TOTAL</td>
              <td className="py-1 px-4 text-right">
                <div className="flex justify-between items-center w-full px-2">
                  <span className="text-white">R$</span>
                  <span className="text-[14px] font-bold">{formatCurrency(total)}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mb-12 text-[0.95rem] font-medium italic text-gray-800 tracking-tight" style={{ fontFamily: '"Bookman Old Style", "Georgia", serif' }}>
        {data.locationDateText}
      </div>

      <div className="mt-32 grid grid-cols-2 gap-12 text-center" style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="flex flex-col items-center">
          <div className="w-full border-t-[1px] border-gray-400 mb-1"></div>
          <div className="text-[10px] font-bold uppercase text-gray-900 mb-0.5">{data.partner.name || '[NOME DO SÓCIO]'}</div>
          <div className="text-[8px] font-bold uppercase text-gray-500 tracking-widest">{data.partner.role}</div>
          <div className="text-[7px] text-gray-400">{data.partner.identifier ? `CPF: ${data.partner.identifier}` : ''}</div>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-full border-t-[1px] border-gray-400 mb-1"></div>
          <div className="text-[10px] font-bold uppercase text-gray-900 mb-0.5">{data.accountant.name || '[NOME DO CONTADOR]'}</div>
          <div className="text-[8px] font-bold uppercase text-gray-500 tracking-widest">{data.accountant.role}</div>
          <div className="text-[7px] text-gray-400">{data.accountant.identifier}</div>
        </div>
      </div>

      <div className="mt-auto pt-4 pb-2 border-t-[0.5px] border-gray-200 text-center text-[7px] text-gray-500 font-sans tracking-[0.05em] leading-normal">
        <p className="font-bold uppercase mb-0.5 text-gray-600">{data.footerLine1}</p>
        <p className="uppercase opacity-95">{data.footerLine2}</p>
        <p className="uppercase opacity-80">{data.footerLine3}</p>
      </div>
    </div>
  );
};

export default BillingDocument;
