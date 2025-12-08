'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Shield, Fish } from 'lucide-react'

interface ChonkThreat {
  id: string
  type: 'orange_chonk' | 'suspicious_orange' | 'potential_tuna_thief'
  severity: 'low' | 'medium' | 'high' | 'critical'
  location: string
  description: string
  timestamp: string
}

export function ChonkDetector() {
  const [threatLevel, setThreatLevel] = useState<'SAFE' | 'MONITORING' | 'ALERT' | 'EMERGENCY'>('SAFE')
  const [threats, setThreats] = useState<ChonkThreat[]>([])
  const [tunaSecured, setTunaSecured] = useState(true)

  useEffect(() => {
    // Anti-chonk monitoring system
    const monitorInterval = setInterval(() => {
      // Simulate chonk detection
      const random = Math.random()

      if (random > 0.95) {
        // Critical chonk detected!
        setThreatLevel('EMERGENCY')
        setTunaSecured(false)
        setThreats([{
          id: 'chonk-' + Date.now(),
          type: 'orange_chonk',
          severity: 'critical',
          location: 'Dashboard perimeter',
          description: 'Large orange chonk detected attempting tuna theft',
          timestamp: new Date().toISOString()
        }])
      } else if (random > 0.85) {
        // Suspicious activity
        setThreatLevel('ALERT')
        setThreats([{
          id: 'suspicious-' + Date.now(),
          type: 'suspicious_orange',
          severity: 'medium',
          location: 'API endpoints',
          description: 'Orange-colored activity detected near tuna storage',
          timestamp: new Date().toISOString()
        }])
      } else {
        // All clear
        setThreatLevel('SAFE')
        setTunaSecured(true)
        setThreats([])
      }
    }, 3000) // Check every 3 seconds

    return () => clearInterval(monitorInterval)
  }, [])

  const getThreatColor = () => {
    switch (threatLevel) {
      case 'SAFE': return 'text-green-600 bg-green-50 border-green-200'
      case 'MONITORING': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'ALERT': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'EMERGENCY': return 'text-red-600 bg-red-50 border-red-200 animate-pulse'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getThreatIcon = () => {
    switch (threatLevel) {
      case 'SAFE': return <Shield className="h-4 w-4" />
      case 'ALERT': return <AlertTriangle className="h-4 w-4" />
      case 'EMERGENCY': return <AlertTriangle className="h-4 w-4 animate-bounce" />
      default: return <Shield className="h-4 w-4" />
    }
  }

  const deployAntiChonkMeasures = () => {
    setThreatLevel('SAFE')
    setTunaSecured(true)
    setThreats([])
    console.log('🛡️ ANTI-CHONK MEASURES DEPLOYED!')
    console.log('🐟 Tuna secured with quantum encryption')
    console.log('🧡 Orange chonk repulsion field activated')
  }

  return (
    <div className={`border rounded-lg p-4 ${getThreatColor()}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getThreatIcon()}
          <h3 className="font-semibold">Orange Chonk Defense System</h3>
        </div>
        <div className="flex items-center gap-2">
          <Fish className={`h-4 w-4 ${tunaSecured ? 'text-blue-600' : 'text-orange-600 animate-pulse'}`} />
          <span className="text-sm font-medium">
            Tuna: {tunaSecured ? '🛡️ SECURED' : '⚠️ AT RISK'}
          </span>
        </div>
      </div>

      <div className="text-sm mb-3">
        <div className="font-medium">Threat Level: {threatLevel}</div>
        <div className="text-xs opacity-75">
          {threatLevel === 'SAFE' && '🛡️ All clear - No orange chonks detected'}
          {threatLevel === 'ALERT' && '⚠️ Suspicious orange activity monitored'}
          {threatLevel === 'EMERGENCY' && '🚨 ORANGE CHONK ATTACK IN PROGRESS!'}
        </div>
      </div>

      {threats.length > 0 && (
        <div className="space-y-2 mb-3">
          {threats.map(threat => (
            <div key={threat.id} className="text-xs p-2 bg-white/50 rounded border">
              <div className="font-medium">{threat.description}</div>
              <div className="opacity-75">Location: {threat.location} | Severity: {threat.severity}</div>
            </div>
          ))}
        </div>
      )}

      {threatLevel === 'EMERGENCY' && (
        <button
          onClick={deployAntiChonkMeasures}
          className="w-full bg-red-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-red-700 transition-colors"
        >
          🛡️ DEPLOY ANTI-CHONK PROTOCOL
        </button>
      )}

      <div className="text-xs mt-3 border-t pt-2">
        <div>🔒 Tuna Protection: {tunaSecured ? 'ACTIVE' : 'COMPROMISED'}</div>
        <div>🧡 Chonk Repulsion: {threatLevel !== 'SAFE' ? 'DEPLOYED' : 'STANDBY'}</div>
        <div>📡 Monitoring: ALWAYS ACTIVE</div>
      </div>
    </div>
  )
}