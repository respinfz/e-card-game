// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
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
