"use client"

import { Metadata } from 'next'
import { Suspense } from 'react'
import { Card, CardContent } from '@workspace/ui/src/index'
import { ProtectedRoute } from '@/components/protected-route'
import { useAuthSync } from '@/hooks/use-auth-sync'
import { Button } from '@workspace/ui/src/components/button'
import { signOut } from 'next-auth/react'

export default function DashboardPage() {
  const { session } = useAuthSync()

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Welcome, {session?.user?.name}!</h1>
          <p className="text-muted-foreground">AIO-Chat Dashboard</p>
          <Button
            onClick={() => signOut({ callbackUrl: '/' })}
            variant="outline"
            className="mt-4"
          >
            Sign Out
          </Button>
        </div>

        <Suspense fallback={<DashboardSkeleton />}>
          {/* Placeholder for the actual dashboard content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">Conversations</h3>
                <p className="text-3xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Active conversations</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">Messages</h3>
                <p className="text-3xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Messages sent today</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">Status</h3>
                <p className="text-3xl font-bold text-green-600">Online</p>
                <p className="text-sm text-muted-foreground">System operational</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button className="h-16">View Conversations</Button>
                  <Button variant="outline" className="h-16">Knowledge Base</Button>
                  <Button variant="outline" className="h-16">Automation Rules</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </Suspense>
      </div>
    </ProtectedRoute>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 bg-gray-200 rounded w-64"></div>
        <div className="h-4 bg-gray-200 rounded w-96"></div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-24 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-64 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}