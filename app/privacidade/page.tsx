import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Política de Privacidade | OdontoSoft',
  description: 'Política de Privacidade do ambiente de demonstração da plataforma OdontoSoft.',
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <main className="max-w-3xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        {/* Navegação de retorno */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Início
          </Link>
        </div>

        {/* Cabeçalho */}
        <header className="border-b border-gray-200 dark:border-slate-800 pb-8 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            Conformidade & Privacidade
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Política de Privacidade (Ambiente de Demonstração)
          </h1>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            <strong className="font-semibold text-gray-700 dark:text-gray-300">Última atualização:</strong> Outubro de 2026
          </p>
        </header>

        {/* Conteúdo */}
        <div className="space-y-6 text-gray-600 dark:text-gray-300 text-base leading-relaxed">
          <p>
            Esta Política de Privacidade explica como simulamos o tratamento de dados na plataforma OdontoSoft. Embora a arquitetura do sistema esteja em estrita conformidade com as diretrizes da LGPD (Lei Geral de Proteção de Dados) e do CFO, este é um ambiente de testes.
          </p>

          <section className="space-y-3 pt-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              1. Dados Recolhidos
            </h2>
            <p>
              Recolhemos apenas os dados estritamente necessários para testar os fluxos de autenticação e gestão:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-gray-400 dark:marker:text-gray-500">
              <li>
                <strong>Dados de Autenticação:</strong> Endereço de e-mail e palavra-passe (geridos de forma segura via Supabase).
              </li>
              <li>
                <strong>Dados Fictícios Inseridos:</strong> Informações clínicas, cadastrais e financeiras inseridas pelo próprio utilizador de teste na sua área de trabalho.
              </li>
            </ul>
          </section>

          <section className="space-y-3 pt-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              2. Arquitetura de Segurança e Conformidade (Simulação)
            </h2>
            <p>
              Para efeitos de demonstração técnica, a plataforma implementa medidas de segurança rigorosas aplicáveis a um cenário real:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-gray-400 dark:marker:text-gray-500">
              <li>
                <strong>Criptografia:</strong> O sistema não armazena documentos de identificação (como o CPF) em texto limpo. Utilizamos algoritmos de hash (SHA-256) e criptografia simétrica avançada (AES-256) diretamente na base de dados.
              </li>
              <li>
                <strong>Isolamento de Dados (Multi-tenant):</strong> A plataforma aplica Row Level Security (RLS), garantindo que os dados inseridos por um utilizador de teste nunca são partilhados ou acedidos por outro.
              </li>
            </ul>
          </section>

          <section className="space-y-2 pt-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              3. Partilha de Dados
            </h2>
            <p>
              Nenhum dado inserido neste ambiente de demonstração será partilhado, vendido ou transferido a terceiros.
            </p>
          </section>

          <section className="space-y-2 pt-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              4. Eliminação de Dados
            </h2>
            <p>
              Por se tratar de um ambiente de treino, todos os dados inseridos podem ser eliminados pelo utilizador a qualquer momento através das opções do painel, ou ser alvo de rotinas de limpeza automática pelos administradores do sistema sem aviso prévio.
            </p>
          </section>

          <section className="space-y-2 pt-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              5. Contacto
            </h2>
            <p>
              Se estiver a avaliar o sistema e tiver dúvidas sobre a arquitetura de segurança, por favor entre em contacto com o desenvolvedor responsável pela demonstração.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
