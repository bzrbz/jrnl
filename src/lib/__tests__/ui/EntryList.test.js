import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/svelte'
import EntryList from '../../EntryList.svelte'

afterEach(cleanup)

function makeEntry(overrides = {}) {
  return { id: 1, type: 'task', text: 'comprar pan', done: false, createdAt: Date.now(), order: 0, ...overrides }
}

function defaultProps(overrides = {}) {
  return {
    entries: [],
    ontoggle: vi.fn(),
    ondelete: vi.fn(),
    onreorder: vi.fn(),
    onadd: vi.fn(),
    onedit: vi.fn(),
    ...overrides
  }
}

describe('EntryList — rendering', () => {
  it('renders entry text', () => {
    render(EntryList, defaultProps({ entries: [makeEntry()] }))
    expect(screen.getByText('comprar pan')).toBeInTheDocument()
  })

  it('renders • for tasks', () => {
    const { container } = render(EntryList, defaultProps({ entries: [makeEntry({ type: 'task' })] }))
    const li = container.querySelector('li.entry--task')
    expect(within(li).getByRole('button', { name: /marcar completada/i })).toHaveTextContent('•')
  })

  it('renders — for notes (symbol button is disabled)', () => {
    const { container } = render(EntryList, defaultProps({ entries: [makeEntry({ type: 'note', text: 'una nota' })] }))
    const li = container.querySelector('li.entry--note')
    const btn = within(li).getByRole('button', { name: /marcar/i })
    expect(btn).toHaveTextContent('—')
    expect(btn).toBeDisabled()
  })

  it('renders ○ for events (symbol button is disabled)', () => {
    const { container } = render(EntryList, defaultProps({ entries: [makeEntry({ type: 'event', text: 'un evento' })] }))
    const li = container.querySelector('li.entry--event')
    const btn = within(li).getByRole('button', { name: /marcar/i })
    expect(btn).toHaveTextContent('○')
    expect(btn).toBeDisabled()
  })

  it('renders › for migrated refs and shows original text', () => {
    const orig = makeEntry({ id: 99, text: 'original' })
    const ref  = makeEntry({ id: 2, type: 'ref', text: '', refId: 99, _orig: orig })
    render(EntryList, defaultProps({ entries: [ref] }))
    expect(screen.getByText('›')).toBeInTheDocument()
    expect(screen.getByText('original')).toBeInTheDocument()
  })

  it('applies done class when entry is done', () => {
    const { container } = render(EntryList, defaultProps({ entries: [makeEntry({ done: true })] }))
    const li = container.querySelector('li.entry')
    expect(li.classList.contains('done')).toBe(true)
  })

  it('renders the new-entry input', () => {
    render(EntryList, defaultProps())
    expect(screen.getByPlaceholderText(/tarea/i)).toBeInTheDocument()
  })

  it('renders multiple entries', () => {
    const entries = [makeEntry({ id: 1, text: 'primera' }), makeEntry({ id: 2, text: 'segunda' })]
    render(EntryList, defaultProps({ entries }))
    expect(screen.getByText('primera')).toBeInTheDocument()
    expect(screen.getByText('segunda')).toBeInTheDocument()
  })
})

describe('EntryList — interactions', () => {
  it('calls ontoggle when symbol button is clicked', async () => {
    const ontoggle = vi.fn()
    const entry = makeEntry()
    const { container } = render(EntryList, defaultProps({ entries: [entry], ontoggle }))
    const li = container.querySelector('li.entry--task')
    await fireEvent.click(within(li).getByRole('button', { name: /marcar completada/i }))
    expect(ontoggle).toHaveBeenCalledOnce()
    expect(ontoggle).toHaveBeenCalledWith(entry)
  })

  it('calls ondelete when delete button is clicked', async () => {
    const ondelete = vi.fn()
    const entry = makeEntry()
    const { container } = render(EntryList, defaultProps({ entries: [entry], ondelete }))
    const li = container.querySelector('li.entry--task')
    await fireEvent.click(within(li).getByTitle('Borrar'))
    expect(ondelete).toHaveBeenCalledOnce()
    expect(ondelete).toHaveBeenCalledWith(entry.id)
  })

  it('calls onadd with raw input when Enter is pressed', async () => {
    const onadd = vi.fn()
    render(EntryList, defaultProps({ onadd }))
    const input = screen.getByPlaceholderText(/tarea/i)
    await fireEvent.input(input, { target: { value: '. nueva tarea' } })
    await fireEvent.keyDown(input, { key: 'Enter' })
    expect(onadd).toHaveBeenCalledWith('. nueva tarea')
  })

  it('does not call onadd on empty input', async () => {
    const onadd = vi.fn()
    render(EntryList, defaultProps({ onadd }))
    await fireEvent.keyDown(screen.getByPlaceholderText(/tarea/i), { key: 'Enter' })
    expect(onadd).not.toHaveBeenCalled()
  })

  it('shows edit input after clicking edit button', async () => {
    const entry = makeEntry()
    const { container } = render(EntryList, defaultProps({ entries: [entry] }))
    const li = container.querySelector('li.entry--task')
    await fireEvent.click(within(li).getByTitle('Editar'))
    const editInput = screen.getByRole('textbox', { name: /editar entrada/i })
    expect(editInput).toBeInTheDocument()
    expect(editInput).toHaveValue('comprar pan')
  })

  it('calls onedit on Enter in edit mode', async () => {
    const onedit = vi.fn()
    const entry = makeEntry()
    const { container } = render(EntryList, defaultProps({ entries: [entry], onedit }))
    await fireEvent.click(within(container.querySelector('li.entry--task')).getByTitle('Editar'))
    const editInput = screen.getByRole('textbox', { name: /editar entrada/i })
    await fireEvent.input(editInput, { target: { value: 'pan y leche' } })
    await fireEvent.keyDown(editInput, { key: 'Enter' })
    expect(onedit).toHaveBeenCalledWith(entry, 'pan y leche')
  })

  it('cancels edit on Escape without calling onedit', async () => {
    const onedit = vi.fn()
    const entry = makeEntry()
    const { container } = render(EntryList, defaultProps({ entries: [entry], onedit }))
    await fireEvent.click(within(container.querySelector('li.entry--task')).getByTitle('Editar'))
    await fireEvent.keyDown(screen.getByRole('textbox', { name: /editar entrada/i }), { key: 'Escape' })
    expect(onedit).not.toHaveBeenCalled()
    expect(screen.getByText('comprar pan')).toBeInTheDocument()
  })
})
