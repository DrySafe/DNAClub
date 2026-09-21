import { useState } from 'react'
import { Copy, Check, Share2, MessageCircle } from 'lucide-react'

export default function ReferralSection({ referralCode, currentLevel }) {
  const [copied, setCopied] = useState(false)

  // Descontos baseados no regulamento por categoria
  const discountRules = {
    'DNA Profissional': { referrer: '3%', referred: '1%' },
    'DNA Referência': { referrer: '4%', referred: '1%' },
    'DNA Master': { referrer: '6%', referred: '2%' },
    'DNA MOR': { referrer: '8%', referred: '2%' },
  }

  const currentRule = discountRules[currentLevel] || discountRules['DNA Profissional']
  const referralLink = `${window.location.origin}/indicacao?ref=${referralCode}`

  function handleCopy() {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleWhatsAppShare() {
    const text = encodeURIComponent(
      `Olá! Estou te indicando para comprar na Depilamor. Use meu código de indicação ${referralCode} ou acesse o link e ganhe ${currentRule.referred} de desconto na sua compra: ${referralLink}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold">
            <Share2 className="w-3.5 h-3.5" />
            Programa Indique e Ganhe
          </div>
          <h3 className="text-xl font-bold">Compartilhe e Ganhe Benefícios</h3>
          <p className="text-slate-300 text-xs max-w-xl">
            Sua categoria <span className="font-bold text-rose-400">{currentLevel}</span> garante <span className="font-bold text-white">{currentRule.referrer}</span> de desconto para você e <span className="font-bold text-white">{currentRule.referred}</span> para a nova cliente indicada no primeiro pedido[cite: 1, 2].
          </p>
        </div>

        {/* Bloco do Código e Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3">
            <div>
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Seu Código</span>
              <span className="font-mono font-bold text-rose-400 tracking-wider text-base">{referralCode || 'CÓDIGO'}</span>
            </div>
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-slate-700 rounded-xl transition-colors text-slate-300 hover:text-white"
              title="Copiar Link"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>

          <button
            onClick={handleWhatsAppShare}
            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-500 hover:bg-emerald-600 font-bold text-slate-950 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 text-xs"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            Enviar via WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}