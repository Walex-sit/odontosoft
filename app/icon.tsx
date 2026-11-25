import { ImageResponse } from 'next/og'
import {
  BRAND_SVG_VIEWBOX,
  BRAND_TOOTH_PATH,
  BRAND_CROSS_PATH,
} from './lib/brand'

export const size = {
  width: 32,
  height: 32,
}

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0F6E7A',
          borderRadius: 7,
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox={BRAND_SVG_VIEWBOX}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={BRAND_TOOTH_PATH} />
          <path d={BRAND_CROSS_PATH} />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
