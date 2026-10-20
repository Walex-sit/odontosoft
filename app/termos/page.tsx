import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Termos de Utilização | OdontoSoft',
  description: 'Termos de Utilização do ambiente de demonstração da plataforma OdontoSoft.',
};

export default function TermosPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 text-xs font-semibold mb-4">
            <FileText className="w-3.5 h-3.5" />
            Ambiente Demonstrativo
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Termos de Utilização (Ambiente de Demonstração)
          </h1>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            <strong className="font-semibold text-gray-700 dark:text-gray-300">Última atualização:</strong> Outubro de 2026
          </p>
        </header>

        {/* Conteúdo */}
        <div className="space-y-6 text-gray-600 dark:text-gray-300 text-base leading-relaxed">
          <p>
            Bem-vindo ao OdontoSoft. Ao aceder e utilizar esta plataforma, o utilizador concorda com os presentes Termos de Utilização.
          </p>

          <section className="space-y-2 pt-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              1. Natureza da Aplicação
            </h2>
            <p>
              O OdontoSoft é, no seu estado atual, um projeto de engenharia de software desenvolvido para fins de demonstração, treino técnico e portefólio. Não se trata de um serviço comercial em operação ativa.
            </p>
          </section>

          <section className="space-y-2 pt-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              2. Inserção de Dados Fictícios
            </h2>
            <p>
              Sendo um ambiente de testes, é estritamente proibida a inserção de dados reais ou sensíveis de pacientes (como nomes verdadeiros, CPFs, RGs, moradas ou informações clínicas reais). O utilizador compromete-se a utilizar apenas dados fictícios (mock data) para explorar as funcionalidades da plataforma.
            </p>
          </section>

          <section className="space-y-2 pt-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              3. Ausência de Garantias e Disponibilidade
            </h2>
            <p>
              A aplicação é fornecida &quot;tal como está&quot;. Por se tratar de um ambiente de testes, não garantimos disponibilidade contínua (uptime), estabilidade ou persistência dos dados a longo prazo. A base de dados pode ser limpa, reiniciada ou alterada a qualquer momento sem aviso prévio.
            </p>
          </section>

          <section className="space-y-2 pt-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              4. Limitação de Responsabilidade
            </h2>
            <p>
              Os criadores e mantenedores do OdontoSoft não se responsabilizam por eventuais perdas de dados, falhas no sistema ou uso indevido da plataforma. A plataforma não deve ser utilizada para a gestão real de uma clínica dentária nestas condições.
            </p>
          </section>

          <section className="space-y-2 pt-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              5. Propriedade Intelectual
            </h2>
            <p>
              A arquitetura, o código, o design e as funcionalidades do OdontoSoft são propriedade do seu criador. A utilização da plataforma para avaliação não confere qualquer direito de cópia, reprodução ou comercialização do software por terceiros.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
