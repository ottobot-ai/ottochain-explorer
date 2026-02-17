import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'

// Simple component to test rendering works
function TestComponent({ message }: { message: string }) {
  return <div data-testid="test-component">{message}</div>
}

describe('Component Testing Setup', () => {
  it('should render components correctly', () => {
    const { getByTestId } = render(<TestComponent message="Hello World" />)
    const element = getByTestId('test-component')
    expect(element).toBeDefined()
    expect(element.textContent).toBe('Hello World')
  })

  it('should work with React Testing Library matchers', () => {
    const { getByTestId } = render(<TestComponent message="Test Message" />)
    const element = getByTestId('test-component')
    expect(element).toBeInTheDocument()
  })
})