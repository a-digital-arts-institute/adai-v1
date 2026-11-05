import { describe, expect, it } from 'vitest'
import { keyAction } from './keys.ts'

describe('keys', () => {
  it('maps the keys and ignores the rest', () => {
    expect([' ', 'ArrowRight', 'ArrowLeft', 'v', 'f', 'i', 'Escape', 'j', 'm', 'r', 'g', 's', 'x'].map(keyAction)).toEqual(['pause', 'next', 'prev', 'mode', 'fullscreen', 'credit', 'close', 'warp', null, null, null, null, null])
  })
})
