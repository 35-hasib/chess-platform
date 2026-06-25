// Standard Elo rating calculation.
// score: 1 = win, 0.5 = draw, 0 = loss (from the perspective of player A).

const K_FACTOR = 32;

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export interface EloResult {
  whiteAfter: number;
  blackAfter: number;
  whiteDelta: number;
  blackDelta: number;
}

/**
 * Compute new ratings after a game.
 * @param whiteScore score for white (1 win / 0.5 draw / 0 loss)
 */
export function computeElo(
  whiteRating: number,
  blackRating: number,
  whiteScore: number
): EloResult {
  const blackScore = 1 - whiteScore;
  const expWhite = expectedScore(whiteRating, blackRating);
  const expBlack = expectedScore(blackRating, whiteRating);

  const whiteDelta = Math.round(K_FACTOR * (whiteScore - expWhite));
  const blackDelta = Math.round(K_FACTOR * (blackScore - expBlack));

  return {
    whiteAfter: whiteRating + whiteDelta,
    blackAfter: blackRating + blackDelta,
    whiteDelta,
    blackDelta,
  };
}
