/**
 * Noise-related keyword flagging. Matches Danish and English noise vocabulary;
 * "støj" as a substring also covers støjskærm, støjvold, trafikstøj, vejstøj,
 * støjberegning etc. \bdB\b can rarely false-positive but a false flag is far
 * cheaper than a missed noise change for this tool's purpose.
 */
export const NOISE_PATTERN =
  /st(ø|oe)j|d(æ|ae)mpning|decibel|\bdB\b|\bLden\b|noise|vibration/i;

export function isNoiseRelated(text: string): boolean {
  return NOISE_PATTERN.test(text);
}
