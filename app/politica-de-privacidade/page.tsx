import Link from 'next/link'
import { Activity, Shield, Lock, FileCheck, ArrowLeft, Mail } from 'lucide-react'

export const metadata = {
  title: 'Política de Privacidade | OdontoSoft',
  description: 'Política de Privacidade e Proteção de Dados Pessoais do OdontoSoft SaaS.',
}

export default function PoliticaDePrivacidadePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/planos" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar aos Planos
          </Link>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            <span className="font-extrabold text-white text-base">OdontoSoft SaaS</span>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <Shield className="w-4 h-4" />
            Segurança & Conformidade LGPD
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Política de Privacidade e Proteção de Dados
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Vigência: 2026 • Em conformidade estrita com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
          </p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed text-slate-300">
          {/* Seção 1 */}
          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="text-blue-500 font-mono text-base">01.</span>
              Compromisso com a Privacidade
            </h2>
            <p>
              A presente Política descreve como a{' '}
              <strong className="text-white">ODONTOSOFT TECNOLOGIA LTDA.</strong> trata dados pessoais na qualidade de
              provedora de software para consultórios e clínicas odontológicas. Nós adotamos o princípio da{' '}
              <em className="text-white">Privacidade por Design (Privacy by Design)</em> em toda a nossa arquitetura de microsserviços e banco de dados.
            </p>
          </section>

          {/* Seção 2 */}
          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="text-blue-500 font-mono text-base">02.</span>
              Categorias de Dados e Bases Legais
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-white text-sm mb-1">A. Dados dos Usuários Contratantes (Dentistas e Equipe):</h3>
                <p>
                  Nome completo, e-mail, telefone, CRO, endereço comercial e dados de faturamento.
                  Tratados para a <strong className="text-white">Execução de Contrato</strong> (art. 7º, V da LGPD).
                </p>
              </div>
              <div>
                <h3 className="font-bold text-white text-sm mb-1">B. Dados de Saúde dos Pacientes (Dados Sensíveis):</h3>
                <p>
                  Prontuários odontológicos, histórico de intervenções, anamnese, exames de imagem e prescrições.
                  Processados pela plataforma estritamente sob as ordens da Clínica Contratante (Controladora) com base na{' '}
                  <strong className="text-white">Tutela da Saúde</strong> (art. 11, II, &quot;f&quot; da LGPD) e no cumprimento de dever legal perante o Conselho Federal de Odontologia.
                </p>
              </div>
            </div>
          </section>

          {/* Seção 3 */}
          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-8 border-l-4 border-l-emerald-500">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="text-emerald-500 font-mono text-base">03.</span>
              Medidas de Segurança Técnicas e Administrativas
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-300">
              <li>
                <strong className="text-white">Criptografia em Repouso de CPFs:</strong> Armazenamento segregado de CPF em texto puro com cifragem AES-256 e hash determinístico SHA-256;
              </li>
              <li>
                <strong className="text-white">Trilha de Auditoria no Schema Privado:</strong> Registro inviolável de acessos e modificações estruturadas (INSERT/UPDATE/DELETE) fora do alcance da API pública;
              </li>
              <li>
                <strong className="text-white">Isolamento Multi-Tenant Estrito:</strong> Políticas de Row Level Security (RLS) que impedem que uma clínica acesse registros de outra clínica sob qualquer circunstância;
              </li>
              <li>
                <strong className="text-white">Criptografia em Trânsito:</strong> Comunicação criptografada com certificado TLS 1.3 de ponta a ponta.
              </li>
            </ul>
          </section>

          {/* Seção 4 */}
          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="text-blue-500 font-mono text-base">04.</span>
              Direito ao Esquecimento e Retenção CFO (20 Anos)
            </h2>
            <p>
              Em caso de solicitação de anonimização ou exclusão fundamentada no artigo 18 da LGPD por parte de um titular,
              o OdontoSoft disponibiliza à Controladora a funcionalidade de <strong className="text-white">Anonimização Dissociada</strong>.
              Os dados de identificação pessoal direta são eliminados, contudo os registros clínicos e faturas permanecem
              preservados de forma pseudonimizada e irreversível para assegurar o cumprimento da obrigação legal de retenção por{' '}
              <strong className="text-white">20 anos</strong> imposta pela Resolução CFO nº 198/2019 e art. 16, I da LGPD.
            </p>
          </section>

          {/* Seção 5 */}
          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="text-blue-500 font-mono text-base">05.</span>
              Encarregado de Proteção de Dados (DPO)
            </h2>
            <p className="mb-3">
              Para exercer seus direitos como titular ou esclarecer dúvidas sobre nossas práticas de governança de dados:
            </p>
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3">
              <Mail className="w-5 h-5 text-blue-400" />
              <div>
                <div className="font-bold text-white text-xs">Canal Oficial do DPO OdontoSoft</div>
                <div className="text-blue-400 text-xs">dpo@odontosoft.com.br</div>
              </div>
            </div>
          </section>
        </div>

        {/* Rodapé Interno */}
        <div className="mt-12 pt-8 border-t border-slate-800 text-center">
          <Link
            href="/planos"
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-300"
          >
            Conhecer os Planos e Iniciar Contratação
            <FileCheck className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  )
}
