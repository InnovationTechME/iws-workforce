'use client'

import { useEffect, useState } from 'react'
import { getWorkerPhotoUrl } from '../lib/workerPhotoService'

function getInitials(name) {
  const initials = String(name || '')
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return initials || 'IW'
}

export default function WorkerAvatar({ workerId, name, size = 32, photoUrl, style }) {
  const [resolvedPhotoUrl, setResolvedPhotoUrl] = useState(photoUrl ?? null)

  useEffect(() => {
    setResolvedPhotoUrl(photoUrl ?? null)
  }, [photoUrl])

  useEffect(() => {
    if (!workerId || photoUrl !== undefined) return

    let cancelled = false

    ;(async () => {
      try {
        const url = await getWorkerPhotoUrl(workerId)
        if (!cancelled) setResolvedPhotoUrl(url || null)
      } catch (error) {
        console.error(`Failed to load passport photo for worker ${workerId}:`, error)
        if (!cancelled) setResolvedPhotoUrl(null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [workerId, photoUrl])

  const initials = getInitials(name)

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background: 'var(--teal-bg)',
        border: '1px solid var(--teal-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.max(11, Math.round(size * 0.34)),
        fontWeight: 600,
        color: 'var(--teal)',
        flexShrink: 0,
        ...style,
      }}
    >
      {resolvedPhotoUrl ? (
        <img
          src={resolvedPhotoUrl}
          alt={name ? `${name} passport photo` : 'Worker passport photo'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => {
            console.error(`Worker avatar image failed to render for worker ${workerId}`)
            setResolvedPhotoUrl(null)
          }}
        />
      ) : (
        initials
      )}
    </div>
  )
}
