export function extractYear(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const text = String(value)
  const match = text.match(/\b(19|20)\d{2}\b/)
  return match ? Number(match[0]) : null
}

export function formatUnknown(value, fallback = 'Unknown') {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  return String(value)
}
