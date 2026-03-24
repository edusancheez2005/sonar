'use client'
import React from 'react'
import ErrorCard from './ErrorCard'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorCard
          message={this.props.fallbackMessage || 'Failed to load this section'}
          onRetry={this.handleRetry}
        />
      )
    }
    return this.props.children
  }
}
