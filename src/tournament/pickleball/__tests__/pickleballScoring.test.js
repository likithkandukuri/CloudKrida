import { describe, it, expect } from 'vitest'
import { computeGameOutcome, computeMatchOutcome } from '../pickleballScoring.js'

describe('computeGameOutcome', () => {
  it('requires reaching gamesTo before a game can complete', () => {
    expect(computeGameOutcome(10, 8, 11, true)).toEqual({ complete: false, winnerSeat: null })
  })

  it('winBy2=true: a 2-point lead at gamesTo completes the game', () => {
    expect(computeGameOutcome(11, 9, 11, true)).toEqual({ complete: true, winnerSeat: 1 })
    expect(computeGameOutcome(9, 11, 11, true)).toEqual({ complete: true, winnerSeat: 2 })
  })

  it('winBy2=true: a 1-point lead at gamesTo does not complete the game (deuce)', () => {
    expect(computeGameOutcome(11, 10, 11, true)).toEqual({ complete: false, winnerSeat: null })
  })

  it('winBy2=true: play continues past gamesTo until a 2-point lead is reached', () => {
    expect(computeGameOutcome(13, 11, 11, true)).toEqual({ complete: true, winnerSeat: 1 })
  })

  it('winBy2=false: reaching gamesTo completes the game regardless of margin', () => {
    expect(computeGameOutcome(11, 10, 11, false)).toEqual({ complete: true, winnerSeat: 1 })
  })

  it('a tied score is never complete (no draws)', () => {
    expect(computeGameOutcome(10, 10, 11, true)).toEqual({ complete: false, winnerSeat: null })
    expect(computeGameOutcome(11, 11, 11, false)).toEqual({ complete: false, winnerSeat: null })
  })
})

describe('computeMatchOutcome', () => {
  it('bestOf=3: match completes once one side wins 2 games (majority)', () => {
    const games = [{ score_a: 11, score_b: 5 }, { score_a: 11, score_b: 7 }]
    expect(computeMatchOutcome(games, 3, 11, true)).toEqual({ status: 'complete', winnerSeat: 1 })
  })

  it('bestOf=3: a split 1-1 with a live third game is "live", not complete', () => {
    const games = [{ score_a: 11, score_b: 5 }, { score_a: 5, score_b: 11 }, { score_a: 6, score_b: 4 }]
    expect(computeMatchOutcome(games, 3, 11, true)).toEqual({ status: 'live', winnerSeat: null })
  })

  it('no games entered is "pending"', () => {
    expect(computeMatchOutcome([], 3, 11, true)).toEqual({ status: 'pending', winnerSeat: null })
  })

  it('bestOf=1: a single completed game finishes the match immediately', () => {
    const games = [{ score_a: 15, score_b: 13 }]
    expect(computeMatchOutcome(games, 1, 15, true)).toEqual({ status: 'complete', winnerSeat: 1 })
  })

  it('bestOf=5: majority is 3, not 2 or 4', () => {
    const twoGames = [{ score_a: 11, score_b: 3 }, { score_a: 11, score_b: 4 }]
    expect(computeMatchOutcome(twoGames, 5, 11, true).status).toBe('live')
    const threeGames = [...twoGames, { score_a: 11, score_b: 6 }]
    expect(computeMatchOutcome(threeGames, 5, 11, true)).toEqual({ status: 'complete', winnerSeat: 1 })
  })
})
