import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import OrcaTutorial from '@/components/onboarding/OrcaTutorial'

function Harness(props: { onClose: () => void; closeOnOutsideClick?: boolean }) {
  const a = React.useRef<HTMLDivElement>(null)
  const b = React.useRef<HTMLDivElement>(null)
  const steps = [
    { key: 'a', resolve: (r: any) => r?.a?.current, kicker: 'One', title: 'First stop', text: 'aaa', placement: 'bottom' },
    { key: 'b', resolve: (r: any) => r?.b?.current, kicker: 'Two', title: 'Second stop', text: 'bbb', placement: 'bottom' },
  ]
  return (
    <div>
      <div ref={a}>A</div>
      <div ref={b}>B</div>
      <button type="button">outside</button>
      <OrcaTutorial
        isOpen
        onClose={props.onClose}
        refs={{ a, b }}
        steps={steps}
        storageKey="tour_test_key"
        finishHref={null as any}
        closeOnOutsideClick={props.closeOnOutsideClick}
      />
    </div>
  )
}

describe('OrcaTutorial with custom steps', () => {
  beforeEach(() => {
    localStorage.clear()
    // jsdom has no layout: every target looks off-screen and gets scrolled to.
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('walks the given steps and Finish just closes and remembers', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    expect(await screen.findByText('First stop')).toBeTruthy()
    fireEvent.click(screen.getByText('Next'))
    expect(await screen.findByText('Second stop')).toBeTruthy()
    fireEvent.click(await screen.findByText('Finish'))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('tour_test_key')).toBe('true')
    expect(localStorage.getItem('sonar_tutorial_completed')).toBeNull()
  })

  it('closes for good on a click outside the tip when asked to', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} closeOnOutsideClick />)
    await screen.findByText('First stop')
    fireEvent.pointerDown(screen.getByText('outside'))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('tour_test_key')).toBe('true')
  })
})
