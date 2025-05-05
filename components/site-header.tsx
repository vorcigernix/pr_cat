import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { RefreshCcw, Settings, FileBarChart } from "lucide-react"

export function SiteHeader() {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
        <div className="flex items-center">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-base font-medium">Dashboard</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <RefreshCcw size={16} />
            <span className="hidden md:inline">Sync GitHub PRs</span>
          </Button>
          
          <Button variant="outline" size="sm" className="gap-1.5">
            <FileBarChart size={16} />
            <span className="hidden md:inline">Generate Report</span>
          </Button>
          
          <Button variant="outline" size="sm" className="gap-1.5">
            <Settings size={16} />
            <span className="hidden md:inline">Configure Categories</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
