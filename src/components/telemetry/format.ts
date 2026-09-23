export function duration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  return `${hours ? `${hours} 時 ` : ''}${minutes} 分 ${seconds % 60} 秒`;
}

export function number(value: number): string {
  return value.toLocaleString('zh-TW', { maximumFractionDigits: 2 });
}

export function date(at: number): string {
  return new Date(at).toLocaleString('zh-TW', { hour12: false });
}
