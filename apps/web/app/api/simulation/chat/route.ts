import { NextRequest, NextResponse } from 'next/server'
import { generateSimulationResponse, SimulationMemberData, SimulationMessage } from '@/lib/ai/simulation-ai'

// POST - Send message to AI for simulation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, memberData, conversationHistory } = body as {
      message: string
      memberData: SimulationMemberData
      conversationHistory: SimulationMessage[]
    }

    if (!message || !memberData) {
      return NextResponse.json(
        { error: 'Message and memberData are required' },
        { status: 400 }
      )
    }

    const result = await generateSimulationResponse(
      message,
      memberData,
      conversationHistory || []
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Simulation chat error:', error)
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    )
  }
}
