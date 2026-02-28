function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function extractDetail(payload) {
  if (!payload) {
    return null
  }

  if (typeof payload === 'string') {
    return payload
  }

  if (typeof payload === 'object' && payload.detail !== undefined) {
    return payload.detail
  }

  return null
}

function mapValidationIssue(item) {
  const message = normalizeText(item?.msg)
  const field = Array.isArray(item?.loc) ? item.loc[item.loc.length - 1] : ''

  if (field === 'username') {
    if (message.includes('at least 3')) {
      return 'Username is too short. Use at least 3 characters.'
    }
    return 'Please enter a valid username.'
  }

  if (field === 'email') {
    return 'Email is not valid. Use a real email address like name@email.com.'
  }

  if (field === 'password') {
    if (message.includes('at least 8')) {
      return 'Password is too short. Use at least 8 characters.'
    }
    return 'Please enter a valid password.'
  }

  if (field === 'identifier' || field === 'username_or_email') {
    return 'Please enter your username or email.'
  }

  if (field === 'body') {
    return 'Some fields are missing or invalid. Please review the form.'
  }

  if (message) {
    return message
  }

  return 'Some fields are invalid. Please review the form.'
}

function mapValidationErrors(detailList) {
  const messages = detailList.map(mapValidationIssue).filter(Boolean)
  return [...new Set(messages)]
}

function mapLoginError(status, detail) {
  if (status === 401) {
    return 'We could not sign you in. Check your username/email and password.'
  }

  if (status === 403) {
    return 'Your account is inactive. Contact support to reactivate it.'
  }

  if (Array.isArray(detail)) {
    return mapValidationErrors(detail).join('\n')
  }

  const normalizedDetail = normalizeText(detail)
  if (normalizedDetail) {
    return normalizedDetail
  }

  return 'Login failed. Please try again.'
}

function mapRegisterError(status, detail) {
  if (status === 400) {
    const normalized = normalizeText(detail)
    if (normalized.toLowerCase().includes('already exists')) {
      return 'That username or email is already in use. Try another one.'
    }
    return normalized || 'We could not create your account. Please try again.'
  }

  if (Array.isArray(detail)) {
    return mapValidationErrors(detail).join('\n')
  }

  const normalizedDetail = normalizeText(detail)
  if (normalizedDetail) {
    return normalizedDetail
  }

  return 'Registration failed. Please try again.'
}

export function getAuthErrorMessage({ mode, status, payload }) {
  const detail = extractDetail(payload)
  if (mode === 'login') {
    return mapLoginError(status, detail)
  }
  return mapRegisterError(status, detail)
}
