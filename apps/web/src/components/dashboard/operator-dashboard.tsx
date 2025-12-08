'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@workspace/ui'
import {
  TrendingUp,
  TrendingDown,
  Users,
  MessageCircle,
  Bot,
  Clock,
  AlertCircle,
  CheckCircle,
  Activity,
  BarChart3,
  PieChart,
  Zap,
  FileText,
  Calendar,
  Download,
  RefreshCw,
  Settings,
  Plus
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface DashboardMetric {
  title: string
  value: string | number
  change?: number
  changeType?: 'increase' | 'decrease'
  icon: React.ElementType
  color: string
}

interface ActivityItem {
  id: string
  type: 'message' | 'automation' | 'conversation' | 'alert'
  title: string
  description: string
  timestamp: string
  status: 'success' | 'warning' | 'error' | 'info'
}

interface OperatorDashboardProps {
  className?: string
}

export function OperatorDashboard({ className }: OperatorDashboardProps) {
  const [metrics, setMetrics] = useState<DashboardMetric[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState('24h')

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setRefreshing(true)

      // Fetch metrics
      const metricsResponse = await fetch(`/api/dashboard/metrics?timeRange=${timeRange}`)
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json()
        setMetrics(metricsData.metrics || [])
      }

      // Fetch recent activities
      const activitiesResponse = await fetch('/api/dashboard/activities?limit=10')
      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json()
        setActivities(activitiesData.activities || [])
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000)
    return () => clearInterval(interval)
  }, [timeRange])

  const handleRefresh = () => {
    fetchDashboardData()
  }

  // Default metrics if API fails
  const defaultMetrics: DashboardMetric[] = [
    {
      title: 'Active Conversations',
      value: 23,
      change: 12,
      changeType: 'increase',
      icon: MessageCircle,
      color: 'text-blue-600',
    },
    {
      title: 'Total Messages Today',
      value: 347,
      change: -5,
      changeType: 'decrease',
      icon: Users,
      color: 'text-green-600',
    },
    {
      title: 'AI Responses',
      value: 156,
      change: 23,
      changeType: 'increase',
      icon: Bot,
      color: 'text-purple-600',
    },
    {
      title: 'Automation Rules Run',
      value: 89,
      change: 8,
      changeType: 'increase',
      icon: Zap,
      color: 'text-yellow-600',
    },
    {
      title: 'Avg Response Time',
      value: '2.3s',
      change: -0.5,
      changeType: 'increase',
      icon: Clock,
      color: 'text-indigo-600',
    },
    {
      title: 'Success Rate',
      value: '98.2%',
      change: 1.2,
      changeType: 'increase',
      icon: TrendingUp,
      color: 'text-emerald-600',
    },
  ]

  const displayMetrics = metrics.length > 0 ? metrics : defaultMetrics

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <Activity className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operator Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time overview of your AI chat platform
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time range selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {displayMetrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-5 w-5 ${metric.color}`} />
                  {metric.change && (
                    <div className={`flex items-center text-sm ${
                      metric.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.changeType === 'increase' ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(metric.change)}%
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold mb-1">{metric.value}</div>
                <div className="text-xs text-muted-foreground">{metric.title}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <MessageCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="font-semibold">View Conversations</div>
            <div className="text-sm text-muted-foreground">Manage active chats</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <Bot className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="font-semibold">AI Configuration</div>
            <div className="text-sm text-muted-foreground">Manage AI responses</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <Zap className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <div className="font-semibold">Automation Rules</div>
            <div className="text-sm text-muted-foreground">Configure workflows</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <FileText className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="font-semibold">Knowledge Base</div>
            <div className="text-sm text-muted-foreground">Manage documents</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <Button variant="ghost" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className="mt-1">{getStatusIcon(activity.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{activity.title}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{activity.description}</p>
                    <Badge variant="outline" className={`text-xs mt-2 ${getStatusColor(activity.status)}`}>
                      {activity.type}
                    </Badge>
                  </div>
                </div>
              ))}

              {activities.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">API Server</span>
                </div>
                <Badge variant="secondary" className="text-green-800">Online</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Database</span>
                </div>
                <Badge variant="secondary" className="text-green-800">Connected</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">AI Service</span>
                </div>
                <Badge variant="secondary" className="text-green-800">Active</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">WebSocket</span>
                </div>
                <Badge variant="secondary" className="text-green-800">Connected</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">Storage</span>
                </div>
                <Badge variant="secondary" className="text-yellow-800">78% Used</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Message Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Message volume chart</p>
                <p className="text-xs">Integration with charting library needed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Platform Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center text-muted-foreground">
                <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Platform distribution pie chart</p>
                <p className="text-xs">Integration with charting library needed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}