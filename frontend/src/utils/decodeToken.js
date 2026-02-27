export function decodeToken() {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      return null
    }

    const parts = token.split('.')
    if (parts.length < 2) {
      return null
    }

    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')
    const decodedJson = atob(padded)
    const decoded = JSON.parse(decodedJson)

    if (!decoded?.sub) {
      return null
    }

    return {
      userId: String(decoded.sub),
      tokenData: decoded,
    }
  } catch (error) {
    console.error('decodeToken: invalid token', error)
    localStorage.removeItem('token')
    return null
  }
}
