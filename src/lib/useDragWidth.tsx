/** 可拖拽分栏:把手 + 宽度状态 + localStorage 持久化 */

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 管理一个可拖拽的宽度值(px)。
 * @param key    localStorage 键
 * @param init   初始宽度
 * @param min    最小宽度
 * @param max    最大宽度(可为函数,便于按容器算)
 * @param invert 把手在面板左侧时(拖右侧面板)设 true:向左拖 = 变宽
 */
export function useDragWidth(
  key: string,
  init: number,
  min: number,
  max: number,
  invert = false,
) {
  const [width, setWidth] = useState(() => {
    const saved = Number(localStorage.getItem(key))
    return saved >= min && saved <= max ? saved : init
  })
  const dragging = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  useEffect(() => {
    localStorage.setItem(key, String(width))
  }, [key, width])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true
      startX.current = e.clientX
      startW.current = width
      const el = e.currentTarget as HTMLElement
      el.setPointerCapture(e.pointerId)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [width],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return
      const delta = e.clientX - startX.current
      const next = startW.current + (invert ? -delta : delta)
      setWidth(Math.min(max, Math.max(min, next)))
    },
    [min, max, invert],
  )

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragging.current = false
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  return {
    width,
    handleProps: { onPointerDown, onPointerMove, onPointerUp },
  }
}

/** 分隔把手(竖条,hover/拖动时高亮) */
export function DragHandle(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className="group relative z-10 -mx-0.5 w-1.5 shrink-0 cursor-col-resize touch-none"
    >
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-line transition-colors group-hover:w-0.5 group-hover:bg-accent group-active:w-0.5 group-active:bg-accent" />
    </div>
  )
}
