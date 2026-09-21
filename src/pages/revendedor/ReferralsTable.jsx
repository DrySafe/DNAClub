import React, { useState } from 'react'
import { Users, Clock, CheckCircle2, XCircle } from 'lucide-react'

export default function ReferralsTable({ referrals = [] }) {
  const [filter, setFilter] = useState('all')

  const filteredReferrals = referrals.filter((item) => {
    if (filter === 'all') return true
    return item.status === filter
  })

  const statusBadges = {
    pending: { label: 'Pendente', icon: Clock, style: 'bg-amber-50 text-amber-700 border-amber-200' },
    approved: { label: 'Aprovada', icon: CheckCircle2, style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    invalid: { label: 'Inválida', icon: XCircle, style: 'bg-rose-50 text-rose-700 border-rose-200' }
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Histórico de Indicações</h3>
            <p className="text-xs text-slate-500">Acompanhe a validação dos pedidos das suas indicadas</p>
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          {['all', 'pending', 'approved', 'invalid'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                filter === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab === 'all' ? 'Todas' : tab === 'pending' ? 'Pendentes' : tab === 'approved' ? 'Aprovadas' : 'Inválidas'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
              <th className="py-3 px-2">Cliente Indicada</th>
              <th className="py-3 px-2">Data do Registo</th>
              <th className="py-3 px-2">Nível no Momento</th>
              <th className="py-3 px-2 text-right">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredReferrals.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-8 text-center text-slate-400">
                  Nenhuma indicação encontrada para este filtro.
                </td>
              </tr>
            ) : (
              filteredReferrals.map((item) => {
                const BadgeIcon = statusBadges[item.status]?.icon || Clock
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-2 font-bold text-slate-800">{item.profiles?.full_name || 'Nova Cliente'}</td>
                    <td className="py-3.5 px-2 text-slate-500">{new Date(item.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className="py-3.5 px-2 text-slate-600 font-medium">{item.referrer_level_at_creation}</td>
                    <td className="py-3.5 px-2 text-right">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${statusBadges[item.status]?.style}`}>
                        <BadgeIcon className="w-3.5 h-3.5" />
                        {statusBadges[item.status]?.label}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}