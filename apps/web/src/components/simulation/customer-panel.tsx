"use client"

import { User, CreditCard, History, Activity, AlertTriangle, Smartphone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/src/components/card'
import { Badge } from '@workspace/ui/src/components/badge'

interface CustomerPanelProps {
  data: {
    id: string
    pesertaProfile: {
      nokapst_masked: string
      name: string
      status_kepesertaan: string
      kelas_rawat: string
      pekerjaan: string
      jumlah_tanggungan: number
    }
    billingInfo: {
      total_tunggakan: number
      bulan_menunggak: string[]
      durasi_bulan: number
      last_payment_date: string
    }
    claimHistory: {
      last_claim: {
        date: string | null
        type: string | null
        diagnosis: string | null
        hospital: string | null
        claim_amount: number
      }
    }
    interactionHistory: {
      last_contact: {
        agent_name: string
        date: string
        channel: string
        outcome: string
        alasan_tunggak: string
      }
    }
    paymentCommitmentHistory: {
      credibility_score: number
      last_promise: {
        promised_date: string | null
        status: string
        days_overdue: number
      }
    }
    strategy: {
      approach: string
      urgency: string
      tone: string
    }
  } | null
}

export function CustomerPanel({ data }: CustomerPanelProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (!data) {
    return (
      <div className="h-full overflow-y-auto p-4 bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-center">
          Pilih peserta BPJS untuk melihat detail
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-800">
            RICH <span className="text-green-600">Dashboard</span>
          </h1>
          <p className="text-xs text-slate-500">Case ID: {data.id.slice(0, 8)}...</p>
        </div>
        {data.billingInfo.total_tunggakan > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle size={12} />
            Overdue
          </Badge>
        )}
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <User size={14} />
            Profil Peserta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-1">
            <span className="text-slate-500">No. Kartu</span>
            <span className="font-medium">{data.pesertaProfile.nokapst_masked}</span>

            <span className="text-slate-500">Status</span>
            <span className="font-medium">
              {data.pesertaProfile.status_kepesertaan} (Kelas {data.pesertaProfile.kelas_rawat})
            </span>

            <span className="text-slate-500">Tanggungan</span>
            <span className="font-medium">{data.pesertaProfile.jumlah_tanggungan} Jiwa</span>

            <span className="text-slate-500">Pekerjaan</span>
            <span className="font-medium">{data.pesertaProfile.pekerjaan}</span>
          </div>
        </CardContent>
      </Card>

      {/* Billing Alert */}
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard size={14} />
            Billing Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-end mb-2">
            <span className="text-slate-600 text-sm">Total Tunggakan</span>
            <span className="text-xl font-bold text-red-600">
              {formatCurrency(data.billingInfo.total_tunggakan)}
            </span>
          </div>
          <div className="text-xs text-slate-500 flex justify-between border-t border-red-100 pt-2">
            <span>Periode: {data.billingInfo.bulan_menunggak.slice(0, 3).join(', ')}</span>
            <span>Last Pay: {data.billingInfo.last_payment_date}</span>
          </div>
        </CardContent>
      </Card>

      {/* Strategy Badge */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="text-xs font-bold text-blue-700 mb-1 flex items-center gap-1">
          <Activity size={12} />
          RECOMMENDED STRATEGY
        </div>
        <p className="text-sm text-blue-900 font-medium">{data.strategy.approach}</p>
        <p className="text-xs text-blue-600 mt-1">
          {data.strategy.tone} | {data.strategy.urgency}
        </p>
      </div>

      {/* Commitment History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <History size={14} />
            Riwayat Komitmen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-600">Credibility Score</span>
            <div className="w-24 bg-slate-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  data.paymentCommitmentHistory.credibility_score > 0.6
                    ? 'bg-green-500'
                    : data.paymentCommitmentHistory.credibility_score > 0.3
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${data.paymentCommitmentHistory.credibility_score * 100}%` }}
              />
            </div>
          </div>
          <div className="bg-slate-100 p-2 rounded text-xs">
            <div className="flex justify-between font-semibold text-slate-700">
              <span>Janji Terakhir</span>
              <span className={`uppercase ${
                data.paymentCommitmentHistory.last_promise.status === 'kept'
                  ? 'text-green-600'
                  : 'text-red-500'
              }`}>
                {data.paymentCommitmentHistory.last_promise.status}
              </span>
            </div>
            {data.paymentCommitmentHistory.last_promise.promised_date && (
              <div className="flex justify-between mt-1 text-slate-500">
                <span>{data.paymentCommitmentHistory.last_promise.promised_date}</span>
                {data.paymentCommitmentHistory.last_promise.days_overdue > 0 && (
                  <span>{data.paymentCommitmentHistory.last_promise.days_overdue} hari lewat</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Claim History (Leverage) */}
      {data.claimHistory.last_claim.hospital && (
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity size={14} />
              Data Klaim (Leverage)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-bold text-emerald-800">
                  {data.claimHistory.last_claim.hospital}
                </div>
                <div className="text-xs text-emerald-600">
                  {data.claimHistory.last_claim.diagnosis} | {data.claimHistory.last_claim.type}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-emerald-700">
                  {formatCurrency(data.claimHistory.last_claim.claim_amount)}
                </div>
                <div className="text-[10px] text-emerald-500">
                  {data.claimHistory.last_claim.date}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interaction History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Smartphone size={14} />
            Kontak Terakhir
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Agent</span>
            <span className="font-medium">{data.interactionHistory.last_contact.agent_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Tanggal</span>
            <span className="font-medium">{data.interactionHistory.last_contact.date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Hasil</span>
            <span className="font-medium text-orange-600">
              {data.interactionHistory.last_contact.outcome}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-slate-600 italic">
            &ldquo;{data.interactionHistory.last_contact.alasan_tunggak}&rdquo;
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
