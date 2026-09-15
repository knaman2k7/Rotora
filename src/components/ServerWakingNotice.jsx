import { useEffect, useState } from 'react'
import { onSlowRequestChange } from '../app/auth.js'

export default function ServerWakingNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => onSlowRequestChange(setVisible), [])

  if (!visible) return null

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: '#1f2937',
        color: '#fff',
        padding: '8px 16px',
        borderRadius: 8,
        fontSize: 14,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}
    >
      Server is waking up, this can take a minute…
    </div>
  )
}
