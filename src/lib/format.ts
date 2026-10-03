export function countLabel(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}
