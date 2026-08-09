/**
 * Lightweight structured logger — single-line JSON to stdout for Railway.
 * No external deps. LOG_LEVEL env: debug | info | warn | error (default info).
 */

type Level = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_ORDER: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

function currentMinLevel(): number {
  const raw = (process.env.LOG_LEVEL || 'info').toLowerCase() as Level
  return LEVEL_ORDER[raw] ?? LEVEL_ORDER.info
}

function emit(level: Level, msg: string, fields?: Record<string, unknown>) {
  if (LEVEL_ORDER[level] < currentMinLevel()) return
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...(fields || {}),
  })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const log = {
  debug: (msg: string, fields?: Record<string, unknown>) => emit('debug', msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => emit('info', msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => emit('warn', msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => emit('error', msg, fields),
}
