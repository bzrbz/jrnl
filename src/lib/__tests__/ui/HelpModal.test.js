import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte'
import HelpModal from '../../HelpModal.svelte'

afterEach(cleanup)

describe('HelpModal', () => {
  it('renders the title and key instructions', () => {
    render(HelpModal, { onclose: vi.fn() })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('jrnl')).toBeInTheDocument()
    expect(screen.getByText('. tarea')).toBeInTheDocument()
    expect(screen.getByText('- nota')).toBeInTheDocument()
    expect(screen.getByText('o evento')).toBeInTheDocument()
  })

  it('calls onclose when the close button is clicked', async () => {
    const onclose = vi.fn()
    render(HelpModal, { onclose })
    await fireEvent.click(screen.getByText('entendido'))
    expect(onclose).toHaveBeenCalledOnce()
  })

  it('calls onclose when the backdrop is clicked', async () => {
    const onclose = vi.fn()
    const { container } = render(HelpModal, { onclose })
    await fireEvent.click(container.querySelector('.modal-backdrop'))
    expect(onclose).toHaveBeenCalledOnce()
  })

  it('does not call onclose when clicking inside the modal', async () => {
    const onclose = vi.fn()
    const { container } = render(HelpModal, { onclose })
    await fireEvent.click(container.querySelector('.modal'))
    expect(onclose).not.toHaveBeenCalled()
  })
})
