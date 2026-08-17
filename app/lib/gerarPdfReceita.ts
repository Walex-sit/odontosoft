import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Type extension since jspdf-autotable extends jsPDF instance
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

export interface MedicamentoReceita {
  nome: string;
  posologia: string;
  quantidade: string;
}

interface DadosReceita {
  pacienteNome: string;
  data: string;
  medicamentos: MedicamentoReceita[];
  dentistaNome?: string;
  clinicaNome?: string;
  logoUrl?: string;
}

export const gerarPdfReceita = async (dados: DadosReceita) => {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  const clinica = dados.clinicaNome || 'Odontosoft Clínica';
  const dataHeader = dados.data;
  
  // 1. Cabeçalho
  // Se houver logo, tenta adicionar (necessita que seja base64 ou de um endpoint permitido via cors).
  // Para fins práticos e de compatibilidade, faremos um header em texto, 
  // mas se for passado um base64, pode ser renderizado com doc.addImage.
  // Simularemos carregamento com o placeholder que a imagem for passada
  
  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(clinica, 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Data: ${dataHeader}`, 105, 28, { align: 'center' });
  
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(14, 35, 196, 35);
  
  // 2. Dados do Paciente
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(`Paciente: ${dados.pacienteNome}`, 14, 45);
  
  // 3. Tabela de Medicamentos
  const tableData = dados.medicamentos.map(med => [
    med.nome,
    med.quantidade,
    med.posologia
  ]);

  (doc as any).autoTable({
    startY: 55,
    head: [['Medicamento', 'Qtd', 'Posologia']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: 255,
      fontSize: 11,
    },
    styles: {
      fontSize: 10,
      cellPadding: 6,
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 30 },
      2: { cellWidth: 'auto' },
    }
  });

  // 4. Rodapé e Assinatura
  const finalY = doc.lastAutoTable.finalY + 40;
  
  doc.setDrawColor(15, 23, 42);
  doc.line(65, finalY, 145, finalY);
  
  doc.setFontSize(11);
  doc.text(dados.dentistaNome || 'Assinatura do Dentista / CRO', 105, finalY + 8, { align: 'center' });

  // 5. Download do Arquivo
  const fileName = `Receita_${dados.pacienteNome.replace(/\s+/g, '_')}_${dataHeader.replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
};
