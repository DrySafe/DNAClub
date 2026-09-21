import { Trophy, TrendingUp } from 'lucide-react'

export default function GoalProgress({ currentKg, currentBrl, currentLevel }) {
  // Lógica simplificada de progresso conforme o regulamento
  const goals = {
    'DNA Profissional': { nextLevel: 'DNA Referência', targetKg: 151, targetBrl: 8000 },
    'DNA Referência': { nextLevel: 'DNA Master', targetKg: 200, targetBrl: 15000 },
    'DNA Master': { nextLevel: 'DNA MOR', targetKg: 301, targetBrl: 25000 },
    'DNA MOR': { nextLevel: 'Nível Máximo Atingido!', targetKg: 300, targetBrl: 25000 }
  }

  const currentGoal = goals[currentLevel] || goals['DNA Profissional']
  const percentKg = Math.min(100, Math.round((currentKg / currentGoal.targetKg) * 100))
  const percentBrl = Math.min(100, Math.round((currentBrl / currentGoal.targetBrl) * 100))

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Progresso Semestral</h3>
            <p className="text-xs text-slate-500">Acompanhe as suas metas para subir de categoria</p>
          </div>
        </div>
        <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
          Próximo Nível: {currentGoal.nextLevel}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Barra de Volume (kg) */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span>Volume em Quilos: {currentKg} kg</span>
            <span>Meta: {currentGoal.targetKg} kg</span>
          </div>
          <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5">
            <div 
              className="bg-gradient-to-r from-rose-500 to-pink-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${percentKg}%` }}
            ></div>
          </div>
        </div>

        {/* Barra de Faturamento (R$) */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span>Faturamento: R$ {currentBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span>Meta: R$ {currentGoal.targetBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${percentBrl}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  )
}