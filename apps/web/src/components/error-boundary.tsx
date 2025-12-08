"use client"

import React from 'react'
import { Button } from '@workspace/ui/src/components/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@workspace/ui/src/components/card'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; reset: () => void }>
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo)
    this.setState({ error, errorInfo })

    // Log error to service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Add error logging service (Sentry, etc.)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error} reset={this.handleReset} />
    }

    return this.props.children
  }
}

const DefaultErrorFallback: React.FC<{ error?: Error; reset: () => void }> = ({ error, reset }) => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-destructive">
            Oops! Something went wrong
          </CardTitle>
          <CardDescription className="text-center">
            {process.env.NODE_ENV === 'development' && error ? (
              <div className="mt-4 text-left">
                <p className="font-semibold mb-2">Error details:</p>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                  {error.message}
                </pre>
              </div>
            ) : (
              "We're sorry, but something unexpected happened. Please try again."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'production' && (
            <p className="text-sm text-muted-foreground text-center">
              If the problem persists, please contact support.
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={reset} className="w-full">
            Try Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

// Hook for functional components
export const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null)
  const [errorInfo, setErrorInfo] = React.useState<React.ErrorInfo | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
    setErrorInfo(null)
  }, [])

  const captureError = React.useCallback((error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Error captured:', error, errorInfo)
    setError(error)
    setErrorInfo(errorInfo || null)

    if (process.env.NODE_ENV === 'production') {
      // TODO: Add error logging service
    }
  }, [])

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return { resetError, captureError }
}