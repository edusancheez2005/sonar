'use client'
import React, { useState, useEffect } from 'react'
import styled from 'styled-components'

const Card = styled.div`
  background: var(--background-card);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(54, 166, 186, 0.1);
`

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;

  .icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba(54, 166, 186, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary);
  }

  h2 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
  }

  p {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin: 0;
  }
`

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);

  &:last-child { border-bottom: none; }
`

const ToggleInfo = styled.div`
  flex: 1;
`

const ToggleLabel = styled.div`
  font-size: 0.9rem;
  color: var(--text-primary);
  font-weight: 500;
`

const ToggleDesc = styled.div`
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.15rem;
`

const Toggle = styled.button`
  width: 44px;
  height: 24px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
  background: ${({ $on }) => $on ? 'var(--primary)' : 'var(--secondary)'};
  flex-shrink: 0;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${({ $on }) => $on ? '22px' : '2px'};
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    transition: left 0.2s;
  }
`

const StatusBadge = styled.span`
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  background: ${({ $status }) =>
    $status === 'granted' ? 'rgba(0, 212, 170, 0.15)' :
    $status === 'denied' ? 'rgba(231, 76, 60, 0.15)' :
    'rgba(255, 217, 61, 0.15)'};
  color: ${({ $status }) =>
    $status === 'granted' ? '#00d4aa' :
    $status === 'denied' ? '#e74c3c' :
    '#ffd93d'};
`

const EnableBtn = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--primary);
  background: transparent;
  color: var(--primary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--primary);
    color: #0a1621;
  }
`

export default function NotificationSettings() {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState('default')
  const [swRegistered, setSwRegistered] = useState(false)
  const [whaleAlerts, setWhaleAlerts] = useState(true)
  const [followedActivity, setFollowedActivity] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      setSupported(true)
      setPermission(Notification.permission)

      // Check if SW is already registered
      navigator.serviceWorker.getRegistration('/sw-notifications.js').then(reg => {
        if (reg) setSwRegistered(true)
      })

      // Load saved preferences
      try {
        const prefs = JSON.parse(localStorage.getItem('sonar_notification_prefs') || '{}')
        if (prefs.whaleAlerts === false) setWhaleAlerts(false)
        if (prefs.followedActivity === false) setFollowedActivity(false)
      } catch {}
    }
  }, [])

  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result === 'granted') {
        const reg = await navigator.serviceWorker.register('/sw-notifications.js')
        setSwRegistered(true)

        // Show a test notification
        reg.showNotification('Sonar Notifications Enabled', {
          body: 'You\'ll now receive alerts for whale activity.',
          icon: '/icon-192.png',
          badge: '/favicon-32x32.png',
        })
      }
    } catch {
      // silent
    }
  }

  const savePrefs = (key, value) => {
    const prefs = JSON.parse(localStorage.getItem('sonar_notification_prefs') || '{}')
    prefs[key] = value
    localStorage.setItem('sonar_notification_prefs', JSON.stringify(prefs))
  }

  const toggleWhaleAlerts = () => {
    setWhaleAlerts(!whaleAlerts)
    savePrefs('whaleAlerts', !whaleAlerts)
  }

  const toggleFollowed = () => {
    setFollowedActivity(!followedActivity)
    savePrefs('followedActivity', !followedActivity)
  }

  if (!supported) return null

  return (
    <Card>
      <SectionHeader>
        <div className="icon">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div>
          <h2>Notifications</h2>
          <p>Browser push notification preferences</p>
        </div>
      </SectionHeader>

      <ToggleRow>
        <ToggleInfo>
          <ToggleLabel>Browser Notifications</ToggleLabel>
          <ToggleDesc>
            Permission: <StatusBadge $status={permission}>{permission}</StatusBadge>
          </ToggleDesc>
        </ToggleInfo>
        {permission !== 'granted' ? (
          <EnableBtn onClick={requestPermission}>
            {permission === 'denied' ? 'Blocked by browser' : 'Enable'}
          </EnableBtn>
        ) : (
          <StatusBadge $status="granted">Active</StatusBadge>
        )}
      </ToggleRow>

      {permission === 'granted' && (
        <>
          <ToggleRow>
            <ToggleInfo>
              <ToggleLabel>Smart Money Alerts</ToggleLabel>
              <ToggleDesc>Get notified for large whale transactions</ToggleDesc>
            </ToggleInfo>
            <Toggle $on={whaleAlerts} onClick={toggleWhaleAlerts} />
          </ToggleRow>

          <ToggleRow>
            <ToggleInfo>
              <ToggleLabel>Followed Wallet Activity</ToggleLabel>
              <ToggleDesc>Notifications when wallets you follow make trades</ToggleDesc>
            </ToggleInfo>
            <Toggle $on={followedActivity} onClick={toggleFollowed} />
          </ToggleRow>
        </>
      )}
    </Card>
  )
}
