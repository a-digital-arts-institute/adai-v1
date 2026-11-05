import { describe, expect, it } from 'vitest'
import { MODE_KEY, keyAction } from './keys.ts'

describe('keys', () => {
  it('maps the keys and ignores the rest', () => {
    expect([' ', 'ArrowRight', 'ArrowLeft', 'v', 'f', 'i', 'Escape', 'j', 'm', 'r', 'g', 's', 'x'].map(keyAction)).toEqual(['pause', 'next', 'prev', 'mode', 'fullscreen', 'credit', 'close', 'warp', null, null, null, null, null])
  })
  it('steps the views on MODE_KEY, either case', () => {
    expect([MODE_KEY, MODE_KEY.toUpperCase()].map(keyAction)).toEqual(['mode', 'mode'])
  })
})
