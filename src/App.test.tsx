// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App, PAUSA_EMPATE_MS } from './App'
import { rngConSemilla } from './pruebas/rngConSemilla'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function avanzar(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

function radio(nombre: RegExp): HTMLInputElement {
  return screen.getByRole('radio', { name: nombre }) as HTMLInputElement
}

function boton(nombre: string | RegExp): HTMLButtonElement | null {
  return screen.queryByRole('button', { name: nombre }) as HTMLButtonElement | null
}

/** Juega lo que toque en la mesa: apuesta el máximo, saca la carta especial en cuanto puede y continúa. */
function jugarUnPaso() {
  const apostar = boton('Apostar')
  if (apostar) {
    const selector = screen.getByRole('slider')
    fireEvent.change(selector, { target: { value: selector.getAttribute('max') } })
    fireEvent.click(apostar)
  }
  const continuar = boton('Continuar')
  if (continuar) fireEvent.click(continuar)
  const cartas = screen
    .queryAllByRole('button', { name: /^(EMPERADOR|ESCLAVO|CIUDADANO)$/ })
    .filter((carta) => !(carta as HTMLButtonElement).disabled)
  if (cartas.length > 0) {
    const especial = cartas.find((carta) => carta.textContent !== 'CIUDADANO') ?? cartas[0]
    fireEvent.click(especial)
    fireEvent.click(boton('Confirmar')!)
  }
  avanzar(5000)
}

describe('flujo de la aplicación', () => {
  it('configuración → partida → pantalla final → «Jugar de nuevo» vuelve a la configuración', () => {
    render(<App rng={rngConSemilla(7)} />)

    expect(radio(/×4/).checked).toBe(true)
    fireEvent.click(radio(/×5/))
    fireEvent.click(screen.getByRole('button', { name: 'Empezar partida' }))

    expect(screen.getByText(/Sorteo/)).toBeTruthy()
    expect(screen.getByText(/Multiplicador ×5/)).toBeTruthy()

    for (let paso = 0; paso < 500 && !boton('Jugar de nuevo'); paso++) jugarUnPaso()

    expect(screen.getByRole('heading', { name: /partida/ })).toBeTruthy()
    fireEvent.click(boton('Jugar de nuevo')!)

    expect(screen.getByRole('button', { name: 'Empezar partida' })).toBeTruthy()
    expect(radio(/×4/).checked).toBe(true)
  })
})

describe('tiempo límite', () => {
  /**
   * Con el rng en 0.99 el rival gana el sorteo: el humano empieza de jugador Esclavo
   * y apuesta, y el rival juega Ciudadano mientras le quede alguno.
   */
  function empezarComoEsclavo() {
    render(<App rng={() => 0.99} />)
    fireEvent.click(screen.getByRole('button', { name: 'Empezar partida' }))
  }

  function apostarUna() {
    fireEvent.click(screen.getByRole('button', { name: 'Apostar' }))
  }

  function reloj(): string | null {
    return screen.queryByRole('timer')?.textContent ?? null
  }

  function enfrentamientosRevelados(): number {
    return screen.queryAllByRole('listitem').length
  }

  function ocultarPagina(oculta: boolean) {
    Object.defineProperty(document, 'visibilityState', { value: oculta ? 'hidden' : 'visible', configurable: true })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
  }

  afterEach(() => {
    ocultarPagina(false)
  })

  it('no corre en la fase de apuesta, que no tiene tiempo límite', () => {
    empezarComoEsclavo()

    avanzar(60_000)
    expect(screen.getByRole('button', { name: 'Apostar' })).toBeTruthy()
    expect(reloj()).toBeNull()

    apostarUna()
    expect(reloj()).toMatch(/20/)
  })

  it('a los 20 s sin elegir se juega una carta al azar', () => {
    empezarComoEsclavo()
    apostarUna()

    avanzar(19_900)
    expect(enfrentamientosRevelados()).toBe(0)

    avanzar(100)
    expect(enfrentamientosRevelados()).toBe(1)
  })

  it('con la página oculta el reloj no avanza y al volver se reanuda desde donde estaba', () => {
    empezarComoEsclavo()
    apostarUna()

    avanzar(5_000)
    expect(reloj()).toMatch(/15/)
    ocultarPagina(true)
    avanzar(60_000)
    expect(reloj()).toMatch(/15/)
    expect(enfrentamientosRevelados()).toBe(0)

    ocultarPagina(false)
    avanzar(14_900)
    expect(enfrentamientosRevelados()).toBe(0)
    avanzar(100)
    expect(enfrentamientosRevelados()).toBe(1)
  })

  it('se reinicia en cada enfrentamiento', () => {
    empezarComoEsclavo()
    apostarUna()

    avanzar(15_000)
    expect(reloj()).toMatch(/5/)
    fireEvent.click(screen.getAllByRole('button', { name: 'CIUDADANO' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    avanzar(PAUSA_EMPATE_MS)

    expect(enfrentamientosRevelados()).toBe(1)
    expect(reloj()).toMatch(/20/)
  })
})
