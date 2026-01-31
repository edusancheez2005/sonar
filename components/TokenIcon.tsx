/**
 * TokenIcon Component
 * Displays token logo with fallback
 */

'use client'

import { useState, useEffect } from 'react'
import styled from 'styled-components'
import Image from 'next/image'

interface TokenIconProps {
  symbol: string
  coingeckoId?: string
  imageUrl?: string | null
  size?: number
  className?: string
}

const IconWrapper = styled.div<{ $size: number }>`
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
`

const FallbackLetter = styled.div<{ $size: number }>`
  color: white;
  font-weight: 700;
  font-size: ${props => props.$size * 0.5}px;
  text-transform: uppercase;
  user-select: none;
`

const StyledImage = styled(Image)`
  object-fit: cover;
`

export default function TokenIcon({
  symbol,
  coingeckoId,
  imageUrl,
  size = 24,
  className,
}: TokenIconProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(imageUrl || null)
  const [imgError, setImgError] = useState(false)
  const [loading, setLoading] = useState(!imageUrl)

  useEffect(() => {
    // If we have imageUrl prop, use it
    if (imageUrl) {
      setImgSrc(imageUrl)
      setImgError(false)
      setLoading(false)
      return
    }

    // Otherwise, fetch from API
    if (!imgSrc && (symbol || coingeckoId)) {
      fetchTokenImage()
    }
  }, [symbol, coingeckoId, imageUrl])

  const fetchTokenImage = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (symbol) params.set('symbol', symbol)
      if (coingeckoId) params.set('id', coingeckoId)

      const response = await fetch(`/api/coingecko/token-image?${params}`)
      if (response.ok) {
        const data = await response.json()
        if (data.image_url) {
          setImgSrc(data.image_url)
          setImgError(false)
        } else {
          setImgError(true)
        }
      } else {
        setImgError(true)
      }
    } catch (error) {
      console.error('Failed to fetch token image:', error)
      setImgError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleImageError = () => {
    setImgError(true)
  }

  const fallbackLetter = symbol ? symbol[0].toUpperCase() : '?'

  return (
    <IconWrapper $size={size} className={className} title={symbol}>
      {imgSrc && !imgError ? (
        <StyledImage
          src={imgSrc}
          alt={symbol}
          width={size}
          height={size}
          onError={handleImageError}
          unoptimized // CoinGecko images are already optimized
        />
      ) : (
        <FallbackLetter $size={size}>{fallbackLetter}</FallbackLetter>
      )}
    </IconWrapper>
  )
}
