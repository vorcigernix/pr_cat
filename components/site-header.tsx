import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { PrcatLogo } from "@/components/ui/prcat-logo"

export function SiteHeader({ pageTitle }: { pageTitle?: string }) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
        <div className="flex items-center">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          {pageTitle ? (
            <h1 className="text-2xl font-semibold">{pageTitle}</h1>
          ) : (
            <PrcatLogo fontSize="text-base" iconSize="h-4 w-4" />
          )}
        </div>
      </div>
    </header>
  )
}
