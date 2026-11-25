import Link from 'next/link'
import { Activity, ShieldCheck, Scale, AlertTriangle, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Termos de Uso B2B | OdontoSoft',
  description: 'Termos e Condições Gerais de Uso da Plataforma OdontoSoft SaaS.',
}

export default function TermosDeUsoPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans selection:bg-[var(--primary-fill)] selection:text-[var(--on-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-base)]  sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/planos" className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar aos Planos
          </Link>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--primary)]" />
            <span className="font-extrabold text-[var(--text-primary)] text-base">OdontoSoft SaaS</span>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary-subtle)] border border-[var(--primary)]/30 text-[var(--primary)] text-xs font-semibold uppercase tracking-wider mb-3">
            <Scale className="w-4 h-4" />
            Instrumento Jurídico B2B
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Termos de Uso e Condições Gerais de Contratação
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Última atualização: 12 de Outubro de 2026 • Em vigor para todos os contratantes.
          </p>
        </div>

        {/* Alerta de Destaque Regulatório */}
        <div className="p-5 mb-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs sm:text-sm leading-relaxed flex items-start gap-3.5 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-amber-300 font-bold mb-1">
              Aviso aos Cirurgiões-Dentistas e Clínicas Odontológicas:
            </strong>
            O OdontoSoft é uma plataforma tecnológica de gestão administrativa e documental (SaaS).
            O software <strong>NÃO</strong> realiza diagnósticos, NÃO substitui o julgamento clínico humano
            e atua perante a LGPD estritamente como <strong>OPERADOR</strong> tecnológico, cabendo à Clínica a condição
            jurídica exclusiva de <strong>CONTROLADORA</strong> dos dados de saúde dos pacientes.
          </div>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed text-[var(--text-secondary)]">
          {/* Seção 1 */}
          <section className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="text-[var(--primary)] font-mono text-base">01.</span>
              Definições e Partes Contratantes
            </h2>
            <p>
              Estes Termos regulam a prestação de serviços de software como serviço (SaaS) fornecidos pela{' '}
              <strong className="text-white">ODONTOSOFT TECNOLOGIA LTDA.</strong> (&quot;OdontoSoft&quot; ou &quot;Provedor&quot;)
              à pessoa jurídica ou ao profissional liberal autônomo devidamente inscrito no Conselho Regional de Odontologia (CRO)
              que contratar a plataforma (&quot;CONTRATANTE&quot; ou &quot;Clínica&quot;).
            </p>
          </section>

          {/* Seção 2 */}
          <section className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="text-[var(--primary)] font-mono text-base">02.</span>
              Papéis na Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)
            </h2>
            <p className="mb-3">
              Para os fins do artigo 5º, incisos VI e VII da Lei nº 13.709/2018, as partes ajustam irrevogavelmente que:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[var(--text-secondary)]">
              <li>
                <strong className="text-white">A CLÍNICA CONTRATANTE é a CONTROLADORA exclusiva</strong> de todos os dados pessoais e dados pessoais sensíveis (prontuários odontológicos, radiografias, anamneses, tratamentos e dados de contato) de seus pacientes, sendo a única competente para definir as bases legais de tratamento e responder perante a ANPD e titulares.
              </li>
              <li>
                <strong className="text-white">O ODONTOSOFT é mero OPERADOR de tecnologia</strong>, limitando-se ao processamento automatizado, armazenamento cifrado e disponibilização das ferramentas contratadas segundo as instruções e configurações da Controladora (art. 39 da LGPD).
              </li>
              <li>
                O OdontoSoft não comercializa, não monetiza e não transfere dados de pacientes a terceiros sem prévia determinação expressa da Controladora ou ordem judicial válida.
              </li>
            </ul>
          </section>

          {/* Seção 3 */}
          <section className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 border-l-4 border-l-rose-500">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-base">03.</span>
              Cláusula Estrita de Isenção de Responsabilidade Civil Odontológica e Médica
            </h2>
            <p className="mb-3">
              O CONTRATANTE reconhece expressamente que o OdontoSoft constitui ferramenta meio de suporte administrativo e registro eletrônico. Em nenhuma hipótese o OdontoSoft, seus sócios, desenvolvedores ou prepostos responderão por:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[var(--text-secondary)]">
              <li>
                <strong className="text-white">Decisões Clínicas e Terapêuticas:</strong> Diagnósticos, planejamentos ortodônticos, intervenções cirúrgicas, dosagens de medicamentos, prescrições de substâncias controladas ou aplicação de anestésicos realizados pelo cirurgião-dentista;
              </li>
              <li>
                <strong className="text-white">Imperícia, Imprudência ou Negligência Odontológica:</strong> Qualquer dano moral, material, estético ou à integridade física sofrido pelo paciente nas dependências da Clínica ou em decorrência de atos odontológicos;
              </li>
              <li>
                <strong className="text-white">Inexatidão ou Falsidade de Dados:</strong> Inserção de dados falsos, incompletos ou adulterados por colaboradores da Clínica no sistema.
              </li>
            </ul>
          </section>

          {/* Seção 4 */}
          <section className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="text-[var(--primary)] font-mono text-base">04.</span>
              Prontuário Odontológico Eletrônico e Imutabilidade (CFO nº 198/2019)
            </h2>
            <p className="mb-3">
              A plataforma foi projetada segundo os preceitos da Resolução CFO nº 198/2019 e do Código de Ética Odontológica. Por imposição normativa:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[var(--text-secondary)]">
              <li>
                <strong className="text-white">Registros finalizados são IMUTÁVEIS:</strong> O sistema bloqueia a edição direta e a exclusão física de evoluções clínicas concluídas;
              </li>
              <li>
                <strong className="text-white">Retificações via Adendos:</strong> Qualquer correção ou esclarecimento deve ser promovido exclusivamente através de Aditivo Retificativo vinculado ao registro original, preservando a linha temporal;
              </li>
              <li>
                <strong className="text-white">Guarda Obrigatória de 20 Anos:</strong> A Clínica é responsável pela guarda dos prontuários pelo prazo legal mínimo de 20 (vinte) anos após o término do tratamento, mantendo suas credenciais e cópias ativas.
              </li>
            </ul>
          </section>

          {/* Seção 5 */}
          <section className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="text-[var(--primary)] font-mono text-base">05.</span>
              Faturamento, Inadimplência e Suspensão de Escrita
            </h2>
            <p className="mb-3">
              Os planos são faturados de forma recorrente via cartão de crédito através do gateway parceiro (Stripe):
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[var(--text-secondary)]">
              <li>
                <strong className="text-white">Bloqueio Operacional por Inadimplência:</strong> Em caso de não compensação de fatura (status &quot;inadimplente&quot;), o sistema aplicará bloqueio automatizado de inserção de novos registros (pacientes, agendamentos e prontuários), resguardando-se contudo o acesso de visualização aos dados pregressos para continuidade de tratamentos em curso.
              </li>
              <li>
                <strong className="text-white">Cancelamento:</strong> O cancelamento da assinatura não desonera o CONTRATANTE de débitos vencidos decorrentes do período em que o serviço esteve ativo.
              </li>
            </ul>
          </section>

          {/* Seção 6 */}
          <section className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="text-[var(--primary)] font-mono text-base">06.</span>
              Foro e Legislação Aplicável
            </h2>
            <p>
              Estes Termos são regidos pelas Leis da República Federativa do Brasil. Para dirimir quaisquer litígios oriundos deste contrato, fica eleito o Foro da Comarca da sede do OdontoSoft, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
            </p>
          </section>
        </div>

        {/* Rodapé Interno */}
        <div className="mt-12 pt-8 border-t border-[var(--border)] text-center">
          <Link
            href="/planos"
            className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)] hover:text-[var(--primary)]"
          >
            Conhecer os Planos e Iniciar Contratação
            <ShieldCheck className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  )
}
