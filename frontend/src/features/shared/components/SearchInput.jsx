// SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
// SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
// SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import './SearchInput.css'

function SearchInput({ id, label, value, onChange, placeholder }) {
  return (
    <label className="search-input" htmlFor={id}>
      <span className="search-input__label">{label}</span>
      <input id={id} type="search" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

export default SearchInput
