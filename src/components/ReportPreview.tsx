import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { SLIDE_WIDTH as REPORT_WIDTH } from './slideSize';

// 고정 폭 슬라이드를 화면 폭에 맞춰 축소해서 보여준다.
// 첫 렌더 전에 높이를 측정(useLayoutEffect)해, 높이 0 으로 접히며 페이지 스크롤이 튀는 일이 없게 한다.
export function ReportPreview({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const update = () => {
      if (!outer.current || !inner.current) return;
      const s = Math.min(1, outer.current.clientWidth / REPORT_WIDTH);
      setScale(s);
      setHeight(inner.current.offsetHeight * s);
    };
    update();
    const ro = new ResizeObserver(update);
    if (outer.current) ro.observe(outer.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outer} className="preview" style={{ height }}>
      <div ref={inner} style={{ width: REPORT_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  );
}
