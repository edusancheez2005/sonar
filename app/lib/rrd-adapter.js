'use client'
import React from 'react'

export const Link = ({ to, href, children, ...props }) => {
  const target = href ?? to ?? '#'
  return <a href={target} {...props}>{children}</a>
}

export const useNavigate = () => (to) => {
  if (typeof window !== 'undefined') window.location.href = to
}

export const useLocation = () => ({
  pathname: typeof window !== 'undefined' ? window.location.pathname : '/'
})

export const BrowserRouter = ({ children }) => <>{children}</>
export const Routes = ({ children }) => <>{children}</>
export const Route = ({ element }) => element

export const Navigate = ({ to }) => {
  if (typeof window !== 'undefined') window.location.href = to
  return null
}
