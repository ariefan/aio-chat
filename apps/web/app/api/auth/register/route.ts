import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db, operators } from "@/db"
import { eq } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check if operator already exists
    const existingOperator = await db
      .select()
      .from(operators)
      .where(eq(operators.email, email))
      .limit(1)

    if (existingOperator.length > 0) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create operator
    const newOperator = await db.insert(operators).values({
      name,
      email,
      passwordHash: hashedPassword,
      role: 'operator',
      isActive: true,
    }).returning()

    // Remove password hash from response
    const { passwordHash: _, ...operatorWithoutPassword } = newOperator[0]

    return NextResponse.json({
      operator: operatorWithoutPassword,
      message: "Operator created successfully"
    }, { status: 201 })

  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}