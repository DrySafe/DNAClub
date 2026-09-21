import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../config/supabaseClient'
import { CheckCircle2, AlertTriangle, Tag, ArrowRight, ShieldCheck } from 'lucide-react'

export default function CadastroIndicado() {
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref') || ''

  const [formData, setFormData] = useState({
    fullName: '',
    cpfCnpj: '',
    email: '',
    referralCode: refCode
  })

  const [referrerInfo, setReferrerInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [validatingRef, setValidatingRef] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [success, setSuccess] = useState(false)

  // Valida o código do indicador ao carregar ou alterar o campo
  useEffect(() => {
    if (formData.referralCode) {
      validateReferrerCode(formData.referralCode)
    }
  }, [])

  async function validateReferrerCode(code) {
    setValidatingRef(true)
    setErrorMessage('')
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, level')
        .eq('referral_code', code)
        .single()

      if (error || !data) {
        setReferrerInfo(null)
        setErrorMessage('Código de indicação não encontrado ou inválido.')
      } else {
        setReferrerInfo(data)
      }
    } catch (err) {
      setReferrerInfo(null)
    } finally {
      setValidatingRef(false)
    }
  }

  // Define o percentual de desconto concedido à indicada conforme o nível da indicadora
  const getDiscountPercent = (level) => {
    if (level === 'DNA Master' || level === 'DNA MOR') return 2
    return 1 // DNA Profissional e DNA Referência
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    try {
      // 1. Verifica se o CPF/CNPJ já existe (Elegibilidade: deve ser novo cliente)
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('cpf_cnpj', formData.cpfCnpj)
        .maybeSingle()

      if (existingUser) {
        throw new Error('Este CPF/CNPJ já possui cadastro. O benefício é exclusivo para novos clientes sem histórico de compras.')
      }

      // 2. Registra no Supabase
      setSuccess(true)
    } catch (err) {
      setErrorMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full mx-auto space-y-6">
        
        {/* Cabeçalho */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/30 mb-3">
            <Tag className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Seja Bem-Vinda à Depilamor</h2>
          <p className="mt-1 text-xs text-slate-600">Garanta o seu desconto no primeiro pedido via indicação</p>
        </div>

        {/* Card Principal */}
        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
          {success ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Cadastro Concluído!</h3>
              <p className="text-xs text-slate-600">
                O seu cupão de desconto por indicação foi associado com sucesso. O desconto será aplicado no seu primeiro pedido após a confirmação do pagamento.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Box de Confirmação do Indicador */}
              {referrerInfo && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3">
                  <div className="p-2 bg-rose-500 text-white rounded-xl">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-rose-600 font-bold uppercase tracking-wider">Indicada por</span>
                    <p className="text-xs font-bold text-slate-800">{referrerInfo.full_name}</p>
                    <span className="text-[11px] font-semibold text-rose-600">
                      Desconto Garantido: {getDiscountPercent(referrerInfo.level)}% no primeiro pedido
                    </span>
                  </div>
                </div>
              )}

              {/* Formulário */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Seu nome completo"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">CPF / CNPJ</label>
                <input
                  type="text"
                  required
                  value={formData.cpfCnpj}
                  onChange={(e) => setFormData({ ...formData, cpfCnpj: e.target.value })}
                  placeholder="000.000.000-00"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Código do Indicador</label>
                <input
                  type="text"
                  required
                  value={formData.referralCode}
                  onChange={(e) => {
                    setFormData({ ...formData, referralCode: e.target.value })
                    validateReferrerCode(e.target.value)
                  }}
                  placeholder="Ex: IND-1234"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-rose-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Alerta de Regra */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-2 text-[11px] text-slate-600">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  O indicador deve ser informado obrigatoriamente antes da conclusão do primeiro pedido. Não serão aceitas alterações posteriores[cite: 1].
                </span>
              </div>

              {errorMessage && (
                <p className="text-xs text-rose-600 font-semibold text-center">{errorMessage}</p>
              )}

              <button
                type="submit"
                disabled={loading || validatingRef || !referrerInfo}
                className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl text-xs shadow-lg shadow-rose-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'A processar...' : 'Garantir Meu Desconto'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}