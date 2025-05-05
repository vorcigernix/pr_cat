export function DemoScreenshot() {
  return (
    <div className="mx-auto max-w-7xl [mask-image:linear-gradient(to_bottom,black_50%,transparent_100%)]">
      <div className="[perspective:1200px] [mask-image:linear-gradient(to_right,black_50%,transparent_100%)] -mr-16 pl-16 lg:-mr-56 lg:pl-56">
        <div className="[transform:rotateX(20deg);]">
          <div className="lg:h-[44rem] relative skew-x-[.36rad]">
            <img
              className="rounded-[--radius] z-[2] relative border border-white/10 hidden dark:block"
              src="/Screenshot 2025-05-04 at 18.06.39.png"
              alt="PR Cat dashboard"
              width={2880}
              height={2074}
            />
            <img
              className="rounded-[--radius] z-[2] relative border border-black/10 dark:hidden"
              src="/Screenshot 2025-05-04 at 18.06.39.png"
              alt="PR Cat dashboard"
              width={2880}
              height={2074}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 